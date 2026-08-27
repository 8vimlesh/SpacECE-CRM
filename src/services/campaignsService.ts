import { supabase } from '../lib/supabase';
import { db, type Campaign } from '../db/database';

export const campaignsService = {
  async getAll(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          templateId: row.template_id,
          audienceType: row.audience_type || '',
          status: row.status as Campaign['status'],
          sentCount: row.sent_count ?? 0,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase campaigns fetch error, fallback to local DB:', e);
    }
    return await db.campaigns.toArray();
  },

  async add(campaign: Omit<Campaign, 'id'>): Promise<Campaign | null> {
    const localId = await db.campaigns.add({
      name: campaign.name,
      templateId: campaign.templateId,
      audienceType: campaign.audienceType,
      status: campaign.status,
      sentCount: campaign.sentCount,
      createdAt: campaign.createdAt || new Date().toISOString()
    });

    try {
      await supabase.from('campaigns').insert({
        name: campaign.name,
        template_id: campaign.templateId,
        audience_type: campaign.audienceType,
        status: campaign.status,
        sent_count: campaign.sentCount,
        created_at: campaign.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase campaign insert skipped/failed:', e);
    }

    return (await db.campaigns.get(localId as number)) || null;
  },

  async update(id: number, updates: Partial<Campaign>): Promise<boolean> {
    await db.campaigns.update(id, updates);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.templateId !== undefined) payload.template_id = updates.templateId;
      if (updates.audienceType !== undefined) payload.audience_type = updates.audienceType;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.sentCount !== undefined) payload.sent_count = updates.sentCount;
      payload.updated_at = new Date().toISOString();

      await supabase.from('campaigns').update(payload).eq('id', id);
    } catch (e) {
      console.warn('Supabase campaign update skipped/failed:', e);
    }
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await db.campaigns.delete(id);
    try {
      await supabase.from('campaigns').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase campaign delete skipped/failed:', e);
    }
    return true;
  }
};
