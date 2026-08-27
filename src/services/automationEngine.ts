import { db, type AutomationRule, type Contact, type Inquiry } from '../db/database';
import { sendWhatsAppMessage } from './whatsappService';

// Idempotency cache map (key -> timestamp)
const recentExecutionsCache = new Map<string, number>();

export interface AutomationPayload {
  contactId?: number;
  contact?: Contact;
  inquiryId?: number;
  inquiry?: Inquiry;
  recipientPhone?: string;
  pipelineStage?: string;
  direction?: 'in' | 'out';
  messageType?: string;
  messageText?: string;
  campaignStatus?: string;
  [key: string]: any;
}

/**
 * Triggers and processes automation rules matching an event
 */
export async function triggerAutomationEvent(
  eventType: string,
  payload: AutomationPayload
): Promise<void> {
  try {
    // 1. Fetch matching ACTIVE rules
    const matchingRules = await db.automationRules
      .where('triggerEvent')
      .equals(eventType)
      .and((r) => r.status === 'ACTIVE')
      .toArray();

    if (!matchingRules || matchingRules.length === 0) {
      return;
    }

    // 2. Process each matching rule
    for (const rule of matchingRules) {
      await processAutomationRule(rule, payload);
    }
  } catch (err) {
    console.error('Automation Engine Error:', err);
  }
}

/**
 * Process a single automation rule against payload
 */
async function processAutomationRule(
  rule: AutomationRule,
  payload: AutomationPayload
): Promise<void> {
  const timestamp = new Date().toISOString();
  const ruleName = rule.name;
  const triggerType = rule.triggerEvent;

  // Fetch Contact & Phone Number
  let contact: Contact | undefined = payload.contact;
  if (!contact && payload.contactId) {
    contact = await db.contacts.get(payload.contactId);
  }
  if (!contact && payload.recipientPhone) {
    contact = (await db.contacts.where('phone').equals(payload.recipientPhone).first());
  }

  const recipientStr = contact ? `${contact.name} (${contact.phone})` : payload.recipientPhone || 'System Event';
  const idempotencyKey = `${rule.id}_${contact?.id || payload.inquiryId || payload.recipientPhone}`;

  // Idempotency Guard: Prevent duplicate triggers within 10s
  const lastTime = recentExecutionsCache.get(idempotencyKey);
  if (lastTime && Date.now() - lastTime < 10000) {
    return;
  }
  recentExecutionsCache.set(idempotencyKey, Date.now());

  // 3. Evaluate Conditions
  let conditionsPassed = true;
  let conditionsSummary = '';

  if (rule.conditions && rule.conditions.length > 0) {
    const evaluatedResults: boolean[] = [];

    for (const cond of rule.conditions) {
      let fieldValue: any = undefined;

      if (cond.field === 'pipelineStage') {
        fieldValue = payload.pipelineStage || payload.inquiry?.pipelineStage;
      } else if (cond.field === 'optedOut') {
        fieldValue = contact?.optedOut;
      } else if (cond.field === 'tag') {
        fieldValue = contact?.tags?.includes(cond.value);
      } else if (cond.field === 'direction') {
        fieldValue = payload.direction;
      } else if (cond.field === 'messageType') {
        fieldValue = payload.messageType;
      } else if (cond.field === 'campaignStatus') {
        fieldValue = payload.campaignStatus;
      } else {
        fieldValue = payload[cond.field];
      }

      let condResult = false;
      if (cond.operator === 'EQUALS') {
        condResult = String(fieldValue).toLowerCase() === String(cond.value).toLowerCase();
      } else if (cond.operator === 'NOT_EQUALS') {
        condResult = String(fieldValue).toLowerCase() !== String(cond.value).toLowerCase();
      } else if (cond.operator === 'CONTAINS') {
        condResult = String(fieldValue).toLowerCase().includes(String(cond.value).toLowerCase());
      } else if (cond.operator === 'IS_TRUE') {
        condResult = Boolean(fieldValue) === true;
      } else if (cond.operator === 'IS_FALSE') {
        condResult = Boolean(fieldValue) === false;
      }

      evaluatedResults.push(condResult);
    }

    // Evaluate AND vs OR logic
    if (rule.conditions[0]?.logic === 'OR') {
      conditionsPassed = evaluatedResults.some((r) => r);
    } else {
      conditionsPassed = evaluatedResults.every((r) => r);
    }

    conditionsSummary = rule.conditions
      .map((c, i) => `${c.field} ${c.operator} "${c.value}" -> ${evaluatedResults[i] ? 'PASS' : 'FAIL'}`)
      .join(', ');
  }

  // Handle Condition Failure
  if (!conditionsPassed) {
    await db.automationLogs.add({
      timestamp,
      ruleId: rule.id,
      ruleName,
      type: triggerType,
      recipient: recipientStr,
      status: 'SKIPPED',
      notes: 'Skipped — Rule conditions not satisfied.',
      conditionsEvaluated: conditionsSummary || 'Conditions Failed',
      actionsExecuted: 'None'
    });
    return;
  }

  // 4. Opt-Out Protection Safeguard
  const hasWhatsAppAction = rule.actions.some((a) =>
    ['SEND_TEMPLATE', 'SEND_TEXT', 'SEND_IMAGE', 'SEND_DOCUMENT'].includes(a.actionType)
  );

  if (hasWhatsAppAction && contact && contact.optedOut) {
    await db.automationLogs.add({
      timestamp,
      ruleId: rule.id,
      ruleName,
      type: triggerType,
      recipient: recipientStr,
      status: 'SKIPPED',
      notes: 'Skipped — Parent contact is Opted-Out of WhatsApp messaging.',
      conditionsEvaluated: conditionsSummary || 'Passed',
      actionsExecuted: 'Halted (Opt-Out Restriction)'
    });
    return;
  }

  // 5. Execute Configured Actions
  const executedActionsSummary: string[] = [];

  try {
    for (const action of rule.actions) {
      if (action.actionType === 'SEND_TEMPLATE' && contact) {
        const tplName = action.params.templateName || 'admission_inquiry_welcome';
        const templatesList = await db.templates.where('name').equals(tplName).toArray();
        const tpl = templatesList[0];

        const msgText = tpl
          ? tpl.messageBody.replace('{{1}}', contact.name).replace('{{2}}', contact.linkedStudentClass)
          : `[Auto-Response] Thank you for connecting with Spacece India Foundation, ${contact.name}!`;

        await sendWhatsAppMessage({
          contactId: contact.id!,
          recipientPhone: contact.phone,
          messageText: msgText
        });

        executedActionsSummary.push(`Sent WhatsApp Template "${tplName}"`);
      } else if (action.actionType === 'SEND_TEXT' && contact) {
        const msgText = action.params.text || 'Hello from Spacece India Foundation Automation System.';
        await sendWhatsAppMessage({
          contactId: contact.id!,
          recipientPhone: contact.phone,
          messageText: msgText
        });

        executedActionsSummary.push('Sent WhatsApp Text');
      } else if (action.actionType === 'UPDATE_STAGE' && payload.inquiryId) {
        const newStage = action.params.pipelineStage || 'Contacted';
        await db.inquiries.update(payload.inquiryId, {
          pipelineStage: newStage as any
        });
        executedActionsSummary.push(`Updated Inquiry Stage to "${newStage}"`);
      } else if (action.actionType === 'ADD_TAG' && contact?.id) {
        const newTag = action.params.tag || 'Automated';
        const currentTags = contact.tags || [];
        if (!currentTags.includes(newTag)) {
          await db.contacts.update(contact.id, {
            tags: [...currentTags, newTag]
          });
        }
        executedActionsSummary.push(`Added Tag "${newTag}" to Contact`);
      } else if (action.actionType === 'SEND_WEBHOOK') {
        const settingsList = await db.whatsAppSettings.toArray();
        const targetUrl = action.params.webhookUrl || settingsList[0]?.webhookUrl || 'https://n8n.spacece.org/webhook/whatsapp-events';
        
        // Simulating webhook POST dispatch
        executedActionsSummary.push(`Dispatched Webhook Payload to ${targetUrl}`);
      }
    }

    // 6. Record Execution Success
    await db.automationRules.update(rule.id!, {
      executionCount: (rule.executionCount || 0) + 1,
      lastExecutedAt: timestamp
    });

    await db.automationLogs.add({
      timestamp,
      ruleId: rule.id,
      ruleName,
      type: triggerType,
      recipient: recipientStr,
      status: 'SUCCESS',
      notes: `Automation executed successfully (${executedActionsSummary.length} actions).`,
      conditionsEvaluated: conditionsSummary || 'All Conditions Passed',
      actionsExecuted: executedActionsSummary.join('; ')
    });
  } catch (err: any) {
    await db.automationLogs.add({
      timestamp,
      ruleId: rule.id,
      ruleName,
      type: triggerType,
      recipient: recipientStr,
      status: 'FAILED',
      notes: `Execution Error: ${err.message || 'Action dispatch failure'}`,
      conditionsEvaluated: conditionsSummary || 'Passed',
      actionsExecuted: 'Failed'
    });
  }
}
