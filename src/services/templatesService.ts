import { supabase } from '../lib/supabase';
import type { Template } from '../db/database';

export const templatesService = {
  async getAll(): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching templates from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      status: row.status as Template['status'],
      messageBody: row.message_body,
      createdAt: row.created_at
    }));
  },

  async add(template: Omit<Template, 'id'>): Promise<Template | null> {
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: template.name,
        category: template.category,
        status: template.status,
        message_body: template.messageBody,
        created_at: template.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding template to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      status: data.status,
      messageBody: data.message_body,
      createdAt: data.created_at
    };
  },

  async update(id: number, updates: Partial<Template>): Promise<boolean> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.messageBody !== undefined) payload.message_body = updates.messageBody;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('templates').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating template ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting template ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }
};
