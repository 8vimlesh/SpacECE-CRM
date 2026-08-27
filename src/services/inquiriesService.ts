import { supabase } from '../lib/supabase';
import type { Inquiry } from '../db/database';

export const inquiriesService = {
  async getAll(): Promise<Inquiry[]> {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching inquiries from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      pipelineStage: row.pipeline_stage as Inquiry['pipelineStage'],
      followUpDate: row.follow_up_date || '',
      notes: row.notes || '',
      createdAt: row.created_at
    }));
  },

  async add(inquiry: Omit<Inquiry, 'id'>): Promise<Inquiry | null> {
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        contact_id: inquiry.contactId,
        pipeline_stage: inquiry.pipelineStage,
        follow_up_date: inquiry.followUpDate,
        notes: inquiry.notes,
        created_at: inquiry.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding inquiry to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      contactId: data.contact_id,
      pipelineStage: data.pipeline_stage,
      followUpDate: data.follow_up_date,
      notes: data.notes,
      createdAt: data.created_at
    };
  },

  async update(id: number, updates: Partial<Inquiry>): Promise<boolean> {
    const payload: any = {};
    if (updates.contactId !== undefined) payload.contact_id = updates.contactId;
    if (updates.pipelineStage !== undefined) payload.pipeline_stage = updates.pipelineStage;
    if (updates.followUpDate !== undefined) payload.follow_up_date = updates.followUpDate;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('inquiries').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating inquiry ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting inquiry ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }
};
