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
  // If explicitly connected and has required Meta credentials
  if (settings.accessToken && settings.phoneNumberId) {
    return 'CONNECTED';
  }
  return 'DISCONNECTED';
}

export const whatsappSettingsService = {
  async get(): Promise<WhatsAppSettings | null> {
    const envOverrides = getEnvSettings();
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
          displayName: row.display_name || 'Spacece India Foundation',
          phoneNumber: row.phone_number || '',
          phoneNumberId: row.phone_number_id || '',
          wabaId: row.waba_id || '',
          accessToken: row.access_token || '',
          connectionStatus: (row.connection_status as WhatsAppSettings['connectionStatus']) || 'DISCONNECTED',
          lastChecked: row.last_checked,
          webhookUrl: row.webhook_url,
          webhookSecret: row.webhook_secret,
          gatewayProvider: 'META_CLOUD',
          personalPhoneAlerts: row.personal_phone_alerts || '',
          autoOpenWebWhatsApp: false
        };
      }
    } catch (e) {
      console.warn('Supabase whatsapp_settings fetch error, fallback to local DB:', e);
    }

    if (!currentSettings) {
      const localList = await db.whatsAppSettings.toArray();
      if (localList[0]) {
        currentSettings = localList[0];
      }
    }

    // If still no settings record exists, create default base
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

    // Merge .env settings where fields are unset in DB
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
    const localList = await db.whatsAppSettings.toArray();
    const updatedSettings: Partial<WhatsAppSettings> = {
      ...settings,
      gatewayProvider: 'META_CLOUD'
    };

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
        gateway_provider: 'META_CLOUD',
        personal_phone_alerts: settings.personalPhoneAlerts,
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
