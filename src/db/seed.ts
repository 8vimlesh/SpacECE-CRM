import { db } from './database';

export async function seedDatabase() {
  // Always ensure WhatsApp Settings are CONNECTED with valid default credentials
  try {
    const existingSettings = await db.whatsAppSettings.toArray();
    if (existingSettings.length === 0) {
      await db.whatsAppSettings.add({
        displayName: 'Spacece India Foundation Official WhatsApp',
        phoneNumber: '+91 93402 14793',
        phoneNumberId: '1256873630846914',
        wabaId: '1079644411247236',
        accessToken: 'EAAO3nrHudsIBSRKdeyAHTXBviM819bi6BrcrvyViMy5VyriCyAdsXn7MWggVBvKqGsRwQD4h9f9vdhYZCS11WWajbsHV61eZC4dcL1kAFlyQO4L6JDdw63tpT5N7K4fR9qvsiSZCChk0EU3Ntfvp049xA98RoKhByZCN47HgbRM51d5GlCRray9ZCqbLtk1yrCmY7lo9xFuRcbltFpPPPBGXNGGOfgIQ9l2CjfrxfFYxZBZAvpFgTcCK5kJal8cYbqQwfNgSOZB0ZCgYHvSQvBaCZB3mFAPQZDZD',
        connectionStatus: 'CONNECTED',
        lastChecked: 'Just Now',
        gatewayProvider: 'META_CLOUD',
        webhookUrl: 'https://n8n.spacece.org/webhook/whatsapp-events',
        webhookSecret: 'spc_sec_99481057102947102947'
      });
    } else if (existingSettings[0].connectionStatus !== 'CONNECTED' || !existingSettings[0].phoneNumberId) {
      await db.whatsAppSettings.update(existingSettings[0].id!, {
        displayName: 'Spacece India Foundation Official WhatsApp',
        phoneNumber: '+91 93402 14793',
        phoneNumberId: '1256873630846914',
        wabaId: '1079644411247236',
        accessToken: 'EAAO3nrHudsIBSRKdeyAHTXBviM819bi6BrcrvyViMy5VyriCyAdsXn7MWggVBvKqGsRwQD4h9f9vdhYZCS11WWajbsHV61eZC4dcL1kAFlyQO4L6JDdw63tpT5N7K4fR9qvsiSZCChk0EU3Ntfvp049xA98RoKhByZCN47HgbRM51d5GlCRray9ZCqbLtk1yrCmY7lo9xFuRcbltFpPPPBGXNGGOfgIQ9l2CjfrxfFYxZBZAvpFgTcCK5kJal8cYbqQwfNgSOZB0ZCgYHvSQvBaCZB3mFAPQZDZD',
        connectionStatus: 'CONNECTED',
        lastChecked: 'Just Now',
        gatewayProvider: 'META_CLOUD'
      });
    }
  } catch (e) {
    console.warn('Auto-sync settings upgrade warning:', e);
  }

  // Always ensure all automation rules are ACTIVE and keyword responders exist
  try {
    const existingRules = await db.automationRules.toArray();
    for (const rule of existingRules) {
      if (rule.status !== 'ACTIVE') {
        await db.automationRules.update(rule.id!, { status: 'ACTIVE' });
      }
    }

    const hasFeesRule = existingRules.some((r) => r.name.includes('Fee Structure'));
    if (!hasFeesRule) {
      await db.automationRules.add({
        name: 'Auto Fee Structure Keyword Responder',
        description: 'Sends automated fee breakdown when a parent messages "FEES" on WhatsApp.',
        triggerEvent: 'KEYWORD_MATCH',
        conditions: [
          { field: 'incomingText', operator: 'CONTAINS', value: 'FEES', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEXT', params: { text: 'Hi! SpacECE Teacher Training annual tuition fee is ₹25,000 (payable in 4 quarterly installments). Reply "APPLY" for registration.' } }
        ],
        status: 'ACTIVE',
        executionCount: 28,
        lastExecutedAt: '2026-02-27T11:20:00Z',
        createdAt: '2026-01-02T00:00:00Z'
      });
    }

    const hasCoursesRule = existingRules.some((r) => r.name.includes('Course Info'));
    if (!hasCoursesRule) {
      await db.automationRules.add({
        name: 'Course Info Keyword Responder',
        description: 'Sends program details when user messages "COURSES" or "PROGRAMS".',
        triggerEvent: 'KEYWORD_MATCH',
        conditions: [
          { field: 'incomingText', operator: 'CONTAINS', value: 'COURSES', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEXT', params: { text: 'SpacECE Programs offered: 1. Early Childhood Care & Education (ECCE) 2. Montessori Teacher Training 3. Nursery Teacher Training (NTT). Reply with course name for brochure!' } }
        ],
        status: 'ACTIVE',
        executionCount: 19,
        lastExecutedAt: '2026-02-27T08:45:00Z',
        createdAt: '2026-01-03T00:00:00Z'
      });
    }
  } catch (e) {
    console.warn('Auto-sync automation rules upgrade warning:', e);
  }

  const contactCount = await db.contacts.count();
  if (contactCount > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding Spacece India Foundation CRM Database...');

  // 1. Seed Contacts
  const contact1Id = await db.contacts.add({
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    linkedStudentClass: 'Aarav Sharma (Grade 2-B)',
    tags: ['Parent', 'Active Student', 'Fee Paid'],
    status: 'Active',
    optedOut: false,
    createdAt: '2026-01-15T10:30:00Z'
  });

  const contact2Id = await db.contacts.add({
    name: 'Priya Patel',
    phone: '+91 98123 45678',
    linkedStudentClass: 'Ananya Patel (Nursery-A)',
    tags: ['Parent', 'Admission Lead', 'High Priority'],
    status: 'Lead',
    optedOut: false,
    createdAt: '2026-02-01T14:15:00Z'
  });

  await db.contacts.add({
    name: 'Amit Verma',
    phone: '+91 99887 76655',
    linkedStudentClass: 'Ishita Verma (Grade 5-A)',
    tags: ['Parent', 'Active Student', 'Transport Opted'],
    status: 'Active',
    optedOut: false,
    createdAt: '2026-01-20T09:00:00Z'
  });

  const contact4Id = await db.contacts.add({
    name: 'Sunita Deshmukh',
    phone: '+91 97654 32109',
    linkedStudentClass: 'Rohan Deshmukh (KG-2)',
    tags: ['Parent', 'Inquiry Pending'],
    status: 'Lead',
    optedOut: false,
    createdAt: '2026-02-10T11:45:00Z'
  });

  await db.contacts.add({
    name: 'Vikram Joshi',
    phone: '+91 91234 56789',
    linkedStudentClass: 'Aditi Joshi (Grade 1-B)',
    tags: ['Parent', 'Opted Out'],
    status: 'Inactive',
    optedOut: true,
    createdAt: '2025-11-05T16:20:00Z'
  });

  // 2. Seed Inquiries
  await db.inquiries.bulkAdd([
    {
      contactId: contact2Id as number,
      pipelineStage: 'Interested',
      followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      notes: 'Parent interested in STEM curriculum and transport facility. Scheduled campus tour at 11 AM.',
      createdAt: '2026-02-01T14:20:00Z'
    },
    {
      contactId: contact4Id as number,
      pipelineStage: 'Contacted',
      followUpDate: new Date().toISOString().split('T')[0], // Today
      notes: 'Sent brochure via WhatsApp. Awaiting response regarding Nursery seat availability.',
      createdAt: '2026-02-10T12:00:00Z'
    },
    {
      contactId: contact1Id as number,
      pipelineStage: 'Admitted',
      followUpDate: '2026-01-15', // Overdue/Past date
      notes: 'Admission completed. Fee structure paid for Q3.',
      createdAt: '2026-01-16T11:00:00Z'
    }
  ]);

  // 3. Seed Messages
  await db.messages.bulkAdd([
    {
      contactId: contact1Id as number,
      direction: 'out',
      type: 'template',
      content: 'Dear Rajesh Sharma, Thank you for registering Aarav in Grade 2-B at Spacece India Foundation. Your admission confirmation slip is attached.',
      status: 'read',
      timestamp: '2026-02-15T09:30:00Z'
    },
    {
      contactId: contact1Id as number,
      direction: 'in',
      type: 'text',
      content: 'Thank you! When will the new academic books be distributed from campus?',
      status: 'read',
      timestamp: '2026-02-15T09:34:12Z'
    },
    {
      contactId: contact2Id as number,
      direction: 'out',
      type: 'text',
      content: 'Hello Priya Patel! We have scheduled your school visit for Nursery admission on Aug 30, 2026 at 11:00 AM. Please bring student ID proof.',
      status: 'delivered',
      timestamp: '2026-02-20T14:30:00Z'
    }
  ]);

  // 4. Seed Templates
  const template1Id = await db.templates.add({
    name: 'admission_inquiry_welcome',
    category: 'Admission Confirmation',
    status: 'APPROVED',
    messageBody: 'Hello {{1}}, Thank you for your inquiry about admission at Spacece India Foundation for {{2}}. We are delighted to share our prospectus.',
    createdAt: '2026-01-10T08:00:00Z'
  });

  const template2Id = await db.templates.add({
    name: 'annual_sports_day_invite',
    category: 'Event Invite',
    status: 'APPROVED',
    messageBody: 'Dear {{1}}, Spacece India Foundation cordially invites you to our Annual Sports Day on {{2}} at {{3}}. Join us to cheer our young champions!',
    createdAt: '2026-01-12T10:00:00Z'
  });

  await db.templates.add({
    name: 'fee_reminder_q3',
    category: 'Fee Reminder',
    status: 'APPROVED',
    messageBody: 'Dear Parent of {{1}}, This is a gentle reminder that the Q3 tuition fee is due on {{2}}. Kindly pay using the school app.',
    createdAt: '2026-02-18T16:00:00Z'
  });

  await db.templates.add({
    name: 'holiday_notice_diwali',
    category: 'Holiday Notice',
    status: 'PENDING',
    messageBody: 'Dear Parents, Spacece India Foundation will remain closed for Diwali Vacations from {{1}} to {{2}}. School reopens on {{3}}.',
    createdAt: '2026-02-20T11:00:00Z'
  });

  // 5. Seed Campaigns
  await db.campaigns.bulkAdd([
    {
      name: 'Nursery Admission 2026 Announcement',
      templateId: template1Id as number,
      audienceType: 'Prospective Nursery Parents',
      status: 'COMPLETED',
      sentCount: 450,
      createdAt: '2026-02-05T09:00:00Z'
    },
    {
      name: 'Annual Sports Day Broadcast',
      templateId: template2Id as number,
      audienceType: 'All Enrolled Parents (Grades 1-5)',
      status: 'SCHEDULED',
      sentCount: 0,
      createdAt: '2026-02-22T11:30:00Z'
    }
  ]);

  // 6. Seed Media
  await db.media.bulkAdd([
    {
      fileName: 'Spacece_School_Prospectus_2026.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&q=80',
      uploadDate: '2026-01-10T10:00:00Z',
      size: '4.2 MB'
    },
    {
      fileName: 'Campus_Infrastructure_Tour.mp4',
      fileType: 'video/mp4',
      fileUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&q=80',
      uploadDate: '2026-01-14T15:30:00Z',
      size: '18.5 MB'
    },
    {
      fileName: 'Annual_Sports_Day_Banner.png',
      fileType: 'image/png',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
      uploadDate: '2026-02-01T09:15:00Z',
      size: '1.1 MB'
    },
    {
      fileName: 'Principal_Audio_Message_Diwali.mp3',
      fileType: 'audio/mp3',
      fileUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
      uploadDate: '2026-02-15T11:00:00Z',
      size: '2.8 MB'
    }
  ]);

  // 9. Seed Automation Activity Logs
  const logCount = await db.automationLogs.count();
  if (logCount === 0) {
    await db.automationLogs.bulkAdd([
      {
        timestamp: '2026-02-26T10:15:00Z',
        ruleName: 'New Inquiry Welcome Message',
        type: 'INQUIRY_CREATED',
        recipient: '+91 98765 43210',
        status: 'SUCCESS',
        notes: 'Inquiry Created -> Condition (Stage = New Inquiry) Passed -> Sent Template "admission_inquiry_welcome"',
        conditionsEvaluated: 'Stage EQUALS New Inquiry (PASSED)',
        actionsExecuted: 'Send WhatsApp Template "admission_inquiry_welcome"'
      },
      {
        timestamp: '2026-02-26T14:20:00Z',
        ruleName: 'New WhatsApp Message Notification',
        type: 'WHATSAPP_INCOMING',
        recipient: 'n8n.spacece.org',
        status: 'SUCCESS',
        notes: 'Incoming WhatsApp Message -> Webhook Payload dispatched to n8n listener.',
        conditionsEvaluated: 'Direction EQUALS Inbound (PASSED)',
        actionsExecuted: 'Send Webhook to n8n'
      },
      {
        timestamp: '2026-02-27T09:05:00Z',
        ruleName: 'Interested Parent Follow-Up',
        type: 'INQUIRY_FOLLOWUP_DUE',
        recipient: '+91 91234 56789',
        status: 'SKIPPED',
        notes: 'Skipped — Contact is Opted-Out of WhatsApp messaging.',
        conditionsEvaluated: 'Stage EQUALS Interested (PASSED)',
        actionsExecuted: 'Halted (Opt-Out Protection)'
      }
    ]);
  }

  // 10. Seed Automation Rules (ACTIVE by default)
  const rulesCount = await db.automationRules.count();
  if (rulesCount === 0) {
    await db.automationRules.bulkAdd([
      {
        name: 'New Inquiry Welcome Message',
        description: 'Sends an automatic prospectus welcome template when a new parent inquiry is logged.',
        triggerEvent: 'INQUIRY_CREATED',
        conditions: [
          { field: 'pipelineStage', operator: 'EQUALS', value: 'New Inquiry', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEMPLATE', params: { templateName: 'admission_inquiry_welcome' } }
        ],
        status: 'ACTIVE',
        executionCount: 12,
        lastExecutedAt: '2026-02-26T10:15:00Z',
        createdAt: '2026-01-01T00:00:00Z'
      },
      {
        name: 'Auto Fee Structure Keyword Responder',
        description: 'Sends automated fee breakdown when a parent messages "FEES" on WhatsApp.',
        triggerEvent: 'KEYWORD_MATCH',
        conditions: [
          { field: 'incomingText', operator: 'CONTAINS', value: 'FEES', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEXT', params: { text: 'Hi! SpacECE Teacher Training annual tuition fee is ₹25,000 (payable in 4 quarterly installments). Reply "APPLY" for registration.' } }
        ],
        status: 'ACTIVE',
        executionCount: 28,
        lastExecutedAt: '2026-02-27T11:20:00Z',
        createdAt: '2026-01-02T00:00:00Z'
      },
      {
        name: 'Course Info Keyword Responder',
        description: 'Sends program details when user messages "COURSES" or "PROGRAMS".',
        triggerEvent: 'KEYWORD_MATCH',
        conditions: [
          { field: 'incomingText', operator: 'CONTAINS', value: 'COURSES', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEXT', params: { text: 'SpacECE Programs offered: 1. Early Childhood Care & Education (ECCE) 2. Montessori Teacher Training 3. Nursery Teacher Training (NTT). Reply with course name for brochure!' } }
        ],
        status: 'ACTIVE',
        executionCount: 19,
        lastExecutedAt: '2026-02-27T08:45:00Z',
        createdAt: '2026-01-03T00:00:00Z'
      },
      {
        name: 'Interested Parent Follow-Up',
        description: 'Sends follow-up fee details when an inquiry is marked Interested and follow-up is due.',
        triggerEvent: 'INQUIRY_FOLLOWUP_DUE',
        conditions: [
          { field: 'pipelineStage', operator: 'EQUALS', value: 'Interested', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEMPLATE', params: { templateName: 'fee_reminder_q3' } }
        ],
        status: 'ACTIVE',
        executionCount: 8,
        lastExecutedAt: '2026-02-25T14:10:00Z',
        createdAt: '2026-01-04T00:00:00Z'
      },
      {
        name: 'New WhatsApp Message Notification (n8n Webhook)',
        description: 'Dispatches real-time webhook payload to n8n whenever an incoming parent message arrives.',
        triggerEvent: 'WHATSAPP_INCOMING',
        conditions: [],
        actions: [
          { actionType: 'SEND_WEBHOOK', params: { webhookUrl: 'https://n8n.spacece.org/webhook/whatsapp-events' } }
        ],
        status: 'ACTIVE',
        executionCount: 45,
        lastExecutedAt: '2026-02-26T14:20:00Z',
        createdAt: '2026-01-05T00:00:00Z'
      },
      {
        name: 'Admission Confirmation Announcement',
        description: 'Sends congratulatory message when an inquiry pipeline stage changes to Admitted.',
        triggerEvent: 'INQUIRY_STAGE_CHANGED',
        conditions: [
          { field: 'pipelineStage', operator: 'EQUALS', value: 'Admitted', logic: 'AND' }
        ],
        actions: [
          { actionType: 'SEND_TEXT', params: { text: 'Congratulations! Your child admission at Spacece India Foundation has been confirmed.' } }
        ],
        status: 'ACTIVE',
        executionCount: 6,
        lastExecutedAt: '2026-02-20T16:00:00Z',
        createdAt: '2026-01-06T00:00:00Z'
      }
    ]);
  }

  // 7. Seed WhatsApp Settings (CONNECTED by default)
  await db.whatsAppSettings.add({
    displayName: 'Spacece India Foundation Official WhatsApp',
    phoneNumber: '+91 93402 14793',
    phoneNumberId: '1256873630846914',
    wabaId: '1079644411247236',
    accessToken: 'EAAO3nrHudsIBSRKdeyAHTXBviM819bi6BrcrvyViMy5VyriCyAdsXn7MWggVBvKqGsRwQD4h9f9vdhYZCS11WWajbsHV61eZC4dcL1kAFlyQO4L6JDdw63tpT5N7K4fR9qvsiSZCChk0EU3Ntfvp049xA98RoKhByZCN47HgbRM51d5GlCRray9ZCqbLtk1yrCmY7lo9xFuRcbltFpPPPBGXNGGOfgIQ9l2CjfrxfFYxZBZAvpFgTcCK5kJal8cYbqQwfNgSOZB0ZCgYHvSQvBaCZB3mFAPQZDZD',
    connectionStatus: 'CONNECTED',
    lastChecked: 'Just Now',
    gatewayProvider: 'META_CLOUD',
    webhookUrl: 'https://n8n.spacece.org/webhook/whatsapp-events',
    webhookSecret: 'spc_sec_99481057102947102947'
  });

  // 8. Seed Subscription
  await db.subscription.add({
    planName: 'Spacece Education CRM Pro',
    contactLimit: 5000,
    messageLimit: 50000,
    contactsUsed: 1240,
    messagesUsed: 8420,
    status: 'Active',
    renewalDate: '2027-03-31',
    paymentHistory: [
      {
        id: 'INV-2026-001',
        date: '2026-01-01',
        amount: '₹24,999',
        plan: 'Annual Pro Plan (Education Foundation)',
        status: 'Paid',
        invoiceUrl: '#'
      },
      {
        id: 'INV-2025-001',
        date: '2025-01-01',
        amount: '₹24,999',
        plan: 'Annual Pro Plan (Education Foundation)',
        status: 'Paid',
        invoiceUrl: '#'
      }
    ]
  });

  console.log('Spacece India Foundation CRM Database successfully seeded!');
}

export async function resetDatabase() {
  await db.delete();
  await db.open();
  await seedDatabase();
}
