import React, { useState } from 'react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { contactsService } from '../../services/contactsService';
import { inquiriesService } from '../../services/inquiriesService';
import { messagesService } from '../../services/messagesService';
import { templatesService } from '../../services/templatesService';
import { campaignsService } from '../../services/campaignsService';
import { mediaService } from '../../services/mediaService';
import { whatsappSettingsService } from '../../services/whatsappSettingsService';
import { subscriptionService } from '../../services/subscriptionService';
import { migrateIndexedDbToSupabase } from '../../services/dataMigrationService';
import { X, RefreshCw, Table as TableIcon, Database, CheckCircle2, Info } from 'lucide-react';

interface DatabaseInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TableName =
  | 'contacts'
  | 'inquiries'
  | 'messages'
  | 'templates'
  | 'campaigns'
  | 'media'
  | 'whatsAppSettings'
  | 'subscription';

export const DatabaseInspectorModal: React.FC<DatabaseInspectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedTable, setSelectedTable] = useState<TableName>('contacts');

  // Supabase Queries
  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());
  const { data: inquiries } = useSupabaseData('inquiries', () => inquiriesService.getAll());
  const { data: messages } = useSupabaseData('messages', () => messagesService.getAll());
  const { data: templates } = useSupabaseData('templates', () => templatesService.getAll());
  const { data: campaigns } = useSupabaseData('campaigns', () => campaignsService.getAll());
  const { data: media } = useSupabaseData('media', () => mediaService.getAll());
  const { data: settingsList } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const { data: subList } = useSupabaseData('subscriptions', async () => {
    const s = await subscriptionService.getSubscription();
    return s ? [s] : [];
  });

  const contactsCount = contacts?.length || 0;
  const inquiriesCount = inquiries?.length || 0;
  const messagesCount = messages?.length || 0;
  const templatesCount = templates?.length || 0;
  const campaignsCount = campaigns?.length || 0;
  const mediaCount = media?.length || 0;
  const settingsCount = settingsList?.length || 0;
  const subscriptionCount = subList?.length || 0;

  const safeJsonStringify = (data: any) => {
    try {
      const cache = new Set();
      return JSON.stringify(
        data,
        (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
              return '[Circular]';
            }
            cache.add(value);
          }
          return value;
        },
        2
      );
    } catch (err) {
      return `Error displaying database records: ${String(err)}`;
    }
  };

  const getTableData = () => {
    try {
      switch (selectedTable) {
        case 'contacts': return contacts || [];
        case 'inquiries': return inquiries || [];
        case 'messages': return messages || [];
        case 'templates': return templates || [];
        case 'campaigns': return campaigns || [];
        case 'media': return media || [];
        case 'whatsAppSettings': return settingsList || [];
        case 'subscription': return subList || [];
        default: return [];
      }
    } catch (err) {
      console.error('Inspector data fetch error:', err);
      return [];
    }
  };
  const tableData = getTableData();

  if (!isOpen) return null;

  const [isResetting, setIsResetting] = useState(false);

  const handleResetSeed = async () => {
    if (window.confirm('Are you sure you want to re-sync and re-seed the Supabase PostgreSQL database?')) {
      setIsResetting(true);
      await migrateIndexedDbToSupabase();
      setIsResetting(false);
    }
  };

  const tablesInfo: { name: TableName; label: string; count: number; desc: string }[] = [
    { name: 'contacts', label: 'Contacts', count: contactsCount, desc: 'Parents, Students & Opted status' },
    { name: 'inquiries', label: 'Inquiries', count: inquiriesCount, desc: 'Pipeline stage, follow-ups & notes' },
    { name: 'messages', label: 'Messages', count: messagesCount, desc: 'WhatsApp conversation log threads' },
    { name: 'templates', label: 'Templates', count: templatesCount, desc: 'Meta-approved message body formats' },
    { name: 'campaigns', label: 'Campaigns', count: campaignsCount, desc: 'Broadcast delivery statistics' },
    { name: 'media', label: 'Media', count: mediaCount, desc: 'Documents, Prospectus PDFs & images' },
    { name: 'whatsAppSettings', label: 'WhatsApp Settings', count: settingsCount, desc: 'Credentials & connection state' },
    { name: 'subscription', label: 'Subscription', count: subscriptionCount, desc: 'Plan limits & usage counters' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content inspector-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <Database className="title-icon" size={22} />
            <div>
              <h3>Spacece IndexedDB Schema Inspector</h3>
              <p>Client-side Relational Browser Database Structure & Live Tables</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body inspector-body">
          {/* Table Selector Tabs */}
          <div className="table-tabs">
            {tablesInfo.map((tbl) => (
              <button
                key={tbl.name}
                className={`table-tab-btn ${selectedTable === tbl.name ? 'active' : ''}`}
                onClick={() => setSelectedTable(tbl.name)}
              >
                <TableIcon size={14} />
                <span className="tbl-name">{tbl.label}</span>
                <span className="tbl-count">{tbl.count}</span>
              </button>
            ))}
          </div>

          {/* Table Content & JSON preview */}
          <div className="inspector-content">
            <div className="table-meta-bar">
              <div>
                <h4>Table: <code className="highlight-tbl">{selectedTable}</code></h4>
                <p>{tablesInfo.find(t => t.name === selectedTable)?.desc}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetSeed} disabled={isResetting}>
                <RefreshCw size={14} className={isResetting ? 'spin' : ''} />
                <span>{isResetting ? 'Resetting...' : 'Re-seed Database'}</span>
              </button>
            </div>

            {/* Render Records */}
            {tableData && tableData.length > 0 ? (
              <div className="json-container">
                <div className="json-header">
                  <CheckCircle2 size={16} className="text-emerald" />
                  <span>{tableData.length} IndexedDB Record(s) Loaded</span>
                </div>
                <pre className="json-code">
                  {safeJsonStringify(tableData)}
                </pre>
              </div>
            ) : (
              <div className="empty-state">
                <Info size={32} />
                <p>No records found in table <strong>{selectedTable}</strong>.</p>
                <button className="btn btn-primary btn-sm" onClick={handleResetSeed}>
                  Seed Default Data
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <span className="footer-note">Database Name: <code>SpaceceIndiaFoundationCRM</code> (Dexie v1)</span>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>

      <style>{`
        .inspector-modal {
          max-width: 1000px;
          height: 85vh;
        }

        .modal-header-title {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .modal-header-title h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--navy-900);
        }

        .modal-header-title p {
          font-size: 0.75rem;
          color: var(--slate-500);
        }

        .title-icon {
          color: var(--primary-600);
        }

        .modal-close {
          background: transparent;
          border: none;
          color: var(--slate-400);
          cursor: pointer;
        }

        .inspector-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow: hidden;
          padding: 1.25rem;
        }

        .table-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .table-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-md);
          background-color: var(--slate-100);
          border: 1px solid var(--slate-200);
          color: var(--slate-700);
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .table-tab-btn:hover {
          background-color: var(--slate-200);
        }

        .table-tab-btn.active {
          background-color: var(--primary-600);
          color: #ffffff;
          border-color: var(--primary-700);
        }

        .tbl-count {
          background-color: rgba(0, 0, 0, 0.15);
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
        }

        .inspector-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: var(--slate-900);
          border-radius: var(--radius-lg);
          color: var(--slate-100);
        }

        .table-meta-bar {
          padding: 0.875rem 1.25rem;
          background-color: var(--navy-900);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-meta-bar h4 {
          font-size: 0.875rem;
          color: #ffffff;
        }

        .table-meta-bar p {
          font-size: 0.75rem;
          color: var(--slate-400);
        }

        .highlight-tbl {
          color: var(--primary-500);
          font-family: monospace;
        }

        .json-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 1rem;
        }

        .json-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--emerald-500);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .json-code {
          flex: 1;
          overflow: auto;
          background-color: rgba(0, 0, 0, 0.4);
          padding: 1rem;
          border-radius: var(--radius-md);
          font-family: 'Fira Code', monospace;
          font-size: 0.8125rem;
          color: #38bdf8;
          line-height: 1.4;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .footer-note {
          font-size: 0.75rem;
          color: var(--slate-500);
          margin-right: auto;
        }
      `}</style>
    </div>
  );
};
