import { db } from '../db/database';
import { contactsService } from './contactsService';
import { inquiriesService } from './inquiriesService';
import { messagesService } from './messagesService';
import { templatesService } from './templatesService';
import { campaignsService } from './campaignsService';
import { whatsappSettingsService } from './whatsappSettingsService';
import { subscriptionService } from './subscriptionService';
import { automationService } from './automationService';

let migrationExecuted = false;

export async function migrateIndexedDbToSupabase(): Promise<{
  contacts: number;
  inquiries: number;
  messages: number;
  templates: number;
  campaigns: number;
}> {
  if (migrationExecuted) {
    return { contacts: 0, inquiries: 0, messages: 0, templates: 0, campaigns: 0 };
  }
  migrationExecuted = true;

  console.log('🚀 Checking Supabase database initialization & IndexedDB data migration...');

  try {
    // 1. Check & Seed Contacts
    const existingContacts = await contactsService.getAll();
    if (existingContacts.length === 0) {
      const dexieContacts = await db.contacts.toArray();
      if (dexieContacts.length > 0) {
        console.log(`Migrating ${dexieContacts.length} contacts from IndexedDB to Supabase...`);
        for (const c of dexieContacts) {
          await contactsService.add({
            name: c.name,
            phone: c.phone,
            linkedStudentClass: c.linkedStudentClass,
            tags: c.tags,
            status: c.status,
            optedOut: c.optedOut,
            createdAt: c.createdAt
          });
        }
      } else {
        // Seed default initial contacts into Supabase
        console.log('Seeding initial contacts to Supabase...');
        await contactsService.add({
          name: 'Rajesh Sharma',
          phone: '+91 98765 43210',
          linkedStudentClass: 'Aarav Sharma (Grade 2-B)',
          tags: ['Parent', 'Fee Paid'],
          status: 'Active',
          optedOut: false,
          createdAt: new Date().toISOString()
        });
        await contactsService.add({
          name: 'Priya Patel',
          phone: '+91 98123 45678',
          linkedStudentClass: 'Riya Patel (Nursery)',
          tags: ['Parent', 'Lead'],
          status: 'Lead',
          optedOut: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Refresh Supabase contacts list to map contact IDs
    const currentSupabaseContacts = await contactsService.getAll();
    const firstContactId = currentSupabaseContacts[0]?.id || 1;

    // 2. Check & Seed Inquiries
    const existingInquiries = await inquiriesService.getAll();
    if (existingInquiries.length === 0) {
      const dexieInquiries = await db.inquiries.toArray();
      if (dexieInquiries.length > 0) {
        for (const inq of dexieInquiries) {
          await inquiriesService.add({
            contactId: firstContactId,
            pipelineStage: inq.pipelineStage,
            followUpDate: inq.followUpDate,
            notes: inq.notes,
            createdAt: inq.createdAt
          });
        }
      } else {
        await inquiriesService.add({
          contactId: firstContactId,
          pipelineStage: 'New Inquiry',
          followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          notes: 'Interested in Grade 2 admission for academic year 2026-27.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // 3. Check & Seed Messages
    const existingMessages = await messagesService.getAll();
    if (existingMessages.length === 0) {
      const dexieMessages = await db.messages.toArray();
      if (dexieMessages.length > 0) {
        for (const m of dexieMessages) {
          await messagesService.add({
            contactId: firstContactId,
            direction: m.direction,
            type: m.type,
            content: m.content,
            status: m.status,
            timestamp: m.timestamp
          });
        }
      } else {
        await messagesService.add({
          contactId: firstContactId,
          direction: 'in',
          type: 'text',
          content: 'Hello SpacECE Team, could you please share the fee structure?',
          status: 'read',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        });
        await messagesService.add({
          contactId: firstContactId,
          direction: 'out',
          type: 'text',
          content: 'Welcome to SpacECE India! Here is the fee details link for Grade 2: https://spacece.co/fees',
          status: 'delivered',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 4. Check & Seed Templates
    const existingTemplates = await templatesService.getAll();
    if (existingTemplates.length === 0) {
      const dexieTemplates = await db.templates.toArray();
      if (dexieTemplates.length > 0) {
        for (const t of dexieTemplates) {
          await templatesService.add({
            name: t.name,
            category: t.category,
            status: t.status,
            messageBody: t.messageBody,
            createdAt: t.createdAt
          });
        }
      } else {
        await templatesService.add({
          name: 'fee_due_reminder_v1',
          category: 'Fee Reminder',
          status: 'APPROVED',
          messageBody: 'Dear {{1}}, kindly note that quarterly tuition fees for {{2}} are due by {{3}}.',
          createdAt: new Date().toISOString()
        });
        await templatesService.add({
          name: 'admission_confirmation_v1',
          category: 'Admission Confirmation',
          status: 'APPROVED',
          messageBody: 'Congratulations {{1}}! Your child {{2}} has been confirmed for admission.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // 5. Check & Seed WhatsApp Settings
    const existingSettings = await whatsappSettingsService.get();
    if (!existingSettings) {
      const dexieSettingsList = await db.whatsAppSettings.toArray();
      const s = dexieSettingsList[0];
      await whatsappSettingsService.save({
        displayName: s?.displayName || 'SpacECE India Foundation',
        phoneNumber: s?.phoneNumber || '+91 98765 00000',
        phoneNumberId: s?.phoneNumberId || '1092837491029',
        wabaId: s?.wabaId || '9871236450123',
        accessToken: s?.accessToken || '',
        connectionStatus: s?.connectionStatus || 'CONNECTED'
      });
    }

    // 6. Check & Seed Subscriptions
    const existingSub = await subscriptionService.getSubscription();
    if (!existingSub) {
      await subscriptionService.saveSubscription({
        planName: 'Enterprise Pro Plan',
        contactLimit: 5000,
        messageLimit: 50000,
        contactsUsed: currentSupabaseContacts.length,
        messagesUsed: (await messagesService.getAll()).length,
        status: 'Active',
        renewalDate: '2026-12-31'
      });
    }

    // 7. Check & Seed Automations
    const existingRules = await automationService.getRules();
    if (existingRules.length === 0) {
      await automationService.addRule({
        name: 'Auto Welcome Message for New Inquiry',
        description: 'Sends welcome WhatsApp template upon receiving new admission inquiry',
        triggerEvent: 'INQUIRY_CREATED',
        conditions: [],
        actions: [{ actionType: 'SEND_TEMPLATE', params: { templateName: 'fee_due_reminder_v1' } }],
        status: 'ACTIVE',
        executionCount: 12,
        lastExecutedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    }

    console.log('✅ Supabase database migration and initialization complete!');
  } catch (err) {
    console.error('Error during Supabase migration:', err);
  }

  const finalContacts = await contactsService.getAll();
  const finalInquiries = await inquiriesService.getAll();
  const finalMessages = await messagesService.getAll();
  const finalTemplates = await templatesService.getAll();
  const finalCampaigns = await campaignsService.getAll();

  return {
    contacts: finalContacts.length,
    inquiries: finalInquiries.length,
    messages: finalMessages.length,
    templates: finalTemplates.length,
    campaigns: finalCampaigns.length
  };
}
