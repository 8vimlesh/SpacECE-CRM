import { supabase } from '../lib/supabase';
import type { Contact } from '../db/database';

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching contacts from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      linkedStudentClass: row.linked_student_class || '',
      tags: row.tags || [],
      status: row.status as Contact['status'],
      optedOut: row.opted_out ?? false,
      createdAt: row.created_at
    }));
  },

  async add(contact: Omit<Contact, 'id'>): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name: contact.name,
        phone: contact.phone,
        linked_student_class: contact.linkedStudentClass,
        tags: contact.tags,
        status: contact.status,
        opted_out: contact.optedOut,
        created_at: contact.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding contact to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      linkedStudentClass: data.linked_student_class,
      tags: data.tags,
      status: data.status,
      optedOut: data.opted_out,
      createdAt: data.created_at
    };
  },

  async bulkAdd(contactsList: Omit<Contact, 'id'>[]): Promise<boolean> {
    const records = contactsList.map((c) => ({
      name: c.name,
      phone: c.phone,
      linked_student_class: c.linkedStudentClass,
      tags: c.tags,
      status: c.status,
      opted_out: c.optedOut,
      created_at: c.createdAt || new Date().toISOString()
    }));

    const { error } = await supabase.from('contacts').insert(records);
    if (error) {
      console.error('Error bulk adding contacts to Supabase:', error);
      return false;
    }
    return true;
  },

  async update(id: number, updates: Partial<Contact>): Promise<boolean> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.linkedStudentClass !== undefined) payload.linked_student_class = updates.linkedStudentClass;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.optedOut !== undefined) payload.opted_out = updates.optedOut;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('contacts').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating contact ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting contact ${id} from Supabase:`, error);
      return false;
    }
    return true;
  },

  async clear(): Promise<boolean> {
    const { error } = await supabase.from('contacts').delete().gte('id', 0);
    if (error) {
      console.error('Error clearing contacts table in Supabase:', error);
      return false;
    }
    return true;
  },

  async bulkDelete(ids: number[]): Promise<boolean> {
    const { error } = await supabase.from('contacts').delete().in('id', ids);
    if (error) {
      console.error('Error bulk deleting contacts from Supabase:', error);
      return false;
    }
    return true;
  }
};
