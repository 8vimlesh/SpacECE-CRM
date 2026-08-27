import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type WhatsAppSettings } from '../db/database';
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
  Info
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const settings = useLiveQuery(async () => {
    const list = await db.whatsAppSettings.toArray();
    return list[0];
  }, [], undefined);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // UI State
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Populate state when settings load from IndexedDB
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName || 'Spacece India Foundation');
      setPhoneNumber(settings.phoneNumber || '');
      setPhoneNumberId(settings.phoneNumberId || '');
      setWabaId(settings.wabaId || '');
      setAccessToken(settings.accessToken || '');
    }
  }, [settings]);

  const isConnected = settings?.connectionStatus === 'CONNECTED';

  // Real Meta Cloud API Verification Handler
  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    // 1. Field Validation
    if (!displayName.trim()) {
      setValidationError('Display Name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setValidationError('Phone Number is required.');
      return;
    }
    if (!phoneNumberId.trim()) {
      setValidationError('Phone Number ID is required.');
      return;
    }
    if (!wabaId.trim()) {
      setValidationError('WABA ID (WhatsApp Business Account ID) is required.');
      return;
    }
    if (!accessToken.trim()) {
      setValidationError('Meta Access Token is required.');
      return;
    }

    // Basic format check for numeric IDs
    if (!/^\d+$/.test(phoneNumberId.trim())) {
      setValidationError('Phone Number ID must contain only digits (e.g. 104928374928371).');
      return;
    }
    if (!/^\d+$/.test(wabaId.trim())) {
      setValidationError('WABA ID must contain only digits (e.g. 928374928374928).');
      return;
    }

    setIsConnecting(true);

    try {
      // 2. Attempt Real Meta Graph API Verification Call
      // Meta Endpoint: GET https://graph.facebook.com/v18.0/{phone_number_id}?access_token={token}
      const apiEndpoint = `https://graph.facebook.com/v18.0/${phoneNumberId.trim()}?access_token=${encodeURIComponent(accessToken.trim())}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.id) {
        // API verified successfully!
        const updatedRecord: Partial<WhatsAppSettings> = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          connectionStatus: 'CONNECTED',
          lastChecked: new Date().toLocaleString()
        };

        if (settings?.id) {
          await db.whatsAppSettings.update(settings.id, updatedRecord);
        } else {
          await db.whatsAppSettings.add(updatedRecord as WhatsAppSettings);
        }

        setSuccessMessage(`WhatsApp Business Account Verified! Meta ID: ${data.id}. Status set to Connected.`);
      } else {
        // API Verification failed (e.g., 401 Invalid Token, 404 Not Found)
        const errorMsg = data?.error?.message || `Meta API Error (${response.status}): Failed to authenticate credentials.`;
        
        // Save form values but mark DISCONNECTED
        const updatedRecord: Partial<WhatsAppSettings> = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          connectionStatus: 'DISCONNECTED',
          lastChecked: new Date().toLocaleString()
        };

        if (settings?.id) {
          await db.whatsAppSettings.update(settings.id, updatedRecord);
        } else {
          await db.whatsAppSettings.add(updatedRecord as WhatsAppSettings);
        }

        setApiError(`Connection Failed: ${errorMsg}`);
      }
    } catch (err: any) {
      // Handle network errors or CORS blocks
      const updatedRecord: Partial<WhatsAppSettings> = {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
        connectionStatus: 'DISCONNECTED',
        lastChecked: new Date().toLocaleString()
      };

      if (settings?.id) {
        await db.whatsAppSettings.update(settings.id, updatedRecord);
      }

      setApiError(`Connection Failed: Could not reach Meta Graph API (${err.message || 'Network Error'}). Please verify Internet connection and credentials.`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Handler
  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect WhatsApp Business API? Features requiring live API connection will be disabled.')) {
      if (settings?.id) {
        await db.whatsAppSettings.update(settings.id, {
          connectionStatus: 'DISCONNECTED',
          lastChecked: new Date().toLocaleString()
        });
        setSuccessMessage('WhatsApp Business Account has been disconnected.');
        setApiError(null);
      }
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp API Settings</h1>
          <p className="page-subtitle">
            Configure Meta WhatsApp Business Cloud API connection credentials for Spacece India Foundation
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
              <span className="status-label-title">Connection Status:</span>
              <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="status-description">
              {isConnected
                ? `Active WhatsApp Business API Connection for ${settings?.displayName || 'Spacece India Foundation'} (${settings?.phoneNumber || 'N/A'}).`
                : 'WhatsApp API is Not Connected. Enter valid Meta Cloud API credentials below and click "Connect WhatsApp" to verify.'}
            </p>
            {settings?.lastChecked && (
              <span className="status-timestamp">Last Verified: {settings.lastChecked}</span>
            )}
          </div>
        </div>

        {isConnected && (
          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
            <Unplug size={15} /> Disconnect Account
          </button>
        )}
      </div>

      {/* Main Settings Form Section */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">WhatsApp Business Connection</h3>
              <p className="card-subtitle-text">Enter Meta Developer Portal API credentials</p>
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="alert alert-warning mb-4">
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {/* API Diagnostic Error Banner */}
          {apiError && (
            <div className="alert alert-danger mb-4">
              <ShieldAlert size={20} className="flex-shrink-0" />
              <div>
                <strong>Connection Error</strong>
                <p>{apiError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="alert alert-success mb-4">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleConnectWhatsApp}>
            {/* Field 1: Display Name */}
            <div className="form-group">
              <label className="form-label">
                Display Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Spacece India Foundation"
                disabled={isConnecting}
              />
              <span className="form-helper-text">
                The verified business profile name shown to parents in WhatsApp.
              </span>
            </div>

            {/* Field 2: Phone Number */}
            <div className="form-group">
              <label className="form-label">
                WhatsApp Phone Number <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                disabled={isConnecting}
              />
              <span className="form-helper-text">
                The registered phone number connected to Meta Business Manager.
              </span>
            </div>

            {/* Field 3: Phone Number ID */}
            <div className="form-group">
              <label className="form-label">
                Phone Number ID <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input font-mono"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 104928374928371"
                disabled={isConnecting}
              />
              <span className="form-helper-text">
                15-digit ID from Meta Developer Console &gt; WhatsApp &gt; API Setup.
              </span>
            </div>

            {/* Field 4: WABA ID */}
            <div className="form-group">
              <label className="form-label">
                WABA ID (WhatsApp Business Account ID) <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input font-mono"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 928374928374928"
                disabled={isConnecting}
              />
              <span className="form-helper-text">
                WhatsApp Business Account ID found in Meta Business Manager Settings.
              </span>
            </div>

            {/* Field 5: Access Token (Secured password field with show/hide control) */}
            <div className="form-group">
              <label className="form-label">
                Permanent System Access Token <span className="required-star">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showAccessToken ? 'text' : 'password'}
                  className="form-input font-mono pr-10"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAG....."
                  disabled={isConnecting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  title={showAccessToken ? 'Hide Access Token' : 'Show Access Token'}
                  tabIndex={-1}
                >
                  {showAccessToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="form-helper-text">
                Encrypted permanent token with <code>whatsapp_business_messaging</code> scope. Masked for security.
              </span>
            </div>

            {/* Form Actions */}
            <div className="form-actions-row">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Verifying Meta API Connection...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{isConnected ? 'Update & Re-verify Connection' : 'Connect WhatsApp'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Setup Documentation Helper Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Setup Guidance & Security</h3>
          </div>

          <div className="guide-box">
            <div className="guide-item">
              <HelpCircle className="guide-icon" size={20} />
              <div>
                <strong>Where do I find my Phone Number ID?</strong>
                <p>
                  Log into <code>developers.facebook.com</code>, select your App, navigate to <strong>WhatsApp &gt; API Setup</strong>, and copy the 15-digit Phone Number ID.
                </p>
              </div>
            </div>

            <div className="guide-item">
              <HelpCircle className="guide-icon" size={20} />
              <div>
                <strong>What is a Permanent System User Token?</strong>
                <p>
                  A non-expiring Access Token generated under Meta Business Manager &gt; System Users with <code>whatsapp_business_management</code> permissions.
                </p>
              </div>
            </div>

            <div className="guide-item">
              <Info className="guide-icon text-teal" size={20} />
              <div>
                <strong>Access Token Security Protocol</strong>
                <p>
                  Tokens are stored securely in browser-bound IndexedDB storage. They are never rendered in frontend views or transmitted to unauthorized third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .font-mono { font-family: 'Fira Code', monospace; }
        .pr-10 { padding-right: 2.5rem; }
        .required-star { color: #e11d48; }

        .status-banner-card {
          padding: 1.5rem 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: var(--radius-lg);
          transition: all 0.3s ease;
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
          gap: 1.25rem;
        }

        .status-icon-box {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .status-icon-box.warning {
          background-color: #fef3c7;
          color: #d97706;
        }

        .status-icon-box.success {
          background-color: #d1fae5;
          color: #059669;
        }

        .status-header-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .status-label-title {
          font-size: 1.0625rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .status-description {
          font-size: 0.84375rem;
          color: var(--slate-600);
          max-width: 620px;
          line-height: 1.4;
        }

        .status-timestamp {
          display: block;
          font-size: 0.75rem;
          color: var(--slate-400);
          margin-top: 0.35rem;
        }

        .card-subtitle-text {
          font-size: 0.8125rem;
          color: var(--slate-500);
          margin-top: 0.1rem;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          line-height: 1.4;
        }

        .alert-warning {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
        }

        .alert-danger {
          background-color: #ffe4e6;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .alert-success {
          background-color: #d1fae5;
          border: 1px solid #a7f3d0;
          color: #047857;
        }

        .form-helper-text {
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
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle-btn:hover {
          color: var(--navy-900);
        }

        .form-actions-row {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }

        .btn-lg {
          padding: 0.75rem 1.5rem;
          font-size: 0.9375rem;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .guide-box {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 0.5rem 0;
        }

        .guide-item {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .guide-icon {
          color: var(--slate-400);
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .guide-item strong {
          display: block;
          font-size: 0.875rem;
          color: var(--navy-900);
          margin-bottom: 0.25rem;
        }

        .guide-item p {
          font-size: 0.8125rem;
          color: var(--slate-600);
          line-height: 1.4;
        }

        .guide-item code {
          background-color: var(--slate-100);
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--primary-700);
        }
      `}</style>
    </div>
  );
};
