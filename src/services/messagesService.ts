import { supabase } from '../lib/supabase';
import type { Message } from '../db/database';

export const messagesService = {
  async getAll(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      direction: row.direction as Message['direction'],
      type: row.type as Message['type'],
      content: row.content || '',
      status: row.status as Message['status'],
      timestamp: row.timestamp
    }));
  },

  async getByContactId(contactId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error(`Error fetching messages for contact ${contactId}:`, error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      direction: row.direction as Message['direction'],
      type: row.type as Message['type'],
      content: row.content || '',
      status: row.status as Message['status'],
      timestamp: row.timestamp
    }));
  },

  async add(message: Omit<Message, 'id'>): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        contact_id: message.contactId,
        direction: message.direction,
        type: message.type,
        content: message.content,
        status: message.status,
        timestamp: message.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      contactId: data.contact_id,
      direction: data.direction,
      type: data.type,
      content: data.content,
      status: data.status,
      timestamp: data.timestamp
    };
  },

  async update(id: number, updates: Partial<Message>): Promise<boolean> {
    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.content !== undefined) payload.content = updates.content;

    const { error } = await supabase.from('messages').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating message ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting message ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }
};
