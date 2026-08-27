import { supabase } from '../lib/supabase';
import type { WhatsAppSettings } from '../db/database';

export const whatsappSettingsService = {
  async get(): Promise<WhatsAppSettings | null> {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      id: row.id,
      displayName: row.display_name || '',
      phoneNumber: row.phone_number || '',
      phoneNumberId: row.phone_number_id || '',
      wabaId: row.waba_id || '',
      accessToken: row.access_token || '',
      connectionStatus: (row.connection_status as WhatsAppSettings['connectionStatus']) || 'DISCONNECTED',
      lastChecked: row.last_checked,
      webhookUrl: row.webhook_url,
      webhookSecret: row.webhook_secret
    };
  },

  async save(settings: Partial<WhatsAppSettings>): Promise<boolean> {
    const existing = await this.get();

    const payload: any = {
      display_name: settings.displayName,
      phone_number: settings.phoneNumber,
      phone_number_id: settings.phoneNumberId,
      waba_id: settings.wabaId,
      access_token: settings.accessToken,
      connection_status: settings.connectionStatus || 'CONNECTED',
      last_checked: new Date().toISOString(),
      webhook_url: settings.webhookUrl,
      webhook_secret: settings.webhookSecret,
      updated_at: new Date().toISOString()
    };

    if (existing?.id) {
      const { error } = await supabase.from('whatsapp_settings').update(payload).eq('id', existing.id);
      if (error) {
        console.error('Error updating whatsapp_settings in Supabase:', error);
        return false;
      }
    } else {
      const { error } = await supabase.from('whatsapp_settings').insert([payload]);
      if (error) {
        console.error('Error inserting whatsapp_settings into Supabase:', error);
        return false;
      }
    }
    return true;
  }
};
