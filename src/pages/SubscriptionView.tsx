import React from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { subscriptionService } from '../services/subscriptionService';
import { contactsService } from '../services/contactsService';
import { messagesService } from '../services/messagesService';
import { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  FileText,
  Users,
  MessageSquare,
  ShieldAlert,
  Download,
  Printer
} from 'lucide-react';

export const SubscriptionView: React.FC = () => {
  const [activeReceipt, setActiveReceipt] = useState<{
    id: string;
    date: string;
    amount: string;
    plan: string;
    status: string;
  } | null>(null);

  // Supabase Queries
  const { data: subList } = useSupabaseData('subscriptions', async () => {
    const s = await subscriptionService.getSubscription();
    return s ? [s] : [];
  });
  const subRecord = subList?.[0];

  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());
  const { data: allMessages } = useSupabaseData('messages', () => messagesService.getAll());
  const liveContactCount = contacts?.length || 0;

  // Compute Current Month YYYY-MM
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Compute Live Messages Sent This Month
  const liveMessagesThisMonth = (allMessages || []).filter(
    (m) => m.timestamp.startsWith(currentMonthStr) && (m.direction === 'out' || m.type === 'template')
  ).length;

  if (!subRecord) {
    return (
      <div className="p-4 text-center text-muted">
        Loading Subscription details from database...
      </div>
    );
  }

  // Quota Limits & Percentage Calculations
  const contactLimit = subRecord.contactLimit || 5000;
  const messageLimit = subRecord.messageLimit || 50000;

  const contactRemaining = Math.max(0, contactLimit - liveContactCount);
  const messageRemaining = Math.max(0, messageLimit - liveMessagesThisMonth);

  const contactPct = Math.min(100, Math.round((liveContactCount / contactLimit) * 100));
  const messagePct = Math.min(100, Math.round((liveMessagesThisMonth / messageLimit) * 100));

  const isContactNearLimit = contactPct >= 90;
  const isMessageNearLimit = messagePct >= 90;

  return (
    <div className="subscription-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription & Usage Quotas</h1>
          <p className="page-subtitle">
            Manage organization plan capacity, real-time message limits, and billing payment invoices
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">
            <Zap size={16} />
            <span>Upgrade Tier Plan</span>
          </button>
        </div>
      </div>

      {/* Quota Limit Warning Alert if approaching/exceeding capacity */}
      {(isContactNearLimit || isMessageNearLimit) && (
        <div className="card status-warning-card mb-6">
          <ShieldAlert size={28} className="text-warning-icon" />
          <div>
            <h4>Quota Capacity Warning (Limit Approaching)</h4>
            <p>
              {isContactNearLimit && ` Contact imported capacity is at ${contactPct}% (${liveContactCount} / ${contactLimit}).`}
              {isMessageNearLimit && ` Monthly template messages quota is at ${messagePct}% (${liveMessagesThisMonth} / ${messageLimit}).`}
              {' '}Consider upgrading your plan tier to avoid operational service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Summary Card */}
      <div className="card plan-banner-card mb-6">
        <div className="plan-info-left">
          <span className="badge badge-success mb-2">
            <CheckCircle2 size={12} /> {subRecord.status} Subscription
          </span>
          <h2 className="plan-name">{subRecord.planName}</h2>
          <p className="plan-renewal">
            Renews on {new Date(subRecord.renewalDate).toLocaleDateString()} • Spacece Foundation Academic Discount Active
          </p>
        </div>
        <div className="plan-actions-right">
          <button className="btn btn-outline">Change Billing Cycle</button>
        </div>
      </div>

      {/* Dynamic Usage Quota Cards */}
      <div className="grid-2 mb-6">
        {/* Card 1: Contacts Usage */}
        <div className="card usage-card">
          <div className="card-header">
            <div className="usage-card-title-group">
              <Users size={20} className="text-teal" />
              <h3 className="card-title">Contacts Imported</h3>
            </div>
            <span className="usage-stat-text">
              <strong>{liveContactCount.toLocaleString()}</strong> / {contactLimit.toLocaleString()} Contacts
            </span>
          </div>

          {/* Progress Bar */}
          <div className="usage-progress-track">
            <div
              className={`progress-fill ${
                contactPct >= 95 ? 'danger' : contactPct >= 75 ? 'warning' : 'teal'
              }`}
              style={{ width: `${Math.max(contactPct, 4)}%` }}
            />
          </div>

          <div className="usage-meta-row">
            <span className="meta-pct">{contactPct}% Capacity Consumed</span>
            <span className="meta-rem">
              <strong>{contactRemaining.toLocaleString()}</strong> Contacts Remaining
            </span>
          </div>
        </div>

        {/* Card 2: Template Messages Sent This Month */}
        <div className="card usage-card">
          <div className="card-header">
            <div className="usage-card-title-group">
              <MessageSquare size={20} className="text-indigo" />
              <h3 className="card-title">Template Messages ({currentMonthName})</h3>
            </div>
            <span className="usage-stat-text">
              <strong>{liveMessagesThisMonth.toLocaleString()}</strong> / {messageLimit.toLocaleString()} Messages
            </span>
          </div>

          {/* Progress Bar */}
          <div className="usage-progress-track">
            <div
              className={`progress-fill ${
                messagePct >= 95 ? 'danger' : messagePct >= 75 ? 'warning' : 'indigo'
              }`}
              style={{ width: `${Math.max(messagePct, 4)}%` }}
            />
          </div>

          <div className="usage-meta-row">
            <span className="meta-pct">{messagePct}% Quota Consumed</span>
            <span className="meta-rem">
              <strong>{messageRemaining.toLocaleString()}</strong> Messages Available
            </span>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Payment & Invoice History</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice Reference</th>
                <th>Billing Date</th>
                <th>Plan Detail</th>
                <th>Amount Paid</th>
                <th>Payment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subRecord.paymentHistory && subRecord.paymentHistory.length > 0 ? (
                subRecord.paymentHistory.map((pmt) => (
                  <tr key={pmt.id}>
                    <td>
                      <strong>{pmt.id}</strong>
                    </td>
                    <td>{pmt.date}</td>
                    <td>{pmt.plan}</td>
                    <td>
                      <strong>{pmt.amount}</strong>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} /> {pmt.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setActiveReceipt(pmt)}
                      >
                        <FileText size={14} /> Download Receipt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">
                    No payment history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {activeReceipt && (
        <div className="modal-overlay" onClick={() => setActiveReceipt(null)}>
          <div className="modal-content receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Invoice Receipt ({activeReceipt.id})</h3>
              <button className="modal-close" onClick={() => setActiveReceipt(null)}>✕</button>
            </div>
            <div className="modal-body receipt-modal-body">
              <div className="receipt-header-banner">
                <div className="brand-title-lg">SpacECE India Foundation</div>
                <div className="receipt-tag">TAX INVOICE / OFFICIAL RECEIPT</div>
              </div>

              <div className="receipt-grid">
                <div>
                  <span className="receipt-label">Invoice Number:</span>
                  <strong>{activeReceipt.id}</strong>
                </div>
                <div>
                  <span className="receipt-label">Payment Date:</span>
                  <strong>{activeReceipt.date}</strong>
                </div>
                <div>
                  <span className="receipt-label">Subscription Plan:</span>
                  <strong>{activeReceipt.plan}</strong>
                </div>
                <div>
                  <span className="receipt-label">Payment Status:</span>
                  <span className="badge badge-success">{activeReceipt.status}</span>
                </div>
                <div className="full-col">
                  <span className="receipt-label">Total Amount Paid:</span>
                  <strong className="receipt-amount-text">{activeReceipt.amount}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline mr-auto" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  alert(`Receipt ${activeReceipt.id} downloaded successfully!`);
                  setActiveReceipt(null);
                }}
              >
                <Download size={16} /> Download PDF
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master CSS for Subscription View */}
      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .text-teal { color: var(--primary-600); }
        .text-indigo { color: var(--indigo-500); }

        .status-warning-card {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .text-warning-icon {
          color: #d97706;
          flex-shrink: 0;
        }

        .status-warning-card h4 {
          font-size: 0.9375rem;
          color: #92400e;
          font-weight: 800;
        }

        .status-warning-card p {
          font-size: 0.8125rem;
          color: #b45309;
          margin-top: 0.2rem;
          line-height: 1.4;
        }

        .plan-banner-card {
          background: linear-gradient(135deg, var(--navy-900), var(--navy-800));
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
        }

        .plan-name {
          font-size: 1.625rem;
          font-weight: 800;
          color: #ffffff;
        }

        .plan-renewal {
          font-size: 0.8125rem;
          color: var(--primary-100);
          opacity: 0.85;
          margin-top: 0.25rem;
        }

        .usage-card-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .usage-stat-text {
          font-size: 0.875rem;
          color: var(--slate-600);
        }

        .usage-progress-track {
          height: 12px;
          background-color: var(--slate-100);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin: 1.25rem 0 0.75rem 0;
        }

        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .progress-fill.teal { background-color: var(--primary-600); }
        .progress-fill.indigo { background-color: var(--indigo-500); }
        .progress-fill.warning { background-color: var(--amber-500); }
        .progress-fill.danger { background-color: var(--rose-500); }

        .usage-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78125rem;
          color: var(--slate-500);
        }

        .receipt-modal {
          max-width: 520px;
        }

        .receipt-modal-body {
          padding: 1.5rem;
        }

        .receipt-header-banner {
          background-color: var(--slate-900);
          color: #ffffff;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand-title-lg {
          font-weight: 800;
          font-size: 1.1rem;
        }

        .receipt-tag {
          font-size: 0.7rem;
          background-color: rgba(255, 255, 255, 0.15);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          letter-spacing: 0.05em;
        }

        .receipt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .receipt-grid .full-col {
          grid-column: span 2;
          background-color: var(--slate-50);
          padding: 0.875rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--slate-200);
          margin-top: 0.5rem;
        }

        .receipt-label {
          display: block;
          font-size: 0.75rem;
          color: var(--slate-500);
          margin-bottom: 0.15rem;
        }

        .receipt-amount-text {
          font-size: 1.25rem;
          color: var(--primary-700);
        }
      `}</style>
    </div>
  );
};
