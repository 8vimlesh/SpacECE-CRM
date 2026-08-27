import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Template } from '../db/database';
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Code,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

type StatusFilter = 'all' | 'APPROVED' | 'PENDING' | 'REJECTED';

export const TemplatesView: React.FC = () => {
  const templates = useLiveQuery(() => db.templates.toArray(), [], []);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Form State for Create
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState<string>('Fee Reminder');
  const [createBody, setCreateBody] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State for Edit
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<string>('Fee Reminder');
  const [editStatus, setEditStatus] = useState<Template['status']>('PENDING');
  const [editBody, setEditBody] = useState('');

  const categories = [
    'Fee Reminder',
    'Admission Confirmation',
    'Event Invite',
    'Holiday Notice',
    'General Utility'
  ];

  // Filter templates
  const filteredTemplates = (templates || []).filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.messageBody.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'all') {
      return tpl.status === statusFilter;
    }

    return true;
  });

  // Create Template Handler
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const formattedName = createName.trim().toLowerCase().replace(/\s+/g, '_');

    if (!formattedName) {
      setCreateError('Template Name is required.');
      return;
    }

    if (!createBody.trim()) {
      setCreateError('Message Body is required.');
      return;
    }

    // Check duplicate name
    const existing = (templates || []).find((t) => t.name.toLowerCase() === formattedName);
    if (existing) {
      setCreateError(`A template with name "${formattedName}" already exists.`);
      return;
    }

    await db.templates.add({
      name: formattedName,
      category: createCategory,
      status: 'PENDING', // Initialized as PENDING Meta Review
      messageBody: createBody.trim(),
      createdAt: new Date().toISOString()
    });

    setShowCreateModal(false);
    setCreateName('');
    setCreateBody('');
    setCreateCategory('Fee Reminder');
  };

  // Open Edit Detail Modal
  const openEditModal = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setEditName(tpl.name);
    setEditCategory(tpl.category);
    setEditStatus(tpl.status);
    setEditBody(tpl.messageBody);
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplate?.id) {
      await db.templates.update(selectedTemplate.id, {
        name: editName.trim().toLowerCase().replace(/\s+/g, '_'),
        category: editCategory,
        status: editStatus,
        messageBody: editBody.trim()
      });
      setSelectedTemplate(null);
    }
  };

  // Delete Template Handler
  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this message template?')) {
      await db.templates.delete(id);
      setSelectedTemplate(null);
    }
  };

  return (
    <div className="templates-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Message Templates</h1>
          <p className="page-subtitle">
            Manage Meta WhatsApp approved template formats for parent announcements & automated notifications
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>+ Create Template</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card mb-6">
        <div className="filter-controls-flex">
          <div className="search-box-flex">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search templates by name, category, or body text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="status-filter-pills">
            <button
              className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All <span>({(templates || []).length})</span>
            </button>
            <button
              className={`pill-btn ${statusFilter === 'APPROVED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('APPROVED')}
            >
              Approved <span>({(templates || []).filter((t) => t.status === 'APPROVED').length})</span>
            </button>
            <button
              className={`pill-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending <span>({(templates || []).filter((t) => t.status === 'PENDING').length})</span>
            </button>
            <button
              className={`pill-btn ${statusFilter === 'REJECTED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('REJECTED')}
            >
              Rejected <span>({(templates || []).filter((t) => t.status === 'REJECTED').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid Container */}
      <div className="grid-3">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((tpl) => (
            <div key={tpl.id} className="card template-card">
              <div className="card-header">
                <div>
                  <span className="template-category-badge">{tpl.category}</span>
                  <h3 className="card-title mt-1" title={tpl.name}>
                    {tpl.name}
                  </h3>
                </div>

                {tpl.status === 'APPROVED' ? (
                  <span className="badge badge-success">
                    <CheckCircle size={12} /> Approved
                  </span>
                ) : tpl.status === 'PENDING' ? (
                  <span className="badge badge-warning">
                    <Clock size={12} /> Pending Review
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <XCircle size={12} /> Rejected
                  </span>
                )}
              </div>

              <div className="template-body-box" onClick={() => openEditModal(tpl)} style={{ cursor: 'pointer' }}>
                <Code size={16} className="code-icon" />
                <p>{tpl.messageBody}</p>
              </div>

              <div className="template-card-footer">
                <span className="text-muted text-xs">
                  Created: {new Date(tpl.createdAt).toLocaleDateString()}
                </span>
                <div className="card-action-btns">
                  <button className="btn btn-outline btn-sm" onClick={() => openEditModal(tpl)}>
                    <Edit size={14} /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: 'span 3' }}>
            <FileText size={40} />
            <p>
              {statusFilter !== 'all'
                ? `No templates found with status "${statusFilter}".`
                : searchQuery
                ? `No templates matching "${searchQuery}".`
                : 'No message templates created yet.'}
            </p>
          </div>
        )}
      </div>

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>+ Create WhatsApp Message Template</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="modal-body">
                {createError && (
                  <div className="alert alert-danger mb-4">
                    <AlertCircle size={18} />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Template Name (identifier) *</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. fee_reminder_q4"
                    required
                  />
                  <span className="form-helper-text">Unique lowercase identifier (e.g. fee_reminder_q4).</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Body Text *</label>
                  <textarea
                    className="form-textarea font-mono"
                    rows={4}
                    value={createBody}
                    onChange={(e) => setCreateBody(e.target.value)}
                    placeholder="e.g. Hello {{1}}, your fee for {{2}} is due on {{3}}. Thank you, Spacece India Foundation."
                    required
                  />
                  <span className="form-helper-text">
                    Use <code>&#123;&#123;1&#125;&#125;</code>, <code>&#123;&#123;2&#125;&#125;</code> for dynamic parameters (Parent Name, Class, Date). Initial status will be set to <strong>Pending</strong>.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save & Submit Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Template Details & Status Editor</h3>
                <p className="text-xs text-muted">ID: #{selectedTemplate.id}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedTemplate(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Approval Status</label>
                  <select
                    className="form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Template['status'])}
                  >
                    <option value="APPROVED">APPROVED (Meta Verified)</option>
                    <option value="PENDING">PENDING (Under Review)</option>
                    <option value="REJECTED">REJECTED (Declined)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Body</label>
                  <textarea
                    className="form-textarea font-mono"
                    rows={5}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-sm mr-auto"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id!)}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mt-1 { margin-top: 0.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .text-xs { font-size: 0.75rem; }
        .font-mono { font-family: 'Fira Code', monospace; }
        .mr-auto { margin-right: auto; }

        .filter-controls-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .search-box-flex {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-box-flex input {
          width: 100%;
          padding: 0.5rem 1rem 0.5rem 2.4rem;
          font-size: 0.84375rem;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          outline: none;
        }

        .search-box-flex .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--slate-400);
        }

        .status-filter-pills {
          display: flex;
          gap: 0.5rem;
        }

        .pill-btn {
          padding: 0.4rem 0.875rem;
          font-size: 0.78125rem;
          font-weight: 700;
          border-radius: var(--radius-full);
          border: 1px solid var(--slate-200);
          background-color: var(--slate-100);
          color: var(--slate-700);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pill-btn:hover {
          background-color: var(--slate-200);
        }

        .pill-btn.active {
          background-color: var(--navy-900);
          color: #ffffff;
          border-color: var(--navy-900);
        }

        .template-card {
          display: flex;
          flex-direction: column;
        }

        .template-category-badge {
          font-size: 0.6875rem;
          font-weight: 800;
          color: var(--primary-700);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .template-body-box {
          background-color: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 1rem;
          font-size: 0.8125rem;
          color: var(--slate-700);
          line-height: 1.5;
          margin: 1rem 0;
          flex: 1;
          position: relative;
        }

        .code-icon {
          position: absolute;
          right: 0.75rem;
          top: 0.75rem;
          color: var(--slate-300);
        }

        .template-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--slate-100);
        }

        .card-action-btns {
          display: flex;
          gap: 0.4rem;
        }
      `}</style>
    </div>
  );
};
