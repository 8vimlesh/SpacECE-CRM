import { supabase } from '../lib/supabase';
import type { AutomationRule, AutomationLog } from '../db/database';

export const automationService = {
  async getRules(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching automation rules from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
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
  },

  async addRule(rule: Omit<AutomationRule, 'id'>): Promise<AutomationRule | null> {
    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        name: rule.name,
        description: rule.description,
        trigger_event: rule.triggerEvent,
        conditions: rule.conditions,
        actions: rule.actions,
        status: rule.status,
        execution_count: rule.executionCount,
        last_executed_at: rule.lastExecutedAt,
        created_at: rule.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding automation rule to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      triggerEvent: data.trigger_event,
      conditions: data.conditions,
      actions: data.actions,
      status: data.status,
      executionCount: data.execution_count,
      lastExecutedAt: data.last_executed_at,
      createdAt: data.created_at
    };
  },

  async updateRule(id: number, updates: Partial<AutomationRule>): Promise<boolean> {
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

    const { error } = await supabase.from('automation_rules').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating automation rule ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async deleteRule(id: number): Promise<boolean> {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting automation rule ${id} from Supabase:`, error);
      return false;
    }
    return true;
  },

  async getLogs(): Promise<AutomationLog[]> {
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching automation logs from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
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
  },

  async addLog(log: Omit<AutomationLog, 'id'>): Promise<AutomationLog | null> {
    const { data, error } = await supabase
      .from('automation_logs')
      .insert({
        rule_id: log.ruleId,
        rule_name: log.ruleName,
        type: log.type,
        recipient: log.recipient,
        status: log.status,
        notes: log.notes,
        conditions_evaluated: log.conditionsEvaluated,
        actions_executed: log.actionsExecuted,
        timestamp: log.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding automation log to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      timestamp: data.timestamp,
      ruleId: data.rule_id,
      ruleName: data.rule_name,
      type: data.type,
      recipient: data.recipient,
      status: data.status,
      notes: data.notes,
      conditionsEvaluated: data.conditions_evaluated,
      actionsExecuted: data.actions_executed
    };
  }
};
