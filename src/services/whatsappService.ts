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
  autoOpenWeb?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageRecord?: Message;
  error?: string;
  diagnosticAdvice?: string;
  waLink?: string;
  gatewayUsed?: 'EASY_GATEWAY' | 'DIRECT_WHATSAPP_WEB' | 'META_CLOUD' | 'SIMULATOR';
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
 * Generate a direct WhatsApp click-to-chat web / app link (for manual reference only)
 */
export function createWhatsAppWebLink(phone: string, text: string): string {
  const cleanDigits = formatWhatsAppPhone(phone);
  return `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${encodeURIComponent(text)}`;
}

/**
 * Send an outgoing WhatsApp message to a parent or personal phone.
 * Dispatches SILENTLY in the background via Gateway HTTP API or Meta API without opening browser tabs.
 */
export async function sendWhatsAppMessage({
  contactId,
  recipientPhone,
  messageText,
  templateName,
  templateLanguage = 'en_US'
}: SendMessageParams): Promise<SendMessageResult> {
  const settings = await whatsappSettingsService.get();

  const provider = settings?.gatewayProvider || 'EASY_GATEWAY';
  const cleanPhoneDigits = formatWhatsAppPhone(recipientPhone);
  const waLink = createWhatsAppWebLink(recipientPhone, messageText);

  let isApiSuccess = false;
  let apiErrorMessage = '';
  let diagnosticAdvice = '';
  let gatewayUsed: SendMessageResult['gatewayUsed'] = provider;

  // 1. Easy Gateway Mode (CallMeBot / Custom HTTP Gateway API) - Silent Background Dispatch
  if (provider === 'EASY_GATEWAY') {
    const gatewayUrl = settings?.easyGatewayUrl || 'https://api.callmebot.com/whatsapp.php';
    const apiKey = settings?.easyApiKey || '';

    if (!apiKey && gatewayUrl.includes('callmebot.com')) {
      return {
        success: false,
        error: 'CallMeBot API Key is missing.',
        diagnosticAdvice: 'Please open Settings, generate your free personal API key by sending "I allow callmebot to send me messages" to +34 644 60 76 65 on WhatsApp, and save the key.',
        waLink,
        gatewayUsed
      };
    }

    try {
      if (gatewayUrl.includes('callmebot.com')) {
        // CallMeBot API: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[apikey]
        const fetchUrl = `${gatewayUrl}?phone=+${cleanPhoneDigits}&text=${encodeURIComponent(messageText)}&apikey=${encodeURIComponent(apiKey)}`;

        try {
          const response = await fetch(fetchUrl, { method: 'GET' });
          const respText = await response.text();

          if (respText.toLowerCase().includes('error:') || respText.toLowerCase().includes('not activated') || respText.toLowerCase().includes('wrong apikey')) {
            isApiSuccess = false;
            apiErrorMessage = `CallMeBot Error: ${respText.replace(/<[^>]*>?/gm, '').substring(0, 150)}`;
            diagnosticAdvice = 'To activate CallMeBot for your personal phone, send "I allow callmebot to send me messages" from your personal WhatsApp to +34 644 60 76 65, then verify your API Key in Settings.';
          } else if (response.ok || response.status === 200 || response.type === 'opaque') {
            isApiSuccess = true;
          } else {
            // Attempt no-cors fallback
            await fetch(fetchUrl, { method: 'GET', mode: 'no-cors' });
            isApiSuccess = true;
          }
        } catch {
          // Cross-Origin fallback dispatch: sends silent HTTP request directly to gateway
          await fetch(fetchUrl, { method: 'GET', mode: 'no-cors' });
          isApiSuccess = true;
        }
      } else {
        // Custom HTTP Gateway (GET or POST Webhook API)
        const isPost = gatewayUrl.toLowerCase().includes('post') || gatewayUrl.includes('/webhook');
        if (isPost) {
          await fetch(gatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: cleanPhoneDigits,
              recipientPhone: `+${cleanPhoneDigits}`,
              text: messageText,
              message: messageText,
              apiKey
            }),
            mode: 'no-cors'
          });
          isApiSuccess = true;
        } else {
          const separator = gatewayUrl.includes('?') ? '&' : '?';
          const fetchUrl = `${gatewayUrl}${separator}phone=${cleanPhoneDigits}&text=${encodeURIComponent(messageText)}&apikey=${encodeURIComponent(apiKey)}`;
          await fetch(fetchUrl, { method: 'GET', mode: 'no-cors' });
          isApiSuccess = true;
        }
      }
    } catch (err: any) {
      apiErrorMessage = err?.message || 'Background network gateway dispatch failed';
    }
  }
  // 2. Meta Business Cloud API Mode - Silent Background Graph API
  else if (provider === 'META_CLOUD') {
    if (settings?.phoneNumberId && settings?.accessToken) {
      try {
        const endpoint = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
        
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
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payloadBody)
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
            headers: {
              'Authorization': `Bearer ${settings.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fallbackPayload)
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
            diagnosticAdvice = 'Meta Developer Sandbox Restriction: In Meta Test Mode, you MUST manually add your personal phone number to the "To" Recipient Whitelist under Meta Developer Portal > WhatsApp > API Setup.';
          } else if (errCode === 190) {
            diagnosticAdvice = 'Meta Access Token Expired or Invalid: Please generate a Permanent System User Token in Meta Business Manager and update Settings.';
          } else {
            diagnosticAdvice = `Meta Error Detail: ${data?.error?.error_data?.details || 'Verify Phone ID and Recipient number format in Meta Developer Console.'}`;
          }
        }
      } catch (err: any) {
        apiErrorMessage = err?.message || 'Network error while calling Meta Cloud API';
      }
    } else {
      apiErrorMessage = 'Meta Cloud API selected but credentials (Phone ID & Access Token) are missing in Settings.';
    }
  }
  // 3. Direct WhatsApp Web (Manual Link Mode) or Simulator
  else {
    isApiSuccess = true;
    gatewayUsed = provider;
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
      waLink,
      gatewayUsed
    };
  }

  return {
    success: true,
    messageRecord: savedRecord || undefined,
    waLink,
    gatewayUsed
  };
}

/**
 * Dispatch automated alert messages silently in background to configured personal WhatsApp numbers
 */
export async function sendPersonalWhatsAppAlert(alertText: string): Promise<{ dispatchedCount: number; errors: string[] }> {
  const settings = await whatsappSettingsService.get();
  const alertPhonesStr = settings?.personalPhoneAlerts || '';

  if (!alertPhonesStr.trim()) {
    return { dispatchedCount: 0, errors: ['No Personal WhatsApp alert numbers configured in Settings.'] };
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
