import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Template } from '../db/database';
import { sendWhatsAppMessage } from '../services/whatsappService';
import {
  Send,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react';

export const CampaignsView: React.FC = () => {
  const campaigns = useLiveQuery(() => db.campaigns.toArray(), [], []);
  const templates = useLiveQuery(() => db.templates.toArray(), [], []);
  const contacts = useLiveQuery(() => db.contacts.toArray(), [], []);
  const settings = useLiveQuery(async () => {
    const list = await db.whatsAppSettings.toArray();
    return list[0];
  }, [], undefined);

  // UI State for Wizard
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Audience
  const [audienceMode, setAudienceMode] = useState<'individual' | 'retarget'>('individual');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [retargetCampaignId, setRetargetCampaignId] = useState<number | ''>('');
  const [audienceSearch, setAudienceSearch] = useState('');

  // Step 2 State: Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Step 3 State: Campaign Details & Dispatch
  const [campaignName, setCampaignName] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const isApiConnected = settings?.connectionStatus === 'CONNECTED';

  const templatesMap: Record<number, Template> = {};
  (templates || []).forEach((t) => {
    if (t.id) templatesMap[t.id] = t;
  });

  // Calculate Audience Metrics
  const eligibleContacts = (contacts || []).filter((c) => {
    if (audienceMode === 'individual') {
      return selectedContactIds.includes(c.id!);
    }
    return true; // For retargeting simulation
  });

  const validRecipients = eligibleContacts.filter((c) => !c.optedOut);
  const optedOutExcludedCount = eligibleContacts.filter((c) => c.optedOut).length;

  // Toggle Contact Selection
  const handleToggleContact = (id: number, optedOut: boolean) => {
    if (optedOut) return; // Prevent selecting opted-out contacts
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select All Valid Contacts
  const handleSelectAllValid = () => {
    const validIds = (contacts || []).filter((c) => !c.optedOut).map((c) => c.id!);
    setSelectedContactIds(validIds);
  };

  // Open Wizard Handler
  const openWizard = () => {
    setShowWizardModal(true);
    setWizardStep(1);
    setSelectedContactIds([]);
    setSelectedTemplateId(null);
    setCampaignName(`Broadcast Announcement ${new Date().toLocaleDateString()}`);
    setDispatchError(null);
  };

  // Dispatch Campaign Bulk Send Handler
  const handleSendCampaign = async () => {
    if (!campaignName.trim() || !selectedTemplateId || validRecipients.length === 0) {
      setDispatchError('Required campaign parameters missing.');
      return;
    }

    setIsDispatching(true);
    setDispatchProgress(0);
    setDispatchError(null);

    let sentCount = 0;
    const selectedTemplate = templatesMap[selectedTemplateId];

    // Create campaign record with status 'SENDING'
    const newCampaignId = await db.campaigns.add({
      name: campaignName.trim(),
      templateId: selectedTemplateId,
      audienceType: audienceMode === 'individual' ? `${validRecipients.length} Parents (Individual)` : 'Retargeted Audience',
      status: 'SENDING',
      sentCount: 0,
      createdAt: new Date().toISOString()
    });

    try {
      // Loop through eligible contacts and dispatch messages
      for (let i = 0; i < validRecipients.length; i++) {
        const contact = validRecipients[i];
        
        // Format template message text with parameters
        const formattedMessage = (selectedTemplate?.messageBody || '')
          .replace('{{1}}', contact.name)
          .replace('{{2}}', contact.linkedStudentClass)
          .replace('{{3}}', new Date().toLocaleDateString());

        await sendWhatsAppMessage({
          contactId: contact.id!,
          recipientPhone: contact.phone,
          messageText: formattedMessage
        });

        sentCount++;
        setDispatchProgress(Math.round(((i + 1) / validRecipients.length) * 100));
      }

      // Update campaign status to COMPLETED
      await db.campaigns.update(newCampaignId as number, {
        status: 'COMPLETED',
        sentCount
      });

      setShowWizardModal(false);
    } catch (err: any) {
      await db.campaigns.update(newCampaignId as number, {
        status: 'FAILED',
        sentCount
      });
      setDispatchError(`Campaign Dispatch Error: ${err.message || 'Failed to complete broadcast'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="campaigns-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Broadcast Campaigns</h1>
          <p className="page-subtitle">
            Schedule & dispatch bulk WhatsApp broadcasts for sports events, fee notices, and announcements
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openWizard}>
            <Plus size={16} />
            <span>+ Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns History Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Linked Template</th>
              <th>Target Audience</th>
              <th>Status</th>
              <th>Sent Count</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {campaigns && campaigns.length > 0 ? (
              campaigns.map((camp) => {
                const tpl = templatesMap[camp.templateId];
                return (
                  <tr key={camp.id}>
                    <td>
                      <strong className="campaign-name">{camp.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {tpl ? tpl.name : `Template #${camp.templateId}`}
                      </span>
                    </td>
                    <td>
                      <div className="audience-cell">
                        <Users size={14} className="text-muted" />
                        <span>{camp.audienceType}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          camp.status === 'COMPLETED'
                            ? 'badge-success'
                            : camp.status === 'SENDING' || camp.status === 'SCHEDULED'
                            ? 'badge-info'
                            : camp.status === 'FAILED'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {camp.status === 'COMPLETED' && <CheckCircle2 size={12} />}
                        {camp.status === 'SENDING' && <RefreshCw size={12} className="spin" />}
                        {camp.status}
                      </span>
                    </td>
                    <td>
                      <strong>{camp.sentCount.toLocaleString()} parents</strong>
                    </td>
                    <td>
                      <span className="text-muted">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-4 text-muted">
                  No broadcast campaigns launched yet. Click "+ Create Campaign" to launch a broadcast.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3-STEP CAMPAIGN WIZARD MODAL */}
      {showWizardModal && (
        <div className="modal-overlay">
          <div className="modal-content wizard-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Wizard Header Bar */}
            <div className="modal-header">
              <div>
                <h3>Create Broadcast Campaign (3-Step Wizard)</h3>
                <p className="text-xs text-muted">Spacece WhatsApp Bulk Message Workflow</p>
              </div>
              <button className="modal-close" onClick={() => setShowWizardModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Wizard Stepper Progress Bar */}
            <div className="wizard-stepper-bar">
              <div className={`step-item ${wizardStep >= 1 ? 'active' : ''}`}>
                <span className="step-num">1</span>
                <span className="step-label">Choose Audience</span>
              </div>
              <div className="stepper-line" />
              <div className={`step-item ${wizardStep >= 2 ? 'active' : ''}`}>
                <span className="step-num">2</span>
                <span className="step-label">Choose Template</span>
              </div>
              <div className="stepper-line" />
              <div className={`step-item ${wizardStep >= 3 ? 'active' : ''}`}>
                <span className="step-num">3</span>
                <span className="step-label">Review & Send</span>
              </div>
            </div>

            {/* WIZARD BODY CONTENT */}
            <div className="modal-body wizard-body">
              {/* STEP 1: CHOOSE AUDIENCE */}
              {wizardStep === 1 && (
                <div className="wizard-step-content">
                  <div className="audience-mode-tabs mb-4">
                    <button
                      className={`mode-btn ${audienceMode === 'individual' ? 'active' : ''}`}
                      onClick={() => setAudienceMode('individual')}
                    >
                      <Users size={16} /> Select Individual Contacts
                    </button>
                    <button
                      className={`mode-btn ${audienceMode === 'retarget' ? 'active' : ''}`}
                      onClick={() => setAudienceMode('retarget')}
                    >
                      <RefreshCw size={16} /> Retarget Previous Campaign
                    </button>
                  </div>

                  {audienceMode === 'individual' ? (
                    <>
                      <div className="audience-search-row mb-3">
                        <div className="search-box-flex">
                          <Search size={16} className="search-icon" />
                          <input
                            type="text"
                            placeholder="Filter contacts by name or phone..."
                            value={audienceSearch}
                            onChange={(e) => setAudienceSearch(e.target.value)}
                          />
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={handleSelectAllValid}>
                          Select All Opted-In ({ (contacts || []).filter(c => !c.optedOut).length })
                        </button>
                      </div>

                      <div className="table-container max-h-56 mb-4">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Select</th>
                              <th>Parent Name</th>
                              <th>Phone Number</th>
                              <th>Student Class</th>
                              <th>Opt Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(contacts || [])
                              .filter(c => c.name.toLowerCase().includes(audienceSearch.toLowerCase()) || c.phone.includes(audienceSearch))
                              .map((c) => (
                                <tr key={c.id} className={c.optedOut ? 'row-disabled' : ''}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={selectedContactIds.includes(c.id!)}
                                      disabled={c.optedOut}
                                      onChange={() => handleToggleContact(c.id!, c.optedOut)}
                                    />
                                  </td>
                                  <td>
                                    <strong>{c.name}</strong>
                                  </td>
                                  <td>{c.phone}</td>
                                  <td>{c.linkedStudentClass}</td>
                                  <td>
                                    {c.optedOut ? (
                                      <span className="badge badge-danger">
                                        <ShieldAlert size={12} /> Opted Out (Excluded)
                                      </span>
                                    ) : (
                                      <span className="badge badge-success">
                                        <ShieldCheck size={12} /> Eligible
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="form-group mb-4">
                      <label className="form-label">Select Previous Campaign to Retarget</label>
                      <select
                        className="form-select"
                        value={retargetCampaignId}
                        onChange={(e) => setRetargetCampaignId(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">-- Choose Campaign --</option>
                        {(campaigns || []).map((camp) => (
                          <option key={camp.id} value={camp.id}>
                            {camp.name} ({camp.sentCount} recipients)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Audience Validation Summary Box */}
                  <div className="audience-summary-card">
                    <div className="summary-col">
                      <span className="sum-label">Selected Contacts</span>
                      <span className="sum-val">{selectedContactIds.length}</span>
                    </div>
                    <div className="summary-col">
                      <span className="sum-label">Opted-Out Excluded</span>
                      <span className="sum-val text-rose">{optedOutExcludedCount}</span>
                    </div>
                    <div className="summary-col">
                      <span className="sum-label">Final Eligible Audience</span>
                      <span className="sum-val text-emerald">{validRecipients.length} Parents</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE TEMPLATE */}
              {wizardStep === 2 && (
                <div className="wizard-step-content">
                  <p className="text-sm text-muted mb-4">
                    Select an Meta <strong>APPROVED</strong> WhatsApp message template for broadcasting:
                  </p>

                  <div className="grid-2 mb-4 max-h-64 overflow-y-auto">
                    {(templates || []).map((tpl) => {
                      const isApproved = tpl.status === 'APPROVED';
                      const isSelected = tpl.id === selectedTemplateId;

                      return (
                        <div
                          key={tpl.id}
                          className={`card tpl-select-card ${isSelected ? 'selected' : ''} ${!isApproved ? 'disabled' : ''}`}
                          onClick={() => isApproved && setSelectedTemplateId(tpl.id || null)}
                        >
                          <div className="tpl-card-top">
                            <span className="template-category-badge">{tpl.category}</span>
                            {isApproved ? (
                              <span className="badge badge-success">
                                <CheckCircle2 size={12} /> Approved
                              </span>
                            ) : (
                              <span className="badge badge-warning">
                                <Clock size={12} /> {tpl.status} (Not Selectable)
                              </span>
                            )}
                          </div>
                          <h4 className="tpl-card-name">{tpl.name}</h4>
                          <p className="tpl-card-body">{tpl.messageBody}</p>

                          {isSelected && (
                            <div className="tpl-selected-check">
                              <Check size={16} /> Selected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedTemplateId && templatesMap[selectedTemplateId] && (
                    <div className="template-preview-box">
                      <div className="preview-label">LIVE MESSAGE PREVIEW (SAMPLE RECIPIENT):</div>
                      <p>
                        {(templatesMap[selectedTemplateId].messageBody || '')
                          .replace('{{1}}', 'Rajesh Sharma')
                          .replace('{{2}}', 'Grade 2-B')
                          .replace('{{3}}', new Date().toLocaleDateString())}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: REVIEW & SEND */}
              {wizardStep === 3 && (
                <div className="wizard-step-content">
                  {dispatchError && (
                    <div className="alert alert-danger mb-4">
                      <AlertCircle size={18} />
                      <span>{dispatchError}</span>
                    </div>
                  )}

                  {!isApiConnected && (
                    <div className="alert alert-warning mb-4">
                      <AlertCircle size={18} />
                      <span>
                        WhatsApp API is disconnected. Broadcast messages will be logged locally in CRM database.
                      </span>
                    </div>
                  )}

                  <div className="form-group mb-4">
                    <label className="form-label">Campaign Name / Reference *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="review-summary-card mb-4">
                    <h4>Campaign Dispatch Summary</h4>
                    <div className="review-row">
                      <span>Target Audience:</span>
                      <strong>{validRecipients.length} Eligible Parents ({optedOutExcludedCount} Opted-Out Excluded)</strong>
                    </div>
                    <div className="review-row">
                      <span>Selected Template:</span>
                      <strong>{selectedTemplateId ? templatesMap[selectedTemplateId]?.name : 'None'}</strong>
                    </div>
                    <div className="review-row">
                      <span>Meta Connection Status:</span>
                      <strong className={isApiConnected ? 'text-emerald' : 'text-amber'}>
                        {isApiConnected ? 'Meta API Connected' : 'Disconnected (Local Mode)'}
                      </strong>
                    </div>
                  </div>

                  {isDispatching && (
                    <div className="dispatch-progress-box">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${dispatchProgress}%` }} />
                      </div>
                      <span className="progress-text">Dispatching WhatsApp Messages ({dispatchProgress}%)...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WIZARD FOOTER CONTROLS */}
            <div className="modal-footer">
              {wizardStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary mr-auto"
                  onClick={() => setWizardStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  disabled={isDispatching}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowWizardModal(false)}
                disabled={isDispatching}
              >
                Cancel
              </button>

              {wizardStep < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (wizardStep === 1 && validRecipients.length === 0) {
                      alert('Please select at least 1 eligible contact to proceed.');
                      return;
                    }
                    if (wizardStep === 2 && !selectedTemplateId) {
                      alert('Please select an Approved template to proceed.');
                      return;
                    }
                    setWizardStep((prev) => (prev + 1) as 1 | 2 | 3);
                  }}
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleSendCampaign}
                  disabled={isDispatching || validRecipients.length === 0}
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send Campaign</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master CSS Styles */}
      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .text-xs { font-size: 0.75rem; }
        .mr-auto { margin-right: auto; }
        .max-h-56 { max-height: 220px; overflow-y: auto; }
        .max-h-64 { max-height: 260px; }
        .text-emerald { color: #047857; }
        .text-rose { color: #be123c; }
        .text-amber { color: #b45309; }

        .campaign-name {
          color: var(--navy-900);
          font-size: 0.9375rem;
        }

        .audience-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
        }

        .wizard-modal {
          max-width: 850px;
        }

        .wizard-stepper-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background-color: var(--slate-50);
          border-bottom: 1px solid var(--border-color);
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.5;
        }

        .step-item.active {
          opacity: 1;
        }

        .step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--slate-300);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .step-item.active .step-num {
          background-color: var(--primary-600);
        }

        .step-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--navy-900);
        }

        .stepper-line {
          flex: 1;
          height: 2px;
          background-color: var(--slate-200);
          margin: 0 1rem;
        }

        .wizard-body {
          padding: 1.5rem;
        }

        .audience-mode-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          background-color: var(--slate-100);
          color: var(--slate-700);
          cursor: pointer;
        }

        .mode-btn.active {
          background-color: var(--primary-600);
          color: #ffffff;
          border-color: var(--primary-700);
        }

        .audience-search-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .row-disabled {
          background-color: #fff1f2;
          opacity: 0.7;
        }

        .audience-summary-card {
          display: flex;
          justify-content: space-around;
          background-color: var(--slate-50);
          border-radius: var(--radius-md);
          border: 1px solid var(--slate-200);
          padding: 1rem;
          text-align: center;
        }

        .summary-col {
          display: flex;
          flex-direction: column;
        }

        .sum-label {
          font-size: 0.75rem;
          color: var(--slate-500);
        }

        .sum-val {
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .tpl-select-card {
          padding: 1rem;
          cursor: pointer;
          border: 1px solid var(--slate-200);
          transition: all 0.2s ease;
          position: relative;
        }

        .tpl-select-card.selected {
          border-color: var(--primary-600);
          background-color: #f0fdfa;
          box-shadow: var(--shadow-md);
        }

        .tpl-select-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tpl-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .tpl-card-name {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--navy-900);
          margin-bottom: 0.25rem;
        }

        .tpl-card-body {
          font-size: 0.75rem;
          color: var(--slate-600);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tpl-selected-check {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary-700);
          margin-top: 0.5rem;
        }

        .template-preview-box {
          background-color: var(--slate-900);
          color: #38bdf8;
          font-family: 'Fira Code', monospace;
          font-size: 0.8125rem;
          padding: 1rem;
          border-radius: var(--radius-md);
        }

        .preview-label {
          font-size: 0.6875rem;
          color: var(--slate-400);
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .review-summary-card {
          background-color: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        .review-summary-card h4 {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--navy-900);
          margin-bottom: 0.75rem;
        }

        .review-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          padding: 0.35rem 0;
          border-bottom: 1px solid var(--slate-200);
        }

        .review-row:last-child {
          border-bottom: none;
        }

        .dispatch-progress-box {
          margin-top: 1rem;
          text-align: center;
        }

        .progress-bar-track {
          height: 10px;
          background-color: var(--slate-200);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: var(--primary-600);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-700);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
