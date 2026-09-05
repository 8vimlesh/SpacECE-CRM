import Dexie, { type Table } from 'dexie';

export interface Contact {
  id?: number;
  name: string;
  phone: string;
  linkedStudentClass: string;
  tags: string[];
  status: 'Active' | 'Inactive' | 'Lead';
  optedOut: boolean;
  createdAt: string;
}

export interface Inquiry {
  id?: number;
  contactId: number;
  pipelineStage: 'New Inquiry' | 'Contacted' | 'Interested' | 'Admitted';
  followUpDate: string;
  notes: string;
  createdAt: string;
}

export interface Message {
  id?: number;
  contactId: number;
  direction: 'in' | 'out';
  type: 'text' | 'template' | 'media' | 'document';
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export interface Template {
  id?: number;
  name: string;
  category: 'Fee Reminder' | 'Admission Confirmation' | 'Event Invite' | 'Holiday Notice' | 'UTILITY' | 'MARKETING' | string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  messageBody: string;
  createdAt: string;
}

export interface Campaign {
  id?: number;
  name: string;
  templateId: number;
  audienceType: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  sentCount: number;
  createdAt: string;
}

export interface MediaItem {
  id?: number;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadDate: string;
  size: string;
}

export interface WhatsAppSettings {
  id?: number;
  displayName: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'PENDING';
  lastChecked?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  gatewayProvider?: 'EASY_GATEWAY' | 'DIRECT_WHATSAPP_WEB' | 'META_CLOUD' | 'SIMULATOR';
  easyGatewayUrl?: string;
  easyApiKey?: string;
  personalPhoneAlerts?: string;
  autoOpenWebWhatsApp?: boolean;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'Paid' | 'Pending';
  invoiceUrl: string;
}

export interface Subscription {
  id?: number;
  planName: string;
  contactLimit: number;
  messageLimit: number;
  contactsUsed: number;
  messagesUsed: number;
  paymentHistory: PaymentRecord[];
  status: 'Active' | 'Trial' | 'Expired';
  renewalDate: string;
}

export interface AutomationRuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'IS_TRUE' | 'IS_FALSE';
  value: string;
  logic: 'AND' | 'OR';
}

export interface AutomationRuleAction {
  actionType: 'SEND_TEMPLATE' | 'SEND_TEXT' | 'SEND_IMAGE' | 'SEND_DOCUMENT' | 'UPDATE_STAGE' | 'ADD_TAG' | 'ADD_NOTE' | 'SEND_WEBHOOK';
  params: Record<string, any>;
}

export interface AutomationRule {
  id?: number;
  name: string;
  description: string;
  triggerEvent: 'INQUIRY_CREATED' | 'INQUIRY_STAGE_CHANGED' | 'INQUIRY_FOLLOWUP_DUE' | 'CONTACT_CREATED' | 'CONTACT_OPTED_OUT' | 'WHATSAPP_INCOMING' | 'WHATSAPP_OUTGOING' | 'CAMPAIGN_CREATED' | 'CAMPAIGN_COMPLETED' | 'CAMPAIGN_FAILED' | 'KEYWORD_MATCH';
  conditions: AutomationRuleCondition[];
  actions: AutomationRuleAction[];
  status: 'ACTIVE' | 'INACTIVE';
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface AutomationLog {
  id?: number;
  timestamp: string;
  ruleId?: number;
  ruleName: string;
  type: string;
  recipient: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  notes: string;
  conditionsEvaluated?: string;
  actionsExecuted?: string;
}

export class SpaceceCRMDatabase extends Dexie {
  contacts!: Table<Contact>;
  inquiries!: Table<Inquiry>;
  messages!: Table<Message>;
  templates!: Table<Template>;
  campaigns!: Table<Campaign>;
  media!: Table<MediaItem>;
  whatsAppSettings!: Table<WhatsAppSettings>;
  subscription!: Table<Subscription>;
  automationLogs!: Table<AutomationLog>;
  automationRules!: Table<AutomationRule>;

  constructor() {
    super('SpaceceIndiaFoundationCRM');
    this.version(3).stores({
      contacts: '++id, name, phone, status, optedOut, createdAt',
      inquiries: '++id, contactId, pipelineStage, followUpDate, createdAt',
      messages: '++id, contactId, direction, type, status, timestamp',
      templates: '++id, name, category, status, createdAt',
      campaigns: '++id, name, templateId, status, createdAt',
      media: '++id, fileName, fileType, uploadDate',
      whatsAppSettings: '++id, connectionStatus',
      subscription: '++id, planName, status',
      automationLogs: '++id, timestamp, ruleId, type, status',
      automationRules: '++id, triggerEvent, status, createdAt'
    });
  }
}

export const db = new SpaceceCRMDatabase();
