import { supabase } from '../lib/supabase';
import { db, type Inquiry } from '../db/database';

export const inquiriesService = {
  async getAll(): Promise<Inquiry[]> {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          contactId: row.contact_id,
          pipelineStage: row.pipeline_stage as Inquiry['pipelineStage'],
          followUpDate: row.follow_up_date || '',
          notes: row.notes || '',
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase inquiries fetch error, fallback to local DB:', e);
    }
    return await db.inquiries.toArray();
  },

  async add(inquiry: Omit<Inquiry, 'id'>): Promise<Inquiry | null> {
    const localId = await db.inquiries.add({
      contactId: inquiry.contactId,
      pipelineStage: inquiry.pipelineStage,
      followUpDate: inquiry.followUpDate,
      notes: inquiry.notes,
      createdAt: inquiry.createdAt || new Date().toISOString()
    });

    try {
      await supabase.from('inquiries').insert({
        contact_id: inquiry.contactId,
        pipeline_stage: inquiry.pipelineStage,
        follow_up_date: inquiry.followUpDate,
        notes: inquiry.notes,
        created_at: inquiry.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase insert skipped/failed:', e);
    }

    return (await db.inquiries.get(localId as number)) || null;
  },

  async update(id: number, updates: Partial<Inquiry>): Promise<boolean> {
    await db.inquiries.update(id, updates);

    try {
      const payload: any = {};
      if (updates.contactId !== undefined) payload.contact_id = updates.contactId;
      if (updates.pipelineStage !== undefined) payload.pipeline_stage = updates.pipelineStage;
      if (updates.followUpDate !== undefined) payload.follow_up_date = updates.followUpDate;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      payload.updated_at = new Date().toISOString();

      await supabase.from('inquiries').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase update skipped/failed:', e);
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await db.inquiries.delete(id);
    try {
      await supabase.from('inquiries').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete skipped/failed:', e);
    }
    return true;
  }
};
