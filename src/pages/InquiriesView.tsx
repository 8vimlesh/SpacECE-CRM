import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { inquiriesService } from '../services/inquiriesService';
import { contactsService } from '../services/contactsService';
import type { Inquiry, Contact } from '../db/database';
import { triggerAutomationEvent } from '../services/automationEngine';
import {
  Plus,
  Calendar,
  User,
  Filter,
  Phone,
  Edit,
  Trash2,
  X,
  Save
} from 'lucide-react';

type FilterMode = 'all' | 'overdue' | 'today' | 'tomorrow' | 'ongoing' | 'upcoming';

export const InquiriesView: React.FC = () => {
  const { data: inquiries, refetch: refetchInquiries } = useSupabaseData('inquiries', () => inquiriesService.getAll());
  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());

  // UI State
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [draggingInquiryId, setDraggingInquiryId] = useState<number | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Form State for New Inquiry
  const [newContactId, setNewContactId] = useState<number | ''>('');
  const [newStage, setNewStage] = useState<Inquiry['pipelineStage']>('New Inquiry');
  const [newFollowUpDate, setNewFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  // Form State for Edit Inquiry
  const [editStage, setEditStage] = useState<Inquiry['pipelineStage']>('New Inquiry');
  const [editFollowUpDate, setEditFollowUpDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Contact Lookup Map
  const contactsMap: Record<number, Contact> = {};
  (contacts || []).forEach(c => {
    if (c.id) contactsMap[c.id] = c;
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const stages: Inquiry['pipelineStage'][] = [
    'New Inquiry',
    'Contacted',
    'Interested',
    'Admitted'
  ];

  // Date Urgency Helper
  const getDateUrgency = (dateStr: string, stage: string) => {
    if (stage === 'Admitted') {
      return { label: 'Admitted', color: 'badge-success' };
    }
    if (dateStr < todayStr) {
      return { label: 'Overdue', color: 'badge-danger' };
    }
    if (dateStr === todayStr) {
      return { label: 'Due Today', color: 'badge-warning' };
    }
    if (dateStr === tomorrowStr) {
      return { label: 'Due Tomorrow', color: 'badge-info' };
    }
    return { label: 'Upcoming', color: 'badge-neutral' };
  };

  // Filter Pipeline Inquiries based on selected FilterMode
  const filteredInquiries = (inquiries || []).filter((inq) => {
    const urgency = getDateUrgency(inq.followUpDate, inq.pipelineStage);

    switch (activeFilter) {
      case 'overdue':
        return urgency.label === 'Overdue';
      case 'today':
        return inq.followUpDate === todayStr;
      case 'tomorrow':
        return inq.followUpDate === tomorrowStr;
      case 'ongoing':
        return inq.pipelineStage !== 'Admitted';
      case 'upcoming':
        return inq.followUpDate >= todayStr || inq.pipelineStage === 'Admitted';
      default:
        return true;
    }
  });

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    setDraggingInquiryId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Inquiry['pipelineStage']) => {
    e.preventDefault();
    const inquiryIdStr = e.dataTransfer.getData('text/plain');
    if (!inquiryIdStr) return;

    const id = Number(inquiryIdStr);
    const existing = (inquiries || []).find((i) => i.id === id);
    if (existing) {
      await inquiriesService.update(id, { pipelineStage: targetStage });
      refetchInquiries();

      // Trigger Automation Event for Stage Change
      triggerAutomationEvent('INQUIRY_STAGE_CHANGED', {
        inquiryId: id,
        contactId: existing.contactId,
        pipelineStage: targetStage
      });
    }
    setDraggingInquiryId(null);
  };

  // Create Inquiry Handler
  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactId) {
      alert('Please select a parent contact for this inquiry.');
      return;
    }

    const created = await inquiriesService.add({
      contactId: Number(newContactId),
      pipelineStage: newStage,
      followUpDate: newFollowUpDate,
      notes: newNotes.trim() || 'No initial notes.',
      createdAt: new Date().toISOString()
    });
    refetchInquiries();

    // Trigger Automation Engine
    if (created?.id) {
      triggerAutomationEvent('INQUIRY_CREATED', {
        inquiryId: created.id,
        contactId: Number(newContactId),
        pipelineStage: newStage
      });
    }

    setShowCreateModal(false);
    setNewContactId('');
    setNewNotes('');
    setNewFollowUpDate(new Date().toISOString().split('T')[0]);
  };

  // Open Edit Modal Handler
  const openEditModal = (inq: Inquiry) => {
    setSelectedInquiry(inq);
    setEditStage(inq.pipelineStage);
    setEditFollowUpDate(inq.followUpDate);
    setEditNotes(inq.notes);
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInquiry?.id) {
      await inquiriesService.update(selectedInquiry.id, {
        pipelineStage: editStage,
        followUpDate: editFollowUpDate,
        notes: editNotes.trim()
      });
      refetchInquiries();
      setSelectedInquiry(null);
    }
  };

  // Delete Inquiry Handler
  const handleDeleteInquiry = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this admission inquiry record?')) {
      await inquiriesService.delete(id);
      setSelectedInquiry(null);
      refetchInquiries();
    }
  };

  return (
    <div className="inquiries-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admission Inquiry Board</h1>
          <p className="page-subtitle">
            Manage prospective parent leads across 4 admission stages with drag-and-drop workflow
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>+ New Inquiry</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="filter-bar-card mb-6">
        <div className="filter-bar-header">
          <Filter size={16} className="text-muted" />
          <span className="filter-label">Filter Board Views:</span>
        </div>

        <div className="filter-pills-row">
          <button
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Inquiries <span>({(inquiries || []).length})</span>
          </button>

          <button
            className={`filter-pill overdue ${activeFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveFilter('overdue')}
          >
            Overdue Callbacks
            <span className="count-tag danger">
              {(inquiries || []).filter(i => i.followUpDate < todayStr && i.pipelineStage !== 'Admitted').length}
            </span>
          </button>

          <button
            className={`filter-pill today ${activeFilter === 'today' ? 'active' : ''}`}
            onClick={() => setActiveFilter('today')}
          >
            Today's Tasks
            <span className="count-tag warning">
              {(inquiries || []).filter(i => i.followUpDate === todayStr).length}
            </span>
          </button>

          <button
            className={`filter-pill tomorrow ${activeFilter === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setActiveFilter('tomorrow')}
          >
            Tomorrow's Tasks
            <span className="count-tag info">
              {(inquiries || []).filter(i => i.followUpDate === tomorrowStr).length}
            </span>
          </button>

          <button
            className={`filter-pill ${activeFilter === 'ongoing' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ongoing')}
          >
            Ongoing & Completed
          </button>

          <button
            className={`filter-pill ${activeFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveFilter('upcoming')}
          >
            Upcoming & Completed
          </button>
        </div>
      </div>

      {/* 4-Column Drag and Drop Kanban Board */}
      <div className="kanban-board-container">
        {stages.map((stage) => {
          const stageInquiries = filteredInquiries.filter((i) => i.pipelineStage === stage);

          return (
            <div
              key={stage}
              className={`kanban-column stage-${stage.toLowerCase().replace(/\s+/g, '-')}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className="column-header">
                <div className="header-title-box">
                  <span className="stage-dot" />
                  <h4>{stage}</h4>
                </div>
                <span className="column-count-badge">{stageInquiries.length}</span>
              </div>

              {/* Column Cards Container */}
              <div className="column-cards-scroll">
                {stageInquiries.length > 0 ? (
                  stageInquiries.map((inq) => {
                    const contact = contactsMap[inq.contactId];
                    const urgency = getDateUrgency(inq.followUpDate, inq.pipelineStage);

                    return (
                      <div
                        key={inq.id}
                        className={`card inquiry-card ${draggingInquiryId === inq.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, inq.id!)}
                        onClick={() => openEditModal(inq)}
                      >
                        <div className="card-top-row">
                          <div className="parent-info">
                            <User size={14} className="icon-parent" />
                            <strong className="parent-name">
                              {contact?.name || `Contact #${inq.contactId}`}
                            </strong>
                          </div>
                          <span className={`badge ${urgency.color}`}>
                            {urgency.label}
                          </span>
                        </div>

                        {contact?.phone && (
                          <div className="card-phone-row">
                            <Phone size={12} className="text-muted" />
                            <span>{contact.phone}</span>
                          </div>
                        )}

                        <div className="card-student-tag">
                          {contact?.linkedStudentClass || 'No student class assigned'}
                        </div>

                        <p className="card-notes-preview">{inq.notes}</p>

                        <div className="card-footer-row">
                          <div className="followup-date">
                            <Calendar size={13} />
                            <span>{inq.followUpDate}</span>
                          </div>
                          <button className="edit-btn-quick" title="View details & edit">
                            <Edit size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="column-empty-box">
                    <span>No inquiries in this stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW INQUIRY MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Admission Inquiry</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInquiry}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Linked Parent Contact *</label>
                  <select
                    className="form-select"
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">-- Select Parent Contact --</option>
                    {(contacts || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.linkedStudentClass}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Pipeline Stage</label>
                  <select
                    className="form-select"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as Inquiry['pipelineStage'])}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Requirements</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Enter parent preferences, preferred class, transport inquiry, etc."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Create Inquiry Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INQUIRY DETAIL MODAL */}
      {selectedInquiry && (
        <div className="modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Inquiry Details & Edit</h3>
                <p className="text-xs text-muted">ID: #{selectedInquiry.id}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedInquiry(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {/* Contact Summary Info */}
                {contactsMap[selectedInquiry.contactId] && (
                  <div className="contact-summary-card mb-4">
                    <strong>{contactsMap[selectedInquiry.contactId].name}</strong>
                    <div className="text-xs text-muted">
                      Phone: {contactsMap[selectedInquiry.contactId].phone} • Class: {contactsMap[selectedInquiry.contactId].linkedStudentClass}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Pipeline Stage</label>
                  <select
                    className="form-select"
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value as Inquiry['pipelineStage'])}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editFollowUpDate}
                    onChange={(e) => setEditFollowUpDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Activity</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-sm mr-auto"
                  onClick={() => handleDeleteInquiry(selectedInquiry.id!)}
                >
                  <Trash2 size={14} /> Delete
                </button>

                <button type="button" className="btn btn-secondary" onClick={() => setSelectedInquiry(null)}>
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

      {/* Master Styles for Kanban Board */}
      <style>{`
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .text-xs { font-size: 0.75rem; }
        .mr-auto { margin-right: auto; }

        .filter-bar-card {
          background-color: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: var(--shadow-sm);
        }

        .filter-bar-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .filter-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--slate-700);
        }

        .filter-pills-row {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          flex: 1;
        }

        .filter-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.875rem;
          border-radius: var(--radius-full);
          font-size: 0.78125rem;
          font-weight: 700;
          background-color: var(--slate-100);
          border: 1px solid var(--slate-200);
          color: var(--slate-700);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .filter-pill:hover {
          background-color: var(--slate-200);
        }

        .filter-pill.active {
          background-color: var(--navy-900);
          color: #ffffff;
          border-color: var(--navy-900);
        }

        .count-tag {
          font-size: 0.6875rem;
          padding: 0.05rem 0.4rem;
          border-radius: var(--radius-full);
          line-height: 1;
        }

        .count-tag.danger { background-color: #ffe4e6; color: #be123c; }
        .count-tag.warning { background-color: #fef3c7; color: #b45309; }
        .count-tag.info { background-color: #e0f2fe; color: #0369a1; }

        /* Kanban Board Grid */
        .kanban-board-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
          min-height: calc(100vh - 280px);
          overflow-x: auto;
        }

        @media (max-width: 1200px) {
          .kanban-board-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kanban-board-container {
            grid-template-columns: 1fr;
          }
        }

        .kanban-column {
          background-color: var(--slate-100);
          border-radius: var(--radius-lg);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          transition: border-color 0.2s ease;
        }

        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--slate-200);
        }

        .header-title-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-title-box h4 {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--primary-600);
        }

        .column-count-badge {
          background-color: var(--slate-200);
          color: var(--slate-700);
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.1rem 0.5rem;
          border-radius: var(--radius-full);
        }

        .column-cards-scroll {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          flex: 1;
        }

        .inquiry-card {
          background-color: #ffffff;
          border-radius: var(--radius-md);
          padding: 1rem;
          box-shadow: var(--shadow-sm);
          cursor: grab;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .inquiry-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .inquiry-card.dragging {
          opacity: 0.5;
          border: 2px dashed var(--primary-600);
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.35rem;
        }

        .parent-info {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .icon-parent {
          color: var(--primary-600);
        }

        .parent-name {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .card-phone-row {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--slate-600);
          margin-bottom: 0.25rem;
        }

        .card-student-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-700);
          margin-bottom: 0.5rem;
        }

        .card-notes-preview {
          font-size: 0.8125rem;
          color: var(--slate-600);
          line-height: 1.4;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid var(--slate-100);
        }

        .followup-date {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--slate-500);
        }

        .edit-btn-quick {
          background: transparent;
          border: none;
          color: var(--slate-400);
          cursor: pointer;
        }

        .edit-btn-quick:hover {
          color: var(--navy-900);
        }

        .column-empty-box {
          padding: 2.5rem 1rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--slate-400);
          border: 1px dashed var(--slate-300);
          border-radius: var(--radius-md);
        }

        .contact-summary-card {
          background-color: var(--slate-50);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--slate-200);
        }
      `}</style>
    </div>
  );
};
