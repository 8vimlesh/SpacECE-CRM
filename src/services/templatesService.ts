import { supabase, isSupabaseActive, disableSupabaseSync } from '../lib/supabase';
import { db, type Template } from '../db/database';

export const templatesService = {
  async getAll(): Promise<Template[]> {
    if (isSupabaseActive()) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          disableSupabaseSync();
        } else if (data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            status: row.status as Template['status'],
            messageBody: row.message_body,
            createdAt: row.created_at
          }));
        }
      } catch {
        disableSupabaseSync();
      }
    }
    return await db.templates.toArray();
  },

  async add(template: Omit<Template, 'id'>): Promise<Template | null> {
    const localId = await db.templates.add({
      name: template.name,
      category: template.category,
      status: template.status,
      messageBody: template.messageBody,
      createdAt: template.createdAt || new Date().toISOString()
    });

    try {
      await supabase.from('templates').insert({
        name: template.name,
        category: template.category,
        status: template.status,
        message_body: template.messageBody,
        created_at: template.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase template insert skipped/failed:', e);
    }

    return (await db.templates.get(localId as number)) || null;
  },

  async update(id: number, updates: Partial<Template>): Promise<boolean> {
    await db.templates.update(id, updates);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.messageBody !== undefined) payload.message_body = updates.messageBody;
      payload.updated_at = new Date().toISOString();

      await supabase.from('templates').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase template update skipped/failed:', e);
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await db.templates.delete(id);
    try {
      await supabase.from('templates').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase template delete skipped/failed:', e);
    }
    return true;
  }
};
