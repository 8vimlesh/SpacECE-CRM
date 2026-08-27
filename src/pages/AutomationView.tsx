import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AutomationRule, type AutomationRuleCondition, type AutomationRuleAction } from '../db/database';
import { triggerAutomationEvent } from '../services/automationEngine';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Webhook,
  Code,
  Eye,
  EyeOff,
  Save,
  Copy,
  Check,
  Trash2,
  Activity,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Image as ImageIcon,
  ListFilter,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

type PayloadDocType = 'text' | 'image' | 'document' | 'list';

export const AutomationView: React.FC = () => {
  // Live Dexie Database Queries
  const rules = useLiveQuery(() => db.automationRules.toArray(), [], []);
  const logs = useLiveQuery(() => db.automationLogs.reverse().toArray(), [], []);
  const templates = useLiveQuery(() => db.templates.toArray(), [], []);
  const settings = useLiveQuery(async () => {
    const list = await db.whatsAppSettings.toArray();
    return list[0];
  }, [], undefined);

  // UI State for Wizard
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleActive, setRuleActive] = useState(true);
  const [triggerEvent, setTriggerEvent] = useState<AutomationRule['triggerEvent']>('INQUIRY_CREATED');
  const [conditions, setConditions] = useState<AutomationRuleCondition[]>([]);
  const [actions, setActions] = useState<AutomationRuleAction[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  // Webhook Configuration State
  const [webhookUrl, setWebhookUrl] = useState(
    settings?.webhookUrl || 'https://n8n.spacece.org/webhook/whatsapp-events'
  );
  const [signingSecret, setSigningSecret] = useState(
    settings?.webhookSecret || 'spc_sec_99481057102947102947'
  );
  const [showSecret, setShowSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Payload Doc State
  const [activeDocTab, setActiveDocTab] = useState<PayloadDocType>('text');
  const [copiedDoc, setCopiedDoc] = useState(false);

  // Analytics Computation
  const totalRules = (rules || []).length;
  const activeRulesCount = (rules || []).filter((r) => r.status === 'ACTIVE').length;
  const inactiveRulesCount = (rules || []).filter((r) => r.status === 'INACTIVE').length;

  const totalExecutions = (logs || []).length;
  const successExecutions = (logs || []).filter((l) => l.status === 'SUCCESS').length;
  const failedExecutions = (logs || []).filter((l) => l.status === 'FAILED').length;
  const skippedExecutions = (logs || []).filter((l) => l.status === 'SKIPPED').length;

  const successRate = totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 100;

  // Toggle Rule Status (ACTIVE / INACTIVE)
  const handleToggleRuleStatus = async (rule: AutomationRule) => {
    if (rule.id) {
      const newStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await db.automationRules.update(rule.id, { status: newStatus });
    }
  };

  // Run Manual Test Trigger
  const handleRunManualTest = async (rule: AutomationRule) => {
    await triggerAutomationEvent(rule.triggerEvent, {
      recipientPhone: '+91 98765 43210',
      pipelineStage: 'New Inquiry',
      direction: 'in',
      messageText: `[Manual Test Trigger - ${rule.name}]`
    });
  };

  // Delete Rule Handler
  const handleDeleteRule = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this automation rule?')) {
      await db.automationRules.delete(id);
    }
  };

  // Open Wizard for Creation
  const openWizard = () => {
    setEditingRuleId(null);
    setRuleName('');
    setRuleDescription('');
    setRuleActive(true);
    setTriggerEvent('INQUIRY_CREATED');
    setConditions([{ field: 'pipelineStage', operator: 'EQUALS', value: 'New Inquiry', logic: 'AND' }]);
    setActions([{ actionType: 'SEND_TEMPLATE', params: { templateName: 'admission_inquiry_welcome' } }]);
    setWizardStep(1);
    setShowWizardModal(true);
  };

  // Save Rule from Wizard
  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      alert('Please enter an Automation Rule Name.');
      return;
    }

    if (editingRuleId) {
      await db.automationRules.update(editingRuleId, {
        name: ruleName.trim(),
        description: ruleDescription.trim(),
        triggerEvent,
        conditions,
        actions,
        status: ruleActive ? 'ACTIVE' : 'INACTIVE'
      });
    } else {
      await db.automationRules.add({
        name: ruleName.trim(),
        description: ruleDescription.trim(),
        triggerEvent,
        conditions,
        actions,
        status: ruleActive ? 'ACTIVE' : 'INACTIVE',
        executionCount: 0,
        lastExecutedAt: null,
        createdAt: new Date().toISOString()
      });
    }

    setShowWizardModal(false);
  };

  // Save Webhook Settings
  const handleSaveWebhookSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings?.id) {
      await db.whatsAppSettings.update(settings.id, {
        webhookUrl: webhookUrl.trim(),
        webhookSecret: signingSecret.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Payload JSON Specifications
  const payloadExamples: Record<PayloadDocType, object> = {
    text: {
      to: '+919876543210',
      type: 'text',
      text: { body: 'Dear Parent, Q3 fees for Spacece India Foundation are due on 15th March.' }
    },
    image: {
      to: '+919876543210',
      type: 'image',
      image: { link: 'https://spacece.org/assets/annual-sports-banner.png', caption: 'Spacece Sports Day 2026' }
    },
    document: {
      to: '+919876543210',
      type: 'document',
      document: { link: 'https://spacece.org/assets/prospectus-2026.pdf', filename: 'Prospectus_2026.pdf' }
    },
    list: {
      to: '+919876543210',
      type: 'list',
      list: {
        header: 'Spacece Parent Support',
        buttonText: 'Select Option',
        sections: [{ title: 'Services', rows: [{ id: 'opt_1', title: 'Fee Gateway', description: 'Digital payment link' }] }]
      }
    }
  };

  const handleCopyJson = (obj: object) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  return (
    <div className="automation-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Spacece Automation Engine</h1>
          <p className="page-subtitle">
            Configure reactive CRM event workflows, WhatsApp triggers, opt-out protection rules, and n8n webhooks
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openWizard}>
            <Plus size={16} />
            <span>+ Create Automation</span>
          </button>
        </div>
      </div>

      {/* 1. Automation Dashboard Analytics KPI Row */}
      <div className="grid-4 mb-6">
        <div className="card stat-card">
          <div className="stat-icon teal">
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-label">Total Automation Rules</div>
            <div className="stat-value">{totalRules}</div>
            <div className="stat-subtext">{activeRulesCount} Active • {inactiveRulesCount} Inactive</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-label">Successful Executions</div>
            <div className="stat-value">{successExecutions}</div>
            <div className="stat-subtext">Success Rate: {successRate}%</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon amber">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-label">Skipped (Opt-Out / Rules)</div>
            <div className="stat-value">{skippedExecutions}</div>
            <div className="stat-subtext">Opt-Out Protection Enforced</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon rose">
            <XCircle size={24} />
          </div>
          <div>
            <div className="stat-label">Failed Executions</div>
            <div className="stat-value">{failedExecutions}</div>
            <div className="stat-subtext">Diagnostic Errors Logged</div>
          </div>
        </div>
      </div>

      {/* 2. Automation Rules Management Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">Configured Automation Rules</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Automation Name & Description</th>
                <th>Trigger Event</th>
                <th>Conditions & Actions</th>
                <th>Status</th>
                <th>Executions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules && rules.length > 0 ? (
                rules.map((rule) => {
                  const isActive = rule.status === 'ACTIVE';

                  return (
                    <tr key={rule.id}>
                      <td>
                        <strong className="rule-name">{rule.name}</strong>
                        <span className="text-xs text-muted block mt-1">{rule.description}</span>
                      </td>
                      <td>
                        <span className="badge badge-info font-mono text-xs">{rule.triggerEvent}</span>
                      </td>
                      <td>
                        <div className="text-xs">
                          <div><strong>Cond:</strong> {rule.conditions.length > 0 ? `${rule.conditions.length} rule(s)` : 'None (Always)'}</div>
                          <div className="text-teal"><strong>Act:</strong> {rule.actions.map(a => a.actionType).join(', ')}</div>
                        </div>
                      </td>
                      <td>
                        <button
                          className={`btn-toggle-pill ${isActive ? 'active' : ''}`}
                          onClick={() => handleToggleRuleStatus(rule)}
                          title="Click to toggle Active/Inactive"
                        >
                          {isActive ? <ToggleRight size={20} className="text-emerald" /> : <ToggleLeft size={20} className="text-slate" />}
                          <span>{rule.status}</span>
                        </button>
                      </td>
                      <td>
                        <strong>{rule.executionCount}</strong>
                        {rule.lastExecutedAt && (
                          <span className="text-xs text-muted block">
                            {new Date(rule.lastExecutedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-btn-group">
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleRunManualTest(rule)}
                            title="Run Manual Test"
                          >
                            <Play size={12} /> Test
                          </button>
                          <button
                            className="btn btn-outline btn-xs danger"
                            onClick={() => handleDeleteRule(rule.id!)}
                            title="Delete Rule"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">
                    No automation rules created yet. Click "+ Create Automation" to build your first workflow.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Webhook & Signing Secret Configuration */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-header-icon-title">
            <Webhook size={20} className="text-teal" />
            <h3 className="card-title">n8n Webhook & Signing Secret Configuration</h3>
          </div>
          {saveSuccess && (
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> Credentials Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveWebhookSettings}>
          <div className="grid-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label">Outbound Webhook Listener URL (n8n / External)</label>
              <input
                type="url"
                className="form-input font-mono"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.spacece.org/webhook/whatsapp-events"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Signing Secret (HMAC Signature)</label>
              <div className="secret-input-wrapper">
                <input
                  type={showSecret ? 'text' : 'password'}
                  className="form-input font-mono"
                  value={signingSecret}
                  onChange={(e) => setSigningSecret(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="secret-toggle-btn"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save Webhook Configuration
          </button>
        </form>
      </div>

      {/* 4. Interactive Payload Documentation */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-header-icon-title">
            <Code size={20} className="text-indigo" />
            <div>
              <h3 className="card-title">Outbound API Payload Specification</h3>
              <p className="text-xs text-muted">
                Endpoint: <code>POST /api/v1/whatsapp/send</code> • Auth: <code>Authorization: Bearer &lt;SigningSecret&gt;</code>
              </p>
            </div>
          </div>
        </div>

        <div className="doc-tabs-bar mb-4">
          <button
            className={`doc-tab-btn ${activeDocTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('text')}
          >
            <FileText size={14} /> Text Payload
          </button>
          <button
            className={`doc-tab-btn ${activeDocTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('image')}
          >
            <ImageIcon size={14} /> Image Payload
          </button>
          <button
            className={`doc-tab-btn ${activeDocTab === 'document' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('document')}
          >
            <FileText size={14} /> Document Payload
          </button>
          <button
            className={`doc-tab-btn ${activeDocTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('list')}
          >
            <ListFilter size={14} /> List Message Payload
          </button>
        </div>

        <div className="json-code-container">
          <div className="json-code-header">
            <span>JSON REQUEST FORMAT ({activeDocTab.toUpperCase()})</span>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => handleCopyJson(payloadExamples[activeDocTab])}
            >
              {copiedDoc ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
              <span>{copiedDoc ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="json-code-block font-mono">
            {JSON.stringify(payloadExamples[activeDocTab], null, 2)}
          </pre>
        </div>
      </div>

      {/* 5. Automation Activity Audit Logs Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon-title">
            <Activity size={20} className="text-purple" />
            <h3 className="card-title">Automation Execution Audit Logs</h3>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Automation Rule</th>
                <th>Trigger Event</th>
                <th>Target Recipient</th>
                <th>Result Status</th>
                <th>Execution Details</th>
              </tr>
            </thead>
            <tbody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-muted text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <strong>{log.ruleName}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info text-xs">{log.type}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">{log.recipient}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'SUCCESS'
                            ? 'badge-success'
                            : log.status === 'SKIPPED'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-700">{log.notes}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">
                    No automation execution logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4-STEP RULE CREATION WIZARD MODAL */}
      {showWizardModal && (
        <div className="modal-overlay">
          <div className="modal-content wizard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editingRuleId ? 'Edit Automation Rule' : '+ Create Automation Rule (4-Step Wizard)'}</h3>
                <p className="text-xs text-muted">Spacece WhatsApp Event Workflow Builder</p>
              </div>
              <button className="modal-close" onClick={() => setShowWizardModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Stepper Progress Header */}
            <div className="wizard-stepper-bar">
              <div className={`step-item ${wizardStep >= 1 ? 'active' : ''}`}>
                <span className="step-num">1</span>
                <span className="step-label">Basic Info</span>
              </div>
              <div className="stepper-line" />
              <div className={`step-item ${wizardStep >= 2 ? 'active' : ''}`}>
                <span className="step-num">2</span>
                <span className="step-label">Trigger</span>
              </div>
              <div className="stepper-line" />
              <div className={`step-item ${wizardStep >= 3 ? 'active' : ''}`}>
                <span className="step-num">3</span>
                <span className="step-label">Conditions</span>
              </div>
              <div className="stepper-line" />
              <div className={`step-item ${wizardStep >= 4 ? 'active' : ''}`}>
                <span className="step-num">4</span>
                <span className="step-label">Actions</span>
              </div>
            </div>

            {/* Wizard Step Content */}
            <div className="modal-body wizard-body">
              {/* STEP 1: BASIC INFO */}
              {wizardStep === 1 && (
                <div className="form-group-list">
                  <div className="form-group">
                    <label className="form-label">Automation Rule Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="e.g. New Inquiry Welcome Message"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                      placeholder="Send an automatic prospectus welcome template when a new parent inquiry is created."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Status</label>
                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        id="ruleActiveCheck"
                        checked={ruleActive}
                        onChange={(e) => setRuleActive(e.target.checked)}
                      />
                      <label htmlFor="ruleActiveCheck" className="text-sm">
                        Activate this automation rule immediately upon saving
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE TRIGGER */}
              {wizardStep === 2 && (
                <div className="form-group">
                  <label className="form-label mb-3">Select CRM Event Trigger *</label>

                  <div className="grid-2 gap-3">
                    <div
                      className={`trigger-option-card ${triggerEvent === 'INQUIRY_CREATED' ? 'selected' : ''}`}
                      onClick={() => setTriggerEvent('INQUIRY_CREATED')}
                    >
                      <strong>Inquiry Created</strong>
                      <p>Triggers when a new parent lead inquiry is logged.</p>
                    </div>

                    <div
                      className={`trigger-option-card ${triggerEvent === 'INQUIRY_STAGE_CHANGED' ? 'selected' : ''}`}
                      onClick={() => setTriggerEvent('INQUIRY_STAGE_CHANGED')}
                    >
                      <strong>Inquiry Stage Changed</strong>
                      <p>Triggers when an inquiry moves to Contacted, Interested, or Admitted.</p>
                    </div>

                    <div
                      className={`trigger-option-card ${triggerEvent === 'INQUIRY_FOLLOWUP_DUE' ? 'selected' : ''}`}
                      onClick={() => setTriggerEvent('INQUIRY_FOLLOWUP_DUE')}
                    >
                      <strong>Inquiry Follow-Up Due</strong>
                      <p>Triggers when follow-up date reaches today or overdue.</p>
                    </div>

                    <div
                      className={`trigger-option-card ${triggerEvent === 'WHATSAPP_INCOMING' ? 'selected' : ''}`}
                      onClick={() => setTriggerEvent('WHATSAPP_INCOMING')}
                    >
                      <strong>Incoming WhatsApp Message</strong>
                      <p>Triggers when an incoming parent message arrives.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CONDITIONS */}
              {wizardStep === 3 && (
                <div className="conditions-builder-box">
                  <p className="text-sm text-muted mb-3">
                    Define optional filter conditions (All conditions must pass for the rule to execute):
                  </p>

                  {conditions.map((cond, idx) => (
                    <div key={idx} className="condition-row mb-3">
                      <select
                        className="form-select text-xs"
                        value={cond.field}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].field = e.target.value;
                          setConditions(updated);
                        }}
                      >
                        <option value="pipelineStage">Pipeline Stage</option>
                        <option value="optedOut">Opted Out Status</option>
                        <option value="tag">Contact Tag</option>
                      </select>

                      <select
                        className="form-select text-xs"
                        value={cond.operator}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].operator = e.target.value as any;
                          setConditions(updated);
                        }}
                      >
                        <option value="EQUALS">EQUALS</option>
                        <option value="NOT_EQUALS">NOT EQUALS</option>
                        <option value="CONTAINS">CONTAINS</option>
                      </select>

                      <input
                        type="text"
                        className="form-input text-xs"
                        value={cond.value}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].value = e.target.value;
                          setConditions(updated);
                        }}
                        placeholder="Value (e.g. New Inquiry)"
                      />

                      <button
                        className="btn-icon danger"
                        onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() =>
                      setConditions([
                        ...conditions,
                        { field: 'pipelineStage', operator: 'EQUALS', value: 'New Inquiry', logic: 'AND' }
                      ])
                    }
                  >
                    + Add Condition
                  </button>
                </div>
              )}

              {/* STEP 4: ACTIONS */}
              {wizardStep === 4 && (
                <div className="actions-builder-box">
                  <p className="text-sm text-muted mb-3">
                    Configure actions to perform when rule conditions match:
                  </p>

                  {actions.map((act, idx) => (
                    <div key={idx} className="action-row-card card p-3 mb-3">
                      <div className="form-group mb-2">
                        <label className="form-label">Action Type</label>
                        <select
                          className="form-select"
                          value={act.actionType}
                          onChange={(e) => {
                            const updated = [...actions];
                            updated[idx].actionType = e.target.value as any;
                            setActions(updated);
                          }}
                        >
                          <option value="SEND_TEMPLATE">Send WhatsApp Template</option>
                          <option value="SEND_TEXT">Send WhatsApp Text</option>
                          <option value="UPDATE_STAGE">Update Inquiry Stage</option>
                          <option value="SEND_WEBHOOK">Send Webhook to n8n</option>
                        </select>
                      </div>

                      {act.actionType === 'SEND_TEMPLATE' && (
                        <div className="form-group">
                          <label className="form-label">Select Eligible Approved Template</label>
                          <select
                            className="form-select"
                            value={act.params.templateName || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].params = { ...updated[idx].params, templateName: e.target.value };
                              setActions(updated);
                            }}
                          >
                            {(templates || []).map((t) => (
                              <option key={t.id} value={t.name}>
                                {t.name} ({t.category})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {act.actionType === 'SEND_TEXT' && (
                        <div className="form-group">
                          <label className="form-label">Message Text</label>
                          <input
                            type="text"
                            className="form-input"
                            value={act.params.text || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].params = { ...updated[idx].params, text: e.target.value };
                              setActions(updated);
                            }}
                            placeholder="Enter text message content..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wizard Footer Controls */}
            <div className="modal-footer">
              {wizardStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary mr-auto"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}

              <button type="button" className="btn btn-secondary" onClick={() => setShowWizardModal(false)}>
                Cancel
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-lg" onClick={handleSaveRule}>
                  <Save size={18} />
                  <span>Save Automation Rule</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master Styles for Automation View */}
      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.8125rem; }
        .font-mono { font-family: 'Fira Code', monospace; }
        .mr-auto { margin-right: auto; }
        .block { display: block; }
        .text-teal { color: var(--primary-600); }
        .text-indigo { color: var(--indigo-500); }
        .text-emerald { color: #047857; }
        .text-purple { color: #9333ea; }
        .text-slate-700 { color: var(--slate-700); }

        .stat-icon.green { background-color: #d1fae5; color: #047857; }
        .stat-icon.rose { background-color: #ffe4e6; color: #be123c; }

        .rule-name {
          font-size: 0.9375rem;
          color: var(--navy-900);
        }

        .btn-toggle-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--slate-300);
          background-color: var(--slate-100);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-toggle-pill.active {
          background-color: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .action-btn-group {
          display: flex;
          gap: 0.35rem;
        }

        .wizard-modal {
          max-width: 750px;
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

        .step-item.active { opacity: 1; }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--slate-300);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .step-item.active .step-num { background-color: var(--primary-600); }
        .step-label { font-size: 0.8125rem; font-weight: 700; color: var(--navy-900); }
        .stepper-line { flex: 1; height: 2px; background-color: var(--slate-200); margin: 0 0.75rem; }

        .trigger-option-card {
          padding: 0.875rem;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          background-color: var(--slate-50);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .trigger-option-card.selected {
          border-color: var(--primary-600);
          background-color: #f0fdfa;
          box-shadow: var(--shadow-sm);
        }

        .trigger-option-card strong {
          font-size: 0.875rem;
          color: var(--navy-900);
          display: block;
          margin-bottom: 0.25rem;
        }

        .trigger-option-card p {
          font-size: 0.75rem;
          color: var(--slate-600);
          line-height: 1.3;
        }

        .condition-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};
