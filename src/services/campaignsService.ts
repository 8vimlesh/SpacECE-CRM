import { supabase } from '../lib/supabase';
import type { Campaign } from '../db/database';

export const campaignsService = {
  async getAll(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching campaigns from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      templateId: row.template_id,
      audienceType: row.audience_type || '',
      status: row.status as Campaign['status'],
      sentCount: row.sent_count ?? 0,
      createdAt: row.created_at
    }));
  },

  async add(campaign: Omit<Campaign, 'id'>): Promise<Campaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: campaign.name,
        template_id: campaign.templateId,
        audience_type: campaign.audienceType,
        status: campaign.status,
        sent_count: campaign.sentCount,
        created_at: campaign.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding campaign to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      templateId: data.template_id,
      audienceType: data.audience_type,
      status: data.status,
      sentCount: data.sent_count,
      createdAt: data.created_at
    };
  },

  async update(id: number, updates: Partial<Campaign>): Promise<boolean> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.templateId !== undefined) payload.template_id = updates.templateId;
    if (updates.audienceType !== undefined) payload.audience_type = updates.audienceType;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.sentCount !== undefined) payload.sent_count = updates.sentCount;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('campaigns').update(payload).eq('id', id);
    if (error) {
      console.error(`Error updating campaign ${id} in Supabase:`, error);
      return false;
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting campaign ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }
};
