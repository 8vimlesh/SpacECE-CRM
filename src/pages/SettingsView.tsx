import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { whatsappSettingsService } from '../services/whatsappSettingsService';
import { sendWhatsAppMessage, sendPersonalWhatsAppAlert } from '../services/whatsappService';
import type { WhatsAppSettings } from '../db/database';
import {
  ShieldAlert,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Unplug,
  Info,
  Send,
  Zap,
  ExternalLink,
  MessageSquare,
  Globe,
  BellRing,
  Smartphone,
  Sparkles
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { data: settingsList, refetch: refetchSettings } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const settings = settingsList?.[0];

  // Gateway Provider State
  const [gatewayProvider, setGatewayProvider] = useState<'EASY_GATEWAY' | 'DIRECT_WHATSAPP_WEB' | 'META_CLOUD' | 'SIMULATOR'>('EASY_GATEWAY');

  // Easy Gateway Form State
  const [easyGatewayUrl, setEasyGatewayUrl] = useState('https://api.callmebot.com/whatsapp.php');
  const [easyApiKey, setEasyApiKey] = useState('');

  // Personal Alerts State
  const [personalPhoneAlerts, setPersonalPhoneAlerts] = useState('');
  const [autoOpenWebWhatsApp, setAutoOpenWebWhatsApp] = useState(true);

  // Meta API Form State
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // UI State
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Test Dispatch Harness State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test outbound WhatsApp message from SpacECE CRM.');
  const [useMetaTemplateTest, setUseMetaTemplateTest] = useState(false);
  const [isTestingDispatch, setIsTestingDispatch] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; diagnosticAdvice?: string } | null>(null);

  // Populate state when settings load
  useEffect(() => {
    if (settings) {
      setGatewayProvider(settings.gatewayProvider || 'EASY_GATEWAY');
      setEasyGatewayUrl(settings.easyGatewayUrl || 'https://api.callmebot.com/whatsapp.php');
      setEasyApiKey(settings.easyApiKey || '');
      setPersonalPhoneAlerts(settings.personalPhoneAlerts || '');
      setAutoOpenWebWhatsApp(settings.autoOpenWebWhatsApp ?? true);

      setDisplayName(settings.displayName || 'Spacece India Foundation');
      setPhoneNumber(settings.phoneNumber || '');
      setPhoneNumberId(settings.phoneNumberId || '');
      setWabaId(settings.wabaId || '');
      setAccessToken(settings.accessToken || '');
    }
  }, [settings]);

  const isConnected = settings?.connectionStatus === 'CONNECTED' || gatewayProvider === 'EASY_GATEWAY' || gatewayProvider === 'DIRECT_WHATSAPP_WEB';

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!displayName.trim()) {
      setValidationError('Display Name is required.');
      return;
    }

    if (gatewayProvider === 'META_CLOUD') {
      if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
        setValidationError('Meta Cloud API requires Phone Number ID, WABA ID, and Access Token.');
        return;
      }
    }

    setIsSaving(true);

    try {
      let connectionStatus: WhatsAppSettings['connectionStatus'] = 'CONNECTED';

      // If Meta Cloud is selected, run verification call
      if (gatewayProvider === 'META_CLOUD') {
        const apiEndpoint = `https://graph.facebook.com/v18.0/${phoneNumberId.trim()}?access_token=${encodeURIComponent(accessToken.trim())}`;
        const response = await fetch(apiEndpoint, { method: 'GET' });
        const data = await response.json();

        if (!response.ok || !data.id) {
          connectionStatus = 'DISCONNECTED';
          setApiError(`Meta API Verification Error: ${data?.error?.message || response.statusText}`);
        }
      }

      const updatedRecord: Partial<WhatsAppSettings> = {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
        connectionStatus,
        gatewayProvider,
        easyGatewayUrl: easyGatewayUrl.trim(),
        easyApiKey: easyApiKey.trim(),
        personalPhoneAlerts: personalPhoneAlerts.trim(),
        autoOpenWebWhatsApp,
        lastChecked: new Date().toLocaleString()
      };

      await whatsappSettingsService.save(updatedRecord);
      await refetchSettings();

      setSuccessMessage(
        gatewayProvider === 'EASY_GATEWAY'
          ? 'Easy Personal WhatsApp Gateway configured and active!'
          : gatewayProvider === 'DIRECT_WHATSAPP_WEB'
          ? 'Direct WhatsApp Web (wa.me) dispatch mode activated!'
          : gatewayProvider === 'META_CLOUD' && connectionStatus === 'CONNECTED'
          ? 'Meta Business API verified & connected successfully!'
          : 'WhatsApp Settings saved successfully.'
      );
    } catch (err: any) {
      setApiError(`Failed to save settings: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Test Outbound Message Dispatch Handler
  const handleTestDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      alert('Please enter a target personal phone number for the test dispatch.');
      return;
    }

    setIsTestingDispatch(true);
    setTestResult(null);

    try {
      const res = await sendWhatsAppMessage({
        recipientPhone: testPhone.trim(),
        messageText: testMessage.trim() || 'Test message from SpacECE CRM',
        templateName: useMetaTemplateTest && gatewayProvider === 'META_CLOUD' ? 'hello_world' : undefined
      });

      if (res.success) {
        setTestResult({
          success: true,
          msg: res.gatewayUsed === 'EASY_GATEWAY'
            ? 'Message dispatched silently in background to your personal WhatsApp!'
            : 'Test message dispatched silently via Meta Cloud API!'
        });
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Failed to dispatch test message',
          diagnosticAdvice: res.diagnosticAdvice
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: `Dispatch error: ${err.message || 'Network failure'}`
      });
    } finally {
      setIsTestingDispatch(false);
    }
  };

  // Disconnect Handler
  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to set status to Disconnected?')) {
      await whatsappSettingsService.save({
        connectionStatus: 'DISCONNECTED',
        lastChecked: new Date().toLocaleString()
      });
      refetchSettings();
      setSuccessMessage('WhatsApp integration set to Disconnected.');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Connection & Outbound Setup</h1>
          <p className="page-subtitle">
            Configure how outbound messages and automations reach your personal WhatsApp and parent contacts
          </p>
        </div>
      </div>

      {/* Prominent Connection Status Card */}
      <div className={`card status-banner-card ${isConnected ? 'connected' : 'disconnected'} mb-6`}>
        <div className="status-banner-left">
          <div className={`status-icon-box ${isConnected ? 'success' : 'warning'}`}>
            {isConnected ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
          </div>
          <div>
            <div className="status-header-row">
              <span className="status-label-title">Dispatch Engine Status:</span>
              <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}>
                {isConnected ? 'Active & Ready' : 'Not Connected'}
              </span>
              <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mode: {gatewayProvider.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="status-description">
              {gatewayProvider === 'EASY_GATEWAY'
                ? 'Easy Personal WhatsApp Gateway (CallMeBot / Webhook API) is selected for automated personal messages.'
                : gatewayProvider === 'DIRECT_WHATSAPP_WEB'
                ? 'Direct WhatsApp Web (wa.me) mode is active. 1-click personal WhatsApp opening with 0 setup.'
                : gatewayProvider === 'META_CLOUD'
                ? `Meta Cloud API setup for "${displayName || 'Spacece India Foundation'}".`
                : 'Simulator Mode active (local database logging).'}
            </p>
            {settings?.lastChecked && (
              <span className="status-timestamp">Last Verified: {settings.lastChecked}</span>
            )}
          </div>
        </div>

        {isConnected && (
          <button className="btn btn-secondary btn-sm" onClick={handleDisconnect}>
            <Unplug size={15} /> Reset Connection
          </button>
        )}
      </div>

      <div className="grid-2">
        {/* Main Configuration Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Outbound WhatsApp Gateway Mode</h3>
              <p className="card-subtitle-text">Choose how outbound messages and automations are dispatched</p>
            </div>
          </div>

          {validationError && (
            <div className="alert alert-warning mb-4">
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {apiError && (
            <div className="alert alert-danger mb-4">
              <ShieldAlert size={20} className="flex-shrink-0" />
              <div>
                <strong>Connection Error</strong>
                <p>{apiError}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success mb-4">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            {/* Display Name */}
            <div className="form-group mb-4">
              <label className="form-label">
                Sender Business / Display Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Spacece India Foundation"
              />
            </div>

            {/* Mode Selection Cards */}
            <div className="form-group mb-6">
              <label className="form-label mb-2">Select WhatsApp Dispatch Mode</label>

              <div className="gateway-selector-grid">
                {/* Option 1: Easy Gateway */}
                <div
                  className={`gateway-card ${gatewayProvider === 'EASY_GATEWAY' ? 'selected' : ''}`}
                  onClick={() => setGatewayProvider('EASY_GATEWAY')}
                >
                  <div className="gateway-card-header">
                    <Zap size={22} className="text-amber" />
                    <span className="gateway-title">Easy Personal Gateway</span>
                    <span className="pill-recommended">Recommended</span>
                  </div>
                  <p className="gateway-desc">
                    Send automated WhatsApp messages to personal numbers via simple API Key (CallMeBot / HTTP API).
                  </p>
                </div>

                {/* Option 2: Direct Web wa.me */}
                <div
                  className={`gateway-card ${gatewayProvider === 'DIRECT_WHATSAPP_WEB' ? 'selected' : ''}`}
                  onClick={() => setGatewayProvider('DIRECT_WHATSAPP_WEB')}
                >
                  <div className="gateway-card-header">
                    <Globe size={22} className="text-teal" />
                    <span className="gateway-title">Direct WhatsApp Web</span>
                    <span className="pill-easy">Zero Setup</span>
                  </div>
                  <p className="gateway-desc">
                    1-Click <code>wa.me</code> dispatch opening WhatsApp Web / App directly on your phone or PC.
                  </p>
                </div>

                {/* Option 3: Meta Business Cloud API */}
                <div
                  className={`gateway-card ${gatewayProvider === 'META_CLOUD' ? 'selected' : ''}`}
                  onClick={() => setGatewayProvider('META_CLOUD')}
                >
                  <div className="gateway-card-header">
                    <ShieldAlert size={22} className="text-indigo" />
                    <span className="gateway-title">Meta Cloud API</span>
                    <span className="pill-pro">Enterprise WABA</span>
                  </div>
                  <p className="gateway-desc">
                    Official Meta WABA API requires Facebook Developer App, WABA ID, Phone ID & Approved Templates.
                  </p>
                </div>

                {/* Option 4: Simulator Mode */}
                <div
                  className={`gateway-card ${gatewayProvider === 'SIMULATOR' ? 'selected' : ''}`}
                  onClick={() => setGatewayProvider('SIMULATOR')}
                >
                  <div className="gateway-card-header">
                    <MessageSquare size={22} className="text-slate" />
                    <span className="gateway-title">CRM Local Simulator</span>
                  </div>
                  <p className="gateway-desc">
                    Log all outbound messages locally in database without sending network API requests.
                  </p>
                </div>
              </div>
            </div>

            {/* Conditional Form Fields based on Mode */}
            {gatewayProvider === 'EASY_GATEWAY' && (
              <div className="mode-config-box mb-6">
                <h4 className="config-box-title">
                  <Sparkles size={18} className="text-amber" />
                  Easy Gateway Configuration (CallMeBot / Custom Gateway)
                </h4>

                <div className="form-group mb-3">
                  <label className="form-label">Gateway API Endpoint URL</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={easyGatewayUrl}
                    onChange={(e) => setEasyGatewayUrl(e.target.value)}
                    placeholder="https://api.callmebot.com/whatsapp.php"
                  />
                  <span className="form-helper-text">
                    CallMeBot endpoint or custom HTTP GET gateway URL.
                  </span>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Personal Gateway API Key</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={easyApiKey}
                    onChange={(e) => setEasyApiKey(e.target.value)}
                    placeholder="e.g. 1234567"
                  />
                  <span className="form-helper-text">
                    Your personal API key generated for your phone number.
                  </span>
                </div>

                <div className="callmebot-instructions-box">
                  <strong>💡 How to get a Free Personal API Key in 30 Seconds:</strong>
                  <ol>
                    <li>Save <code>+34 644 60 76 65</code> (CallMeBot) in your WhatsApp contacts.</li>
                    <li>Send this WhatsApp message to that number: <code>I allow callmebot to send me messages</code></li>
                    <li>You will receive your personal <strong>API Key</strong> immediately in WhatsApp! Paste it above.</li>
                  </ol>
                </div>
              </div>
            )}

            {gatewayProvider === 'DIRECT_WHATSAPP_WEB' && (
              <div className="mode-config-box mb-6">
                <h4 className="config-box-title">
                  <Globe size={18} className="text-teal" />
                  Direct WhatsApp Web Options
                </h4>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoOpenWebWhatsApp}
                    onChange={(e) => setAutoOpenWebWhatsApp(e.target.checked)}
                  />
                  <span>Automatically open WhatsApp Web tab when sending outbound messages or automations</span>
                </label>
              </div>
            )}

            {gatewayProvider === 'META_CLOUD' && (
              <div className="mode-config-box mb-6">
                <h4 className="config-box-title">
                  <ShieldAlert size={18} className="text-indigo" />
                  Meta Cloud API Credentials
                </h4>

                <div className="form-group mb-3">
                  <label className="form-label">WhatsApp Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Phone Number ID</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="104928374928371"
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">WABA ID (WhatsApp Business Account ID)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="928374928374928"
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Permanent Access Token</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showAccessToken ? 'text' : 'password'}
                      className="form-input font-mono pr-10"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAAG....."
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                    >
                      {showAccessToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Personal WhatsApp Alert Numbers */}
            <div className="card-section border-t pt-4 mb-6">
              <h4 className="section-subtitle-title flex-center">
                <BellRing size={18} className="text-rose" />
                Personal WhatsApp Notification Numbers (Team / Admin Alerts)
              </h4>
              <p className="section-subtitle-desc">
                Automations and new lead inquiries will automatically send notification alerts to these personal WhatsApp numbers.
              </p>

              <div className="form-group mt-3">
                <label className="form-label">Personal Phone Numbers (comma-separated)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={personalPhoneAlerts}
                  onChange={(e) => setPersonalPhoneAlerts(e.target.value)}
                  placeholder="+919876543210, +919876543211"
                />
                <span className="form-helper-text">
                  Format: International phone numbers with country code (e.g. +919876543210).
                </span>
              </div>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save & Apply Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Test Harness & Guidance */}
        <div className="space-y-6">
          {/* Live Test Outbound Message Card */}
          <div className="card">
            <div className="card-header">
              <div className="flex-center">
                <Smartphone size={20} className="text-emerald" style={{ marginRight: '8px' }} />
                <h3 className="card-title">Test Personal WhatsApp Dispatch</h3>
              </div>
            </div>
            <p className="card-subtitle-text mb-4">
              Test your configuration by sending a live WhatsApp message directly to your personal phone number now.
            </p>

            <form onSubmit={handleTestDispatch}>
              <div className="form-group mb-3">
                <label className="form-label">Your Personal WhatsApp Number</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Test Message Content</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              {gatewayProvider === 'META_CLOUD' && (
                <div className="form-group mb-4">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useMetaTemplateTest}
                      onChange={(e) => setUseMetaTemplateTest(e.target.checked)}
                    />
                    <span>Send as Meta Approved Template (<code>hello_world</code>) — recommended if recipient has not messaged in last 24h</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-success btn-block"
                disabled={isTestingDispatch}
              >
                {isTestingDispatch ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Dispatching Test...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Test Message to Personal WhatsApp</span>
                  </>
                )}
              </button>
            </form>

            {testResult && (
              <div className={`alert ${testResult.success ? 'alert-success' : 'alert-warning'} mt-4`}>
                <div>
                  <strong>{testResult.success ? 'Dispatch Success!' : 'Dispatch Notice'}</strong>
                  <p className="text-sm mt-1">{testResult.msg}</p>

                  {testResult.diagnosticAdvice && (
                    <div className="callmebot-instructions-box mt-3" style={{ color: '#92400e', backgroundColor: '#fffbeb' }}>
                      <strong>⚠️ Action Required to Receive Message:</strong>
                      <p className="mt-1" style={{ fontSize: '0.8125rem', lineHeight: '1.4' }}>
                        {testResult.diagnosticAdvice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Troubleshooting Guide */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Setup Guidance</h3>
            </div>

            <div className="guide-box">
              <div className="guide-item">
                <HelpCircle className="guide-icon" size={20} />
                <div>
                  <strong>Which mode should I choose?</strong>
                  <p>
                    For quick testing and automated messages to personal WhatsApp, choose <strong>Easy Personal Gateway</strong> with a free CallMeBot key, or <strong>Direct WhatsApp Web</strong> for zero-setup 1-click browser messaging.
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <Info className="guide-icon text-teal" size={20} />
                <div>
                  <strong>Receiving Personal WhatsApp Automations</strong>
                  <p>
                    Enter your personal phone number in the <strong>Personal WhatsApp Notification Numbers</strong> field to automatically get alerts whenever a new inquiry or automation triggers in the CRM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-4 { margin-top: 1rem; }
        .pt-4 { padding-top: 1rem; }
        .font-mono { font-family: 'Fira Code', monospace; }
        .pr-10 { padding-right: 2.5rem; }
        .required-star { color: #e11d48; }
        .flex-center { display: flex; align-items: center; }
        .inline-flex { display: inline-flex; }
        .border-t { border-top: 1px solid var(--slate-200); }

        .gateway-selector-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.875rem;
        }

        .gateway-card {
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #ffffff;
        }

        .gateway-card:hover {
          border-color: var(--primary-400);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .gateway-card.selected {
          border-color: var(--primary-600);
          background-color: #f0f9ff;
          box-shadow: 0 0 0 2px var(--primary-200);
        }

        .gateway-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }

        .gateway-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--navy-900);
        }

        .gateway-desc {
          font-size: 0.75rem;
          color: var(--slate-500);
          line-height: 1.35;
        }

        .pill-recommended {
          background-color: #fef3c7;
          color: #b45309;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          margin-left: auto;
        }

        .pill-easy {
          background-color: #ccfbf1;
          color: #0f766e;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          margin-left: auto;
        }

        .pill-pro {
          background-color: #e0e7ff;
          color: #4338ca;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          margin-left: auto;
        }

        .mode-config-box {
          background-color: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
        }

        .config-box-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--navy-900);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .callmebot-instructions-box {
          background-color: #fffbeb;
          border: 1px dashed #fde68a;
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          color: #92400e;
          margin-top: 0.75rem;
        }

        .callmebot-instructions-box ol {
          margin-top: 0.35rem;
          padding-left: 1.2rem;
          line-height: 1.5;
        }

        .callmebot-instructions-box code {
          background-color: #fef3c7;
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.875rem;
          color: var(--navy-800);
          cursor: pointer;
        }

        .status-banner-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: var(--radius-lg);
        }

        .status-banner-card.disconnected {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
        }

        .status-banner-card.connected {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .status-banner-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-icon-box {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .status-icon-box.warning { background-color: #fef3c7; color: #d97706; }
        .status-icon-box.success { background-color: #d1fae5; color: #059669; }

        .status-header-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .status-label-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .status-description {
          font-size: 0.8125rem;
          color: var(--slate-600);
        }

        .status-timestamp {
          display: block;
          font-size: 0.75rem;
          color: var(--slate-400);
          margin-top: 0.25rem;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          background: transparent;
          border: none;
          color: var(--slate-400);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .text-amber { color: #d97706; }
        .text-teal { color: #0d9488; }
        .text-indigo { color: #4f46e5; }
        .text-slate { color: #64748b; }
        .text-rose { color: #e11d48; }
        .text-emerald { color: #059669; }

        .btn-block { width: 100%; display: flex; justify-content: center; }
        .btn-outline-primary {
          border: 1px solid var(--primary-600);
          color: var(--primary-700);
          background: #ffffff;
        }
        .btn-outline-primary:hover {
          background: var(--primary-50);
        }
      `}</style>
    </div>
  );
};
