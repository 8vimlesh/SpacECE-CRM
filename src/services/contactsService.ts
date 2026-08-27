import { supabase } from '../lib/supabase';
import { db, type Contact } from '../db/database';

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          linkedStudentClass: row.linked_student_class || '',
          tags: row.tags || [],
          status: row.status as Contact['status'],
          optedOut: row.opted_out ?? false,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch error, fallback to local DB:', e);
    }
    return await db.contacts.toArray();
  },

  async add(contact: Omit<Contact, 'id'>): Promise<Contact | null> {
    const localId = await db.contacts.add({
      name: contact.name,
      phone: contact.phone,
      linkedStudentClass: contact.linkedStudentClass,
      tags: contact.tags,
      status: contact.status,
      optedOut: contact.optedOut,
      createdAt: contact.createdAt || new Date().toISOString()
    });

    try {
      await supabase.from('contacts').insert({
        name: contact.name,
        phone: contact.phone,
        linked_student_class: contact.linkedStudentClass,
        tags: contact.tags,
        status: contact.status,
        opted_out: contact.optedOut,
        created_at: contact.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase insert skipped/failed:', e);
    }

    return (await db.contacts.get(localId as number)) || null;
  },

  async bulkAdd(contactsList: Omit<Contact, 'id'>[]): Promise<boolean> {
    await db.contacts.bulkAdd(contactsList.map((c) => ({
      name: c.name,
      phone: c.phone,
      linkedStudentClass: c.linkedStudentClass,
      tags: c.tags,
      status: c.status,
      optedOut: c.optedOut,
      createdAt: c.createdAt || new Date().toISOString()
    })));

    try {
      const records = contactsList.map((c) => ({
        name: c.name,
        phone: c.phone,
        linked_student_class: c.linkedStudentClass,
        tags: c.tags,
        status: c.status,
        opted_out: c.optedOut,
        created_at: c.createdAt || new Date().toISOString()
      }));
      await supabase.from('contacts').insert(records);
    } catch (e) {
      console.warn('Supabase bulk insert skipped/failed:', e);
    }
    return true;
  },

  async update(id: number, updates: Partial<Contact>): Promise<boolean> {
    await db.contacts.update(id, updates);

    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.linkedStudentClass !== undefined) payload.linked_student_class = updates.linkedStudentClass;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.optedOut !== undefined) payload.opted_out = updates.optedOut;
      payload.updated_at = new Date().toISOString();

      await supabase.from('contacts').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase update skipped/failed:', e);
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await db.contacts.delete(id);
    try {
      await supabase.from('contacts').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete skipped/failed:', e);
    }
    return true;
  },

  async clear(): Promise<boolean> {
    await db.contacts.clear();
    try {
      await supabase.from('contacts').delete().gte('id', 0);
    } catch (e) {
      console.warn('Supabase clear skipped/failed:', e);
    }
    return true;
  },

  async bulkDelete(ids: number[]): Promise<boolean> {
    await db.contacts.bulkDelete(ids);
    try {
      await supabase.from('contacts').delete().in('id', ids);
    } catch (e) {
      console.warn('Supabase bulkDelete skipped/failed:', e);
    }
    return true;
  }
};
