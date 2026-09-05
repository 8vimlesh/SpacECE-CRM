import { supabase, isSupabaseActive, disableSupabaseSync } from '../lib/supabase';
import { db, type Message } from '../db/database';

export const messagesService = {
  async getAll(): Promise<Message[]> {
    if (isSupabaseActive()) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('timestamp', { ascending: true });

        if (error) {
          disableSupabaseSync();
        } else if (data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            contactId: row.contact_id,
            direction: row.direction as Message['direction'],
            type: row.type as Message['type'],
            content: row.content || '',
            status: row.status as Message['status'],
            timestamp: row.timestamp
          }));
        }
      } catch {
        disableSupabaseSync();
      }
    }
    return await db.messages.toArray();
  },

  async getByContactId(contactId: number): Promise<Message[]> {
    const all = await this.getAll();
    return all.filter((m) => m.contactId === contactId);
  },

  async add(message: Omit<Message, 'id'>): Promise<Message | null> {
    const localId = await db.messages.add({
      contactId: message.contactId,
      direction: message.direction,
      type: message.type,
      content: message.content,
      status: message.status,
      timestamp: message.timestamp || new Date().toISOString()
    });

    try {
      await supabase.from('messages').insert({
        contact_id: message.contactId,
        direction: message.direction,
        type: message.type,
        content: message.content,
        status: message.status,
        timestamp: message.timestamp || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase message insert skipped/failed:', e);
    }

    return (await db.messages.get(localId as number)) || null;
  },

  async update(id: number, updates: Partial<Message>): Promise<boolean> {
    await db.messages.update(id, updates);
    try {
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.content !== undefined) payload.content = updates.content;
      await supabase.from('messages').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase message update skipped/failed:', e);
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await db.messages.delete(id);
    try {
      await supabase.from('messages').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase message delete skipped/failed:', e);
    }
    return true;
  }
};
