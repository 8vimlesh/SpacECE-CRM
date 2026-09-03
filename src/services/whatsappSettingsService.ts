import { supabase } from '../lib/supabase';
import { db, type WhatsAppSettings } from '../db/database';

function getEnvSettings(): Partial<WhatsAppSettings> {
  const envToken = import.meta.env.VITE_WHATSAPP_API_TOKEN || '';
  const envPhoneId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
  const envWabaId = import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || import.meta.env.VITE_WHATSAPP_WABA_ID || '';
  const envPhone = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER || '';

  const defaults: Partial<WhatsAppSettings> = {
    gatewayProvider: 'META_CLOUD'
  };
  if (envToken) defaults.accessToken = envToken;
  if (envPhoneId) defaults.phoneNumberId = envPhoneId;
  if (envWabaId) defaults.wabaId = envWabaId;
  if (envPhone) defaults.phoneNumber = envPhone;

  return defaults;
}

function resolveConnectionStatus(
  settings: WhatsAppSettings
): WhatsAppSettings['connectionStatus'] {
  // Credentials missing entirely -> definitely disconnected.
  if (!settings.accessToken || !settings.phoneNumberId) {
    return 'DISCONNECTED';
  }
  // Credentials are present: trust the status that was actually recorded by
  // the last Meta verification call (see SettingsView's handleSaveSettings),
  // instead of assuming CONNECTED just because the fields are non-empty.
  // Previously this always returned 'CONNECTED' here, which meant a failed
  // verification could still show as "Connected" the next time settings
  // were re-fetched.
  return settings.connectionStatus === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';
}

export const whatsappSettingsService = {
  async get(): Promise<WhatsAppSettings | null> {
    const envOverrides = getEnvSettings();
    let localRecord: WhatsAppSettings | null = null;

    try {
      const localList = await db.whatsAppSettings.toArray();
      localRecord = localList[0] || null;
    } catch (e) {
      console.warn('Dexie read warning in whatsappSettingsService:', e);
    }

    let currentSettings: WhatsAppSettings | null = null;

    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        currentSettings = {
          id: row.id,
          displayName: row.display_name || localRecord?.displayName || 'Spacece India Foundation',
          phoneNumber: row.phone_number || localRecord?.phoneNumber || '',
          phoneNumberId: row.phone_number_id || localRecord?.phoneNumberId || '',
          wabaId: row.waba_id || localRecord?.wabaId || '',
          accessToken: row.access_token || localRecord?.accessToken || '',
          connectionStatus: (row.connection_status as WhatsAppSettings['connectionStatus']) || localRecord?.connectionStatus || 'DISCONNECTED',
          lastChecked: row.last_checked || localRecord?.lastChecked,
          webhookUrl: row.webhook_url || localRecord?.webhookUrl,
          webhookSecret: row.webhook_secret || localRecord?.webhookSecret,
          gatewayProvider: 'META_CLOUD',
          personalPhoneAlerts: row.personal_phone_alerts || localRecord?.personalPhoneAlerts || '',
          autoOpenWebWhatsApp: false
        };
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings fetch warning, using local DB:', e);
    }

    if (!currentSettings && localRecord) {
      currentSettings = localRecord;
    }

    if (!currentSettings) {
      currentSettings = {
        displayName: 'Spacece India Foundation',
        phoneNumber: '',
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        connectionStatus: 'DISCONNECTED',
        gatewayProvider: 'META_CLOUD',
        personalPhoneAlerts: '',
        autoOpenWebWhatsApp: false
      };
    }

    // Merge .env settings where values are present
    const merged: WhatsAppSettings = {
      ...currentSettings,
      accessToken: currentSettings.accessToken || envOverrides.accessToken || '',
      phoneNumberId: currentSettings.phoneNumberId || envOverrides.phoneNumberId || '',
      wabaId: currentSettings.wabaId || envOverrides.wabaId || '',
      phoneNumber: currentSettings.phoneNumber || envOverrides.phoneNumber || '',
      gatewayProvider: 'META_CLOUD'
    };

    merged.connectionStatus = resolveConnectionStatus(merged);
    return merged;
  },

  async save(settings: Partial<WhatsAppSettings>): Promise<boolean> {
    const updatedSettings: Partial<WhatsAppSettings> = {
      ...settings,
      gatewayProvider: 'META_CLOUD'
    };

    try {
      const localList = await db.whatsAppSettings.toArray();
      if (localList[0]?.id) {
        await db.whatsAppSettings.update(localList[0].id, updatedSettings);
      } else {
        await db.whatsAppSettings.add({
          displayName: 'Spacece India Foundation',
          phoneNumber: '',
          phoneNumberId: '',
          wabaId: '',
          accessToken: '',
          connectionStatus: 'DISCONNECTED',
          gatewayProvider: 'META_CLOUD',
          personalPhoneAlerts: '',
          autoOpenWebWhatsApp: false,
          ...updatedSettings
        } as WhatsAppSettings);
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
        gateway_provider: 'META_CLOUD',
        personal_phone_alerts: settings.personalPhoneAlerts,
        updated_at: new Date().toISOString()
      };

      Object.keys(fullPayload).forEach((key) => fullPayload[key] === undefined && delete fullPayload[key]);

      const existingSupabase = await supabase.from('whatsapp_settings').select('id').limit(1);
      const supabaseId = existingSupabase.data?.[0]?.id;

      let res;
      if (supabaseId) {
        res = await supabase.from('whatsapp_settings').update(fullPayload).eq('id', supabaseId);
      } else {
        res = await supabase.from('whatsapp_settings').insert([fullPayload]);
      }

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
