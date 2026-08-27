import { supabase } from '../lib/supabase';
import { db, type WhatsAppSettings } from '../db/database';

export const whatsappSettingsService = {
  async get(): Promise<WhatsAppSettings | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
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
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings fetch error, fallback to local DB:', e);
    }
    const localList = await db.whatsAppSettings.toArray();
    return localList[0] || null;
  },

  async save(settings: Partial<WhatsAppSettings>): Promise<boolean> {
    const localList = await db.whatsAppSettings.toArray();
    if (localList[0]?.id) {
      await db.whatsAppSettings.update(localList[0].id, settings);
    } else {
      await db.whatsAppSettings.add(settings as WhatsAppSettings);
    }

    try {
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

      const existing = await this.get();
      if (existing?.id) {
        await supabase.from('whatsapp_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('whatsapp_settings').insert([payload]);
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings save skipped/failed:', e);
    }
    return true;
  }
};
