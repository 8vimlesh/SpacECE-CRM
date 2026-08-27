import { db, type Contact, type Message } from '../db/database';

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
 * Dispatches via Meta Cloud API if connected, and saves record to IndexedDB.
 */
export async function sendWhatsAppMessage({
  contactId,
  recipientPhone,
  messageText
}: SendMessageParams): Promise<SendMessageResult> {
  const settingsList = await db.whatsAppSettings.toArray();
  const settings = settingsList[0];

  const isApiConnected = settings?.connectionStatus === 'CONNECTED';
  const cleanPhone = recipientPhone.replace(/[^\d+]/g, '');

  let isApiSuccess = false;
  let apiErrorMessage = '';

  // If Meta API credentials are connected, attempt real graph API call
  if (isApiConnected && settings.phoneNumberId && settings.accessToken) {
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

  // Save outgoing message to IndexedDB database
  const newMsgId = await db.messages.add({
    contactId,
    direction: 'out',
    type: 'text',
    content: messageText,
    status: isApiSuccess ? 'delivered' : isApiConnected ? 'failed' : 'sent',
    timestamp: new Date().toISOString()
  });

  const savedRecord = await db.messages.get(newMsgId as number);

  if (isApiConnected && !isApiSuccess) {
    return {
      success: false,
      messageRecord: savedRecord,
      error: `Message saved locally, but Meta API dispatch failed: ${apiErrorMessage}`
    };
  }

  return {
    success: true,
    messageRecord: savedRecord
  };
}

/**
 * Mark all unread incoming messages for a contact as 'read' in IndexedDB.
 */
export async function markConversationAsRead(contactId: number): Promise<void> {
  const unreadMessages = await db.messages
    .where('contactId')
    .equals(contactId)
    .filter(m => m.direction === 'in' && m.status !== 'read')
    .toArray();

  for (const msg of unreadMessages) {
    if (msg.id) {
      await db.messages.update(msg.id, { status: 'read' });
    }
  }
}

/**
 * Simulates receiving a real incoming parent WhatsApp message for testing.
 * Automatically matches or creates contact in IndexedDB.
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
  const contacts = await db.contacts.toArray();
  let contact = contacts.find(c => c.phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, ''));

  if (!contact) {
    // Create new contact record for unrecognized incoming phone number
    const newContactId = await db.contacts.add({
      name: parentName || `Parent (${phone})`,
      phone: phone,
      linkedStudentClass: studentClass || 'Student Class Pending Binding',
      tags: ['WhatsApp Incoming', 'New Lead'],
      status: 'Lead',
      optedOut: false,
      createdAt: new Date().toISOString()
    });
    contact = (await db.contacts.get(newContactId as number))!;
  }

  // 2. Add incoming message
  const msgId = await db.messages.add({
    contactId: contact.id!,
    direction: 'in',
    type: 'text',
    content,
    status: 'delivered', // marked unread initially
    timestamp: new Date().toISOString()
  });

  const message = (await db.messages.get(msgId as number))!;

  return { contact, message };
}
