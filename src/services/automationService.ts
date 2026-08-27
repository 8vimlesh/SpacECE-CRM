import { supabase } from '../lib/supabase';
import { db, type AutomationRule, type AutomationLog } from '../db/database';

export const automationService = {
  async getRules(): Promise<AutomationRule[]> {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description || '',
          triggerEvent: row.trigger_event as AutomationRule['triggerEvent'],
          conditions: row.conditions || [],
          actions: row.actions || [],
          status: row.status as AutomationRule['status'],
          executionCount: row.execution_count ?? 0,
          lastExecutedAt: row.last_executed_at,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase automation rules fetch error, fallback to local DB:', e);
    }
    return await db.automationRules.toArray();
  },

  async addRule(rule: Omit<AutomationRule, 'id'>): Promise<AutomationRule | null> {
    const localId = await db.automationRules.add({
      name: rule.name,
      description: rule.description,
      triggerEvent: rule.triggerEvent,
      conditions: rule.conditions,
      actions: rule.actions,
      status: rule.status,
      executionCount: rule.executionCount,
      lastExecutedAt: rule.lastExecutedAt,
      createdAt: rule.createdAt || new Date().toISOString()
    });

    try {
      await supabase.from('automation_rules').insert({
        name: rule.name,
        description: rule.description,
        trigger_event: rule.triggerEvent,
        conditions: rule.conditions,
        actions: rule.actions,
        status: rule.status,
        execution_count: rule.executionCount,
        last_executed_at: rule.lastExecutedAt,
        created_at: rule.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase automation rule insert skipped/failed:', e);
    }

    return (await db.automationRules.get(localId as number)) || null;
  },

  async updateRule(id: number, updates: Partial<AutomationRule>): Promise<boolean> {
    await db.automationRules.update(id, updates);

    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.triggerEvent !== undefined) payload.trigger_event = updates.triggerEvent;
      if (updates.conditions !== undefined) payload.conditions = updates.conditions;
      if (updates.actions !== undefined) payload.actions = updates.actions;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.executionCount !== undefined) payload.execution_count = updates.executionCount;
      if (updates.lastExecutedAt !== undefined) payload.last_executed_at = updates.lastExecutedAt;
      payload.updated_at = new Date().toISOString();

      await supabase.from('automation_rules').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase automation rule update skipped/failed:', e);
    }
    return true;
  },

  async deleteRule(id: number): Promise<boolean> {
    await db.automationRules.delete(id);
    try {
      await supabase.from('automation_rules').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase automation rule delete skipped/failed:', e);
    }
    return true;
  },

  async getLogs(): Promise<AutomationLog[]> {
    try {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          timestamp: row.timestamp,
          ruleId: row.rule_id,
          ruleName: row.rule_name || 'System Rule',
          type: row.type || 'Event',
          recipient: row.recipient || 'All',
          status: row.status as AutomationLog['status'],
          notes: row.notes || '',
          conditionsEvaluated: row.conditions_evaluated,
          actionsExecuted: row.actions_executed
        }));
      }
    } catch (e) {
      console.warn('Supabase automation logs fetch error, fallback to local DB:', e);
    }
    return await db.automationLogs.reverse().toArray();
  },

  async addLog(log: Omit<AutomationLog, 'id'>): Promise<AutomationLog | null> {
    const localId = await db.automationLogs.add({
      timestamp: log.timestamp || new Date().toISOString(),
      ruleId: log.ruleId,
      ruleName: log.ruleName,
      type: log.type,
      recipient: log.recipient,
      status: log.status,
      notes: log.notes,
      conditionsEvaluated: log.conditionsEvaluated,
      actionsExecuted: log.actionsExecuted
    });

    try {
      await supabase.from('automation_logs').insert({
        rule_id: log.ruleId,
        rule_name: log.ruleName,
        type: log.type,
        recipient: log.recipient,
        status: log.status,
        notes: log.notes,
        conditions_evaluated: log.conditionsEvaluated,
        actions_executed: log.actionsExecuted,
        timestamp: log.timestamp || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase automation log insert skipped/failed:', e);
    }

    return (await db.automationLogs.get(localId as number)) || null;
  }
};
