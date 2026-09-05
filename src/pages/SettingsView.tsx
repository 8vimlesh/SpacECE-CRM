import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { whatsappSettingsService } from '../services/whatsappSettingsService';
import { sendWhatsAppMessage } from '../services/whatsappService';
import type { WhatsAppSettings } from '../db/database';
import {
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Unplug,
  Send,
  ExternalLink,
  BellRing,
  Smartphone,
  Key,
  Hash,
  Phone,
  Building2,
  FileCode2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { data: settingsList, refetch: refetchSettings } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const settings = settingsList?.[0];

  // Personal Alerts State
  const [personalPhoneAlerts, setPersonalPhoneAlerts] = useState('');

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
  const [useMetaTemplateTest, setUseMetaTemplateTest] = useState(true);
  const [isTestingDispatch, setIsTestingDispatch] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; diagnosticAdvice?: string } | null>(null);

  // Populate state when settings load (synced during render when settings arrive)
  const [initializedSettingsKey, setInitializedSettingsKey] = useState<string | number | null>(null);
  const currentSettingsKey = settings?.id ?? (settings ? 'loaded' : null);
  if (settings && initializedSettingsKey !== currentSettingsKey) {
    setInitializedSettingsKey(currentSettingsKey);
    setPersonalPhoneAlerts(settings.personalPhoneAlerts || '');
    setDisplayName(settings.displayName || 'Spacece India Foundation');
    setPhoneNumber(settings.phoneNumber || '');
    setPhoneNumberId(settings.phoneNumberId || '');
    setWabaId(settings.wabaId || '');
    setAccessToken(settings.accessToken || '');
  }

  const isConnected = settings?.connectionStatus === 'CONNECTED' && Boolean(settings?.accessToken && settings?.phoneNumberId);

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

    if (!phoneNumberId.trim() || !accessToken.trim()) {
      setValidationError('Meta Cloud API requires both Phone Number ID and Permanent Access Token.');
      return;
    }

    setIsSaving(true);

    try {
      let connectionStatus: WhatsAppSettings['connectionStatus'] = 'CONNECTED';
      let metaErrorMsg: string | null = null;

      // Meta Cloud verification call — routed through our own /api/whatsapp-verify
      // serverless function rather than calling graph.facebook.com directly from
      // the browser, since Meta does not send CORS headers for browser-origin
      // requests and a direct fetch() here would fail regardless of whether the
      // credentials are valid.
      try {
        const response = await fetch('/api/whatsapp-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: phoneNumberId.trim(),
            accessToken: accessToken.trim()
          })
        });
        const data = await response.json();

        if (!response.ok || !data.id) {
          connectionStatus = 'DISCONNECTED';
          metaErrorMsg = `Meta API Verification Warning: ${data?.error?.message || response.statusText || 'Invalid credentials'}`;
        }
      } catch (fetchErr: any) {
        connectionStatus = 'DISCONNECTED';
        metaErrorMsg = `Meta API Network Error: ${fetchErr.message || 'Could not verify Meta API endpoint'}`;
      }

      const updatedRecord: Partial<WhatsAppSettings> = {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
        connectionStatus,
        gatewayProvider: 'META_CLOUD',
        personalPhoneAlerts: personalPhoneAlerts.trim(),
        lastChecked: new Date().toLocaleString()
      };

      await whatsappSettingsService.save(updatedRecord);
      await refetchSettings();

      if (metaErrorMsg) {
        setApiError(metaErrorMsg);
      } else if (connectionStatus === 'CONNECTED') {
        setSuccessMessage('Meta WhatsApp Cloud API verified and connected successfully!');
      } else {
        setSuccessMessage('Credentials saved in CRM database.');
      }
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
        templateName: useMetaTemplateTest ? 'hello_world' : undefined
      });

      if (res.success) {
        setTestResult({
          success: true,
          msg: 'Test message dispatched successfully via official Meta WhatsApp Cloud API!'
        });
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Failed to dispatch test message via Meta API',
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
    if (window.confirm('Are you sure you want to disconnect Meta Cloud API?')) {
      await whatsappSettingsService.save({
        connectionStatus: 'DISCONNECTED',
        lastChecked: new Date().toLocaleString()
      });
      refetchSettings();
      setSuccessMessage('Meta WhatsApp integration set to Disconnected.');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meta WhatsApp Cloud API Configuration</h1>
          <p className="page-subtitle">
            Manage your official Meta Business Cloud API connection for messaging parents and automated notifications
          </p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`card status-banner-card ${isConnected ? 'connected' : 'disconnected'} mb-6`}>
        <div className="status-banner-left">
          <div className={`status-icon-box ${isConnected ? 'success' : 'warning'}`}>
            {isConnected ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
          </div>
          <div>
            <div className="status-header-row">
              <span className="status-label-title">Meta Cloud API Status:</span>
              <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}>
                {isConnected ? 'Connected & Ready' : 'Disconnected'}
              </span>
              <span className="badge badge-info" style={{ letterSpacing: '0.5px' }}>
                META CLOUD API
              </span>
            </div>
            <p className="status-description">
              {isConnected
                ? `Connected to WhatsApp Business Account for "${displayName || 'Spacece India Foundation'}"`
                : 'Meta WhatsApp Cloud API credentials are not yet verified. Outgoing messages will be logged locally until connected.'}
            </p>
            {settings?.lastChecked && (
              <span className="status-timestamp">Last Checked: {settings.lastChecked}</span>
            )}
          </div>
        </div>

        {isConnected && (
          <button className="btn btn-secondary btn-sm" onClick={handleDisconnect}>
            <Unplug size={15} /> Disconnect
          </button>
        )}
      </div>

      <div className="grid-2">
        {/* Main Configuration Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Meta WhatsApp Cloud API Credentials</h3>
              <p className="card-subtitle-text">
                Credentials can also be loaded automatically from your <code>.env</code> file
              </p>
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
                <strong>Meta Verification Notice</strong>
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
              <label className="form-label flex-center">
                <Building2 size={16} className="text-indigo" style={{ marginRight: '6px' }} />
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

            {/* Phone Number */}
            <div className="form-group mb-4">
              <label className="form-label flex-center">
                <Phone size={16} className="text-emerald" style={{ marginRight: '6px' }} />
                WhatsApp Registered Phone Number
              </label>
              <input
                type="text"
                className="form-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
              />
              <span className="form-helper-text">
                The business phone number registered on Meta Business Manager.
              </span>
            </div>

            {/* Phone Number ID */}
            <div className="form-group mb-4">
              <label className="form-label flex-center">
                <Hash size={16} className="text-indigo" style={{ marginRight: '6px' }} />
                Phone Number ID <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input font-mono"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 104928374928371"
              />
              <span className="form-helper-text">
                Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; Phone Number ID (or <code>VITE_WHATSAPP_PHONE_NUMBER_ID</code>).
              </span>
            </div>

            {/* WABA ID */}
            <div className="form-group mb-4">
              <label className="form-label flex-center">
                <Hash size={16} className="text-indigo" style={{ marginRight: '6px' }} />
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                className="form-input font-mono"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 928374928374928"
              />
              <span className="form-helper-text">
                Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; WhatsApp Business Account ID.
              </span>
            </div>

            {/* Permanent Access Token */}
            <div className="form-group mb-5">
              <label className="form-label flex-center">
                <Key size={16} className="text-amber" style={{ marginRight: '6px' }} />
                Permanent System User Access Token <span className="required-star">*</span>
              </label>
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
                  title={showAccessToken ? 'Hide token' : 'Show token'}
                >
                  {showAccessToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="form-helper-text">
                Generated via Meta Business Manager &gt; System Users with <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code> permissions.
              </span>
            </div>

            {/* Team / Admin Alert Numbers */}
            <div className="card-section border-t pt-4 mb-6">
              <h4 className="section-subtitle-title flex-center">
                <BellRing size={18} className="text-rose" />
                Team &amp; Admin WhatsApp Notification Numbers
              </h4>
              <p className="section-subtitle-desc">
                Automations and new lead inquiries will dispatch automated WhatsApp alerts to these numbers via Meta Cloud API.
              </p>

              <div className="form-group mt-3">
                <label className="form-label">Phone Numbers (comma-separated with country code)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={personalPhoneAlerts}
                  onChange={(e) => setPersonalPhoneAlerts(e.target.value)}
                  placeholder="+919876543210, +919876543211"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Verifying &amp; Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save &amp; Verify Meta Connection</span>
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
                <h3 className="card-title">Test Meta Cloud API Dispatch</h3>
              </div>
            </div>
            <p className="card-subtitle-text mb-4">
              Test your Meta Cloud API connection by sending a live message directly to a target WhatsApp number.
            </p>

            <form onSubmit={handleTestDispatch}>
              <div className="form-group mb-3">
                <label className="form-label">Recipient WhatsApp Number</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Message Content</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <div className="form-group mb-4">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useMetaTemplateTest}
                    onChange={(e) => setUseMetaTemplateTest(e.target.checked)}
                  />
                  <span>
                    Send as Pre-Approved Meta Template (<code>hello_world</code>)
                  </span>
                </label>
                <span className="form-helper-text" style={{ marginLeft: '24px' }}>
                  Recommended: Bypasses Meta&apos;s 24-hour customer window restrictions for tests.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-success btn-block"
                disabled={isTestingDispatch}
              >
                {isTestingDispatch ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Dispatching via Meta Graph API...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Test WhatsApp Message</span>
                  </>
                )}
              </button>
            </form>

            {testResult && (
              <div className={`alert ${testResult.success ? 'alert-success' : 'alert-warning'} mt-4`}>
                <div>
                  <strong>{testResult.success ? 'Dispatch Success!' : 'Meta API Notice'}</strong>
                  <p className="text-sm mt-1">{testResult.msg}</p>

                  {testResult.diagnosticAdvice && (
                    <div className="callmebot-instructions-box mt-3" style={{ color: '#92400e', backgroundColor: '#fffbeb' }}>
                      <strong>⚠️ Diagnostic Advice:</strong>
                      <p className="mt-1" style={{ fontSize: '0.8125rem', lineHeight: '1.4' }}>
                        {testResult.diagnosticAdvice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Meta Setup Checklist */}
          <div className="card">
            <div className="card-header">
              <div className="flex-center">
                <FileCode2 size={20} className="text-indigo" style={{ marginRight: '8px' }} />
                <h3 className="card-title">Meta Cloud API Setup Guide</h3>
              </div>
            </div>

            <div className="guide-box">
              <div className="guide-item">
                <span className="step-badge">1</span>
                <div>
                  <strong>Meta for Developers Portal</strong>
                  <p>
                    Go to{' '}
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-semibold inline-flex items-center gap-1"
                    >
                      developers.facebook.com <ExternalLink size={12} />
                    </a>{' '}
                    and select or create a <strong>Business</strong> App.
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <span className="step-badge">2</span>
                <div>
                  <strong>Add WhatsApp Product</strong>
                  <p>
                    In your App Dashboard, add <strong>WhatsApp</strong> and navigate to <strong>API Setup</strong>.
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <span className="step-badge">3</span>
                <div>
                  <strong>Copy IDs &amp; Token to .env or Form</strong>
                  <p>
                    Copy your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong> directly into the fields here or inside your <code>.env</code> file:
                  </p>
                  <pre className="env-snippet-box">
{`VITE_WHATSAPP_PHONE_NUMBER_ID=...
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=...
VITE_WHATSAPP_API_TOKEN=EAAG...`}
                  </pre>
                </div>
              </div>

              <div className="guide-item">
                <span className="step-badge">4</span>
                <div>
                  <strong>Test Recipient Whitelist</strong>
                  <p>
                    While in Meta Test/Development Mode, add your test recipient phone number under <em>&quot;To&quot; phone number list</em> in the Meta API Setup tab.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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

        .password-toggle-btn:hover {
          color: var(--navy-800);
        }

        .step-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--primary-600);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .env-snippet-box {
          background-color: #0f172a;
          color: #38bdf8;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          overflow-x: auto;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.875rem;
          color: var(--navy-800);
          cursor: pointer;
        }

        .btn-block { width: 100%; display: flex; justify-content: center; }
        .text-amber { color: #d97706; }
        .text-indigo { color: #4f46e5; }
        .text-rose { color: #e11d48; }
        .text-emerald { color: #059669; }
      `}</style>
    </div>
  );
};
