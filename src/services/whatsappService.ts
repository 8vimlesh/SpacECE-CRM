import type { Contact, Message } from '../db/database';
import { whatsappSettingsService } from './whatsappSettingsService';
import { messagesService } from './messagesService';
import { contactsService } from './contactsService';

export interface SendMessageParams {
  contactId: number;
  recipientPhone: string;
  messageText: string;
}

export interface SendMessageResult {
  success: boolean;
  messageRecord?: Message;
  error?: string;
}

/**
 * Send an outgoing WhatsApp message to a parent.
 * Dispatches via Meta Cloud API if connected, and saves record to Supabase.
 */
export async function sendWhatsAppMessage({
  contactId,
  recipientPhone,
  messageText
}: SendMessageParams): Promise<SendMessageResult> {
  const settings = await whatsappSettingsService.get();

  const isApiConnected = settings?.connectionStatus === 'CONNECTED';
  const cleanPhone = recipientPhone.replace(/[^\d+]/g, '');

  let isApiSuccess = false;
  let apiErrorMessage = '';

  // If Meta API credentials are connected, attempt real graph API call
  if (isApiConnected && settings?.phoneNumberId && settings?.accessToken) {
    try {
      const endpoint = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: messageText }
        })
      });

      const data = await response.json();
      if (response.ok && data.messages && data.messages.length > 0) {
        isApiSuccess = true;
      } else {
        apiErrorMessage = data?.error?.message || `Meta API Error (${response.status})`;
      }
    } catch (err: any) {
      apiErrorMessage = err?.message || 'Network connection failed while calling Meta Cloud API';
    }
  }

  // Save outgoing message to Supabase database
  const savedRecord = await messagesService.add({
    contactId,
    direction: 'out',
    type: 'text',
    content: messageText,
    status: isApiSuccess ? 'delivered' : isApiConnected ? 'failed' : 'sent',
    timestamp: new Date().toISOString()
  });

  if (isApiConnected && !isApiSuccess) {
    return {
      success: false,
      messageRecord: savedRecord || undefined,
      error: `Message saved locally, but Meta API dispatch failed: ${apiErrorMessage}`
    };
  }

  return {
    success: true,
    messageRecord: savedRecord || undefined
  };
}

/**
 * Mark all unread incoming messages for a contact as 'read' in Supabase.
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
 * Automatically matches or creates contact in Supabase.
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
  // 1. Check if contact exists by phone number match
  const contacts = await contactsService.getAll();
  let contact = contacts.find((c) => c.phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, ''));

  if (!contact) {
    // Create new contact record in Supabase for unrecognized incoming phone number
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

  // 2. Add incoming message into Supabase
  const message = (await messagesService.add({
    contactId: contact.id!,
    direction: 'in',
    type: 'text',
    content,
    status: 'delivered', // marked unread initially
    timestamp: new Date().toISOString()
  }))!;

  return { contact, message };
}
