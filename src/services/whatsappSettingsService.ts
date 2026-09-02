import { supabase } from '../lib/supabase';
import { db, type WhatsAppSettings } from '../db/database';

export const whatsappSettingsService = {
  async get(): Promise<WhatsAppSettings | null> {
    let localRecord: WhatsAppSettings | null = null;
    try {
      const localList = await db.whatsAppSettings.toArray();
      localRecord = localList[0] || null;
    } catch (e) {
      console.warn('Dexie read error in whatsappSettingsService:', e);
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          id: localRecord?.id || row.id,
          displayName: row.display_name ?? localRecord?.displayName ?? 'Spacece India Foundation',
          phoneNumber: row.phone_number ?? localRecord?.phoneNumber ?? '',
          phoneNumberId: row.phone_number_id ?? localRecord?.phoneNumberId ?? '',
          wabaId: row.waba_id ?? localRecord?.wabaId ?? '',
          accessToken: row.access_token ?? localRecord?.accessToken ?? '',
          connectionStatus: (row.connection_status as WhatsAppSettings['connectionStatus']) || localRecord?.connectionStatus || 'CONNECTED',
          lastChecked: row.last_checked || localRecord?.lastChecked,
          webhookUrl: row.webhook_url || localRecord?.webhookUrl,
          webhookSecret: row.webhook_secret || localRecord?.webhookSecret,
          gatewayProvider: row.gateway_provider || localRecord?.gatewayProvider || 'EASY_GATEWAY',
          easyGatewayUrl: row.easy_gateway_url || localRecord?.easyGatewayUrl || 'https://api.callmebot.com/whatsapp.php',
          easyApiKey: row.easy_api_key || localRecord?.easyApiKey || '',
          personalPhoneAlerts: row.personal_phone_alerts || localRecord?.personalPhoneAlerts || '',
          autoOpenWebWhatsApp: row.auto_open_web_whatsapp ?? localRecord?.autoOpenWebWhatsApp ?? true
        };
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings fetch warning, using local DB:', e);
    }
    return localRecord;
  },

  async save(settings: Partial<WhatsAppSettings>): Promise<boolean> {
    let currentId: number | undefined;
    try {
      const localList = await db.whatsAppSettings.toArray();
      if (localList[0]?.id) {
        currentId = localList[0].id;
        await db.whatsAppSettings.update(currentId, settings);
      } else {
        const newId = await db.whatsAppSettings.add({
          displayName: 'Spacece India Foundation',
          phoneNumber: '',
          phoneNumberId: '',
          wabaId: '',
          accessToken: '',
          connectionStatus: 'CONNECTED',
          gatewayProvider: 'EASY_GATEWAY',
          easyGatewayUrl: 'https://api.callmebot.com/whatsapp.php',
          easyApiKey: '',
          personalPhoneAlerts: '',
          autoOpenWebWhatsApp: true,
          ...settings
        } as WhatsAppSettings);
        currentId = Number(newId);
      }
    } catch (e) {
      console.warn('Local DB save error in whatsappSettingsService:', e);
    }

    try {
      const fullPayload: any = {
        display_name: settings.displayName,
        phone_number: settings.phoneNumber,
        phone_number_id: settings.phoneNumberId,
        waba_id: settings.wabaId,
        access_token: settings.accessToken,
        connection_status: settings.connectionStatus || 'CONNECTED',
        last_checked: new Date().toISOString(),
        webhook_url: settings.webhookUrl,
        webhook_secret: settings.webhookSecret,
        gateway_provider: settings.gatewayProvider,
        easy_gateway_url: settings.easyGatewayUrl,
        easy_api_key: settings.easyApiKey,
        personal_phone_alerts: settings.personalPhoneAlerts,
        auto_open_web_whatsapp: settings.autoOpenWebWhatsApp,
        updated_at: new Date().toISOString()
      };

      // Clean undefined fields from fullPayload
      Object.keys(fullPayload).forEach((key) => fullPayload[key] === undefined && delete fullPayload[key]);

      const existingSupabase = await supabase.from('whatsapp_settings').select('id').limit(1);
      const supabaseId = existingSupabase.data?.[0]?.id;

      let res;
      if (supabaseId) {
        res = await supabase.from('whatsapp_settings').update(fullPayload).eq('id', supabaseId);
      } else {
        res = await supabase.from('whatsapp_settings').insert([fullPayload]);
      }

      // If full payload fails due to missing custom columns on Supabase schema, try base payload fallback
      if (res?.error) {
        const basePayload: any = {
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
        Object.keys(basePayload).forEach((key) => basePayload[key] === undefined && delete basePayload[key]);

        if (supabaseId) {
          await supabase.from('whatsapp_settings').update(basePayload).eq('id', supabaseId);
        } else {
          await supabase.from('whatsapp_settings').insert([basePayload]);
        }
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings save skipped/failed:', e);
    }
    return true;
  }
};
