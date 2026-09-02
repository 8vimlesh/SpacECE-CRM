import React from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { contactsService } from '../services/contactsService';
import { inquiriesService } from '../services/inquiriesService';
import { messagesService } from '../services/messagesService';
import { campaignsService } from '../services/campaignsService';
import { templatesService } from '../services/templatesService';
import type { NavItemKey } from '../components/layout/Sidebar';
import {
  Users,
  GitPullRequest,
  MessageSquare,
  Send,
  ArrowRight,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (key: NavItemKey) => void;
  onOpenDbInspector?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate
}) => {
  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());
  const { data: inquiries } = useSupabaseData('inquiries', () => inquiriesService.getAll());
  const { data: messages } = useSupabaseData('messages', () => messagesService.getAll());
  const { data: campaigns } = useSupabaseData('campaigns', () => campaignsService.getAll());
  const { data: templates } = useSupabaseData('templates', () => templatesService.getAll());

  const contactsCount = contacts?.length || 0;
  const inquiriesCount = inquiries?.length || 0;
  const messagesCount = messages?.length || 0;
  const campaignsCount = campaigns?.length || 0;
  const templatesCount = templates?.length || 0;

  const recentInquiries = (inquiries || []).slice(-3).reverse();

  const contactsMap: Record<number, string> = {};
  (contacts || []).forEach((c) => {
    if (c.id) contactsMap[c.id] = c.name;
  });

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Overview of Spacece India Foundation WhatsApp CRM & Student Communication
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('contacts')}>
            <Plus size={16} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>


      {/* Stat Cards Row */}
      <div className="grid-4 mb-6">
        <div className="card stat-card" onClick={() => onNavigate('contacts')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon teal">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Total Contacts</div>
            <div className="stat-value">{contactsCount}</div>
            <div className="stat-subtext">Parents & Students Indexed</div>
          </div>
        </div>

        <div className="card stat-card" onClick={() => onNavigate('inquiries')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">
            <GitPullRequest size={24} />
          </div>
          <div>
            <div className="stat-label">Admission Inquiries</div>
            <div className="stat-value">{inquiriesCount}</div>
            <div className="stat-subtext">Active Pipeline Leads</div>
          </div>
        </div>

        <div className="card stat-card" onClick={() => onNavigate('chats')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon purple">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="stat-label">Message Threads</div>
            <div className="stat-value">{messagesCount}</div>
            <div className="stat-subtext">Logged Conversations</div>
          </div>
        </div>

        <div className="card stat-card" onClick={() => onNavigate('campaigns')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon amber">
            <Send size={24} />
          </div>
          <div>
            <div className="stat-label">Broadcast Campaigns</div>
            <div className="stat-value">{campaignsCount}</div>
            <div className="stat-subtext">Announcements Created</div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Inquiries & Quick Modules */}
      <div className="grid-2">
        {/* Recent Inquiries List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Admission Inquiries</h3>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('inquiries')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {recentInquiries && recentInquiries.length > 0 ? (
            <div className="inquiry-list">
              {recentInquiries.map((inq) => (
                <div key={inq.id} className="inquiry-item">
                  <div className="inquiry-main">
                    <span className="inquiry-name">
                      {contactsMap?.[inq.contactId] || `Contact #${inq.contactId}`}
                    </span>
                    <span className="inquiry-notes">{inq.notes}</span>
                  </div>
                  <div className="inquiry-meta">
                    <span className="badge badge-info">{inq.pipelineStage}</span>
                    <span className="inquiry-date">Follow-up: {inq.followUpDate}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No inquiries logged yet.</p>
          )}
        </div>

        {/* System Architecture Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Foundation Status</h3>
            <span className="badge badge-success">Phase 1 Complete</span>
          </div>

          <div className="foundation-checklist">
            <div className="check-item">
              <div className="check-bullet active">✓</div>
              <div>
                <strong>Navigation & Admin Layout</strong>
                <p>11 sidebar modules wired and responsive across desktop and tablet</p>
              </div>
            </div>

            <div className="check-item">
              <div className="check-bullet active">✓</div>
              <div>
                <strong>Supabase PostgreSQL Database</strong>
                <p>11 relational tables configured with foreign keys, indexes, and real-time sync</p>
              </div>
            </div>

            <div className="check-item">
              <div className="check-bullet pending">○</div>
              <div>
                <strong>Templates & Campaigns Module</strong>
                <p>{templatesCount} template(s) ready for Meta verification step</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mb-6 { margin-bottom: 1.5rem; }
        .text-amber { color: var(--amber-500); }
        .text-muted { color: var(--slate-500); font-size: 0.875rem; }

        .system-notice-card {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .notice-icon-bg {
          width: 48px;
          height: 48px;
          background-color: #fef3c7;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notice-content {
          flex: 1;
        }

        .notice-content h4 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #92400e;
        }

        .notice-content p {
          font-size: 0.8125rem;
          color: #b45309;
          margin-top: 0.2rem;
        }

        .inquiry-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .inquiry-item {
          padding: 0.875rem 1rem;
          background-color: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .inquiry-main {
          display: flex;
          flex-direction: column;
        }

        .inquiry-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--navy-900);
        }

        .inquiry-notes {
          font-size: 0.75rem;
          color: var(--slate-500);
          max-width: 320px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .inquiry-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .inquiry-date {
          font-size: 0.75rem;
          color: var(--slate-400);
        }

        .foundation-checklist {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .check-item {
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }

        .check-bullet {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .check-bullet.active {
          background-color: #d1fae5;
          color: #047857;
        }

        .check-bullet.pending {
          background-color: var(--slate-100);
          color: var(--slate-400);
          border: 1px solid var(--slate-300);
        }

        .check-item strong {
          display: block;
          font-size: 0.875rem;
          color: var(--navy-900);
        }

        .check-item p {
          font-size: 0.75rem;
          color: var(--slate-500);
        }
      `}</style>
    </div>
  );
};
