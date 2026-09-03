import type { Contact, Message } from '../db/database';
import { whatsappSettingsService } from './whatsappSettingsService';
import { messagesService } from './messagesService';
import { contactsService } from './contactsService';

export interface SendMessageParams {
  contactId?: number;
  recipientPhone: string;
  messageText: string;
  templateName?: string;
  templateLanguage?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageRecord?: Message;
  error?: string;
  diagnosticAdvice?: string;
  gatewayUsed?: 'META_CLOUD';
}

/**
 * Helper to clean phone numbers to international standard digits (e.g., 919876543210)
 */
export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  // Default to India prefix (91) if 10-digit number is provided without country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Send an outgoing WhatsApp message via official Meta WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage({
  contactId,
  recipientPhone,
  messageText,
  templateName,
  templateLanguage = 'en_US'
}: SendMessageParams): Promise<SendMessageResult> {
  const settings = await whatsappSettingsService.get();
  const cleanPhoneDigits = formatWhatsAppPhone(recipientPhone);

  let isApiSuccess = false;
  let apiErrorMessage = '';
  let diagnosticAdvice = '';

  if (!settings?.phoneNumberId || !settings?.accessToken) {
    apiErrorMessage = 'Meta WhatsApp Cloud API credentials (Phone Number ID and Access Token) are not configured.';
    diagnosticAdvice = 'Please add your VITE_WHATSAPP_PHONE_NUMBER_ID and VITE_WHATSAPP_API_TOKEN in .env or Settings.';
  } else {
    try {
      // Calls our own /api/whatsapp-send serverless function instead of
      // graph.facebook.com directly. Meta's Graph API does not return
      // CORS headers for browser-origin requests, so a direct fetch()
      // from here would be blocked before it ever reached Meta.
      // The serverless function makes the real call server-to-server.
      const endpoint = '/api/whatsapp-send';

      // Build payload: use Template payload if templateName specified, otherwise text payload
      const payloadBody = templateName
        ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneDigits,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage }
          }
        }
        : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneDigits,
          type: 'text',
          text: { body: messageText }
        };

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: settings.phoneNumberId,
          accessToken: settings.accessToken,
          payload: payloadBody
        })
      });

      let data = await response.json();

      // 24-Hour Customer Window Rule Check (Meta Error 131047):
      // If free-form text fails because >24h passed since last incoming message, attempt automatic fallback to Meta 'hello_world' template!
      if (!response.ok && data?.error?.code === 131047 && !templateName) {
        const fallbackPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneDigits,
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' }
          }
        };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: settings.phoneNumberId,
            accessToken: settings.accessToken,
            payload: fallbackPayload
          })
        });
        data = await response.json();
      }

      if (response.ok && data.messages && data.messages.length > 0) {
        isApiSuccess = true;
      } else {
        const errCode = data?.error?.code;
        const errMsg = data?.error?.message || `Meta API Error (${response.status})`;

        apiErrorMessage = `Meta API Error [${errCode || response.status}]: ${errMsg}`;

        if (errCode === 131047) {
          diagnosticAdvice = 'Meta 24-Hour Policy Window: You cannot send free-form text to this number because more than 24h passed since their last message. Send a Meta Approved Template message or ask the user to send a WhatsApp message to your business number first.';
        } else if (errCode === 131030 || errCode === 131026) {
          diagnosticAdvice = 'Meta Developer Sandbox Restriction: In Meta Test Mode, you MUST manually add your recipient phone number to the "To" Recipient list in Meta Developer Portal > WhatsApp > API Setup.';
        } else if (errCode === 190) {
          diagnosticAdvice = 'Meta Access Token Expired or Invalid: Please generate a Permanent System User Token in Meta Business Manager and update Settings or .env.';
        } else {
          diagnosticAdvice = `Meta Error Detail: ${data?.error?.error_data?.details || 'Verify Phone ID and Recipient number format in Meta Developer Console.'}`;
        }
      }
    } catch (err: any) {
      apiErrorMessage = err?.message || 'Network error while calling Meta Cloud API';
    }
  }

  // Save outgoing message to database if contactId is linked
  let savedRecord: Message | null = null;
  if (contactId) {
    savedRecord = await messagesService.add({
      contactId,
      direction: 'out',
      type: 'text',
      content: messageText,
      status: isApiSuccess ? 'delivered' : 'failed',
      timestamp: new Date().toISOString()
    });
  }

  if (!isApiSuccess) {
    return {
      success: false,
      messageRecord: savedRecord || undefined,
      error: `Outbound dispatch failed: ${apiErrorMessage}`,
      diagnosticAdvice,
      gatewayUsed: 'META_CLOUD'
    };
  }

  return {
    success: true,
    messageRecord: savedRecord || undefined,
    gatewayUsed: 'META_CLOUD'
  };
}

/**
 * Dispatch automated alert messages silently in background to configured personal WhatsApp numbers via Meta Cloud API
 */
export async function sendPersonalWhatsAppAlert(alertText: string): Promise<{ dispatchedCount: number; errors: string[] }> {
  const settings = await whatsappSettingsService.get();
  const alertPhonesStr = settings?.personalPhoneAlerts || '';

  if (!alertPhonesStr.trim()) {
    return { dispatchedCount: 0, errors: ['No WhatsApp alert numbers configured in Settings.'] };
  }

  const phones = alertPhonesStr.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  let dispatchedCount = 0;
  const errors: string[] = [];

  for (const phone of phones) {
    const result = await sendWhatsAppMessage({
      recipientPhone: phone,
      messageText: alertText
    });
    if (result.success) {
      dispatchedCount++;
    } else if (result.error) {
      errors.push(`${phone}: ${result.error}`);
    }
  }

  return { dispatchedCount, errors };
}

/**
 * Mark all unread incoming messages for a contact as 'read' in Supabase/IndexedDB.
 */
export async function markConversationAsRead(contactId: number): Promise<void> {
  const messages = await messagesService.getByContactId(contactId);
  const unreadIncoming = messages.filter((m) => m.direction === 'in' && m.status !== 'read');

  for (const msg of unreadIncoming) {
    if (msg.id) {
      await messagesService.update(msg.id, { status: 'read' });
    }
  }
}

/**
 * Simulates receiving a real incoming parent WhatsApp message for testing.
 * Automatically matches or creates contact.
 */
export async function receiveIncomingWhatsAppMessage({
  phone,
  parentName,
  content,
  studentClass
}: {
  phone: string;
  parentName?: string;
  content: string;
  studentClass?: string;
}): Promise<{ contact: Contact; message: Message }> {
  const contacts = await contactsService.getAll();
  let contact = contacts.find((c) => formatWhatsAppPhone(c.phone) === formatWhatsAppPhone(phone));

  if (!contact) {
    const newContact = await contactsService.add({
      name: parentName || `Parent (${phone})`,
      phone: phone,
      linkedStudentClass: studentClass || 'Student Class Pending Binding',
      tags: ['WhatsApp Incoming', 'New Lead'],
      status: 'Lead',
      optedOut: false,
      createdAt: new Date().toISOString()
    });
    contact = newContact!;
  }

  const message = (await messagesService.add({
    contactId: contact.id!,
    direction: 'in',
    type: 'text',
    content,
    status: 'delivered',
    timestamp: new Date().toISOString()
  }))!;

  return { contact, message };
}
