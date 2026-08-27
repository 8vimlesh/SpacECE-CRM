import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Contact } from '../db/database';
import {
  Plus,
  Search,
  Tag,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  Upload,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface CsvRowPreview {
  rowIndex: number;
  name: string;
  phone: string;
  studentClass: string;
  tags: string[];
  optedOut: boolean;
  status: 'valid' | 'duplicate' | 'invalid';
  reason?: string;
}

export const ContactsView: React.FC = () => {
  const contacts = useLiveQuery(() => db.contacts.toArray(), [], []);
  const allInquiries = useLiveQuery(() => db.inquiries.toArray(), [], []);
  const allMessages = useLiveQuery(() => db.messages.toArray(), [], []);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Add Contact Form State
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addStudentClass, setAddStudentClass] = useState('');
  const [addTags, setAddTags] = useState('Parent');
  const [addOptedOut, setAddOptedOut] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Edit Contact Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editOptedOut, setEditOptedOut] = useState(false);

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<CsvRowPreview[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // Filtered contacts list by search query
  const filteredContacts = (contacts || []).filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.linkedStudentClass.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Duplicate Phone Check Helper
  const checkPhoneDuplicate = (phoneInput: string, currentId?: number) => {
    const cleanInput = phoneInput.replace(/[^\d]/g, '');
    if (!cleanInput) return null;

    return (contacts || []).find(
      (c) => c.id !== currentId && c.phone.replace(/[^\d]/g, '') === cleanInput
    );
  };

  // Add Contact Handler
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateWarning(null);

    if (!addName.trim() || !addPhone.trim()) {
      alert('Parent Name and Phone Number are required.');
      return;
    }

    // Check for duplicate phone
    const existing = checkPhoneDuplicate(addPhone);
    if (existing) {
      setDuplicateWarning(
        `Duplicate Contact Alert: A contact with phone number "${addPhone}" already exists for parent "${existing.name}". Duplicate contacts are prevented.`
      );
      return;
    }

    const tagsArray = addTags.split(',').map((t) => t.trim()).filter(Boolean);

    await db.contacts.add({
      name: addName.trim(),
      phone: addPhone.trim(),
      linkedStudentClass: addStudentClass.trim() || 'Student Class Pending',
      tags: tagsArray.length > 0 ? tagsArray : ['Parent'],
      status: 'Active',
      optedOut: addOptedOut,
      createdAt: new Date().toISOString()
    });

    setShowAddModal(false);
    setAddName('');
    setAddPhone('');
    setAddStudentClass('');
    setAddTags('Parent');
    setAddOptedOut(false);
  };

  // Open Edit Detail Modal
  const openDetailModal = (c: Contact) => {
    setSelectedContact(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditStudentClass(c.linkedStudentClass);
    setEditTags(c.tags.join(', '));
    setEditOptedOut(c.optedOut);
  };

  // Save Edit Contact
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContact?.id) {
      const tagsArray = editTags.split(',').map((t) => t.trim()).filter(Boolean);

      await db.contacts.update(selectedContact.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        linkedStudentClass: editStudentClass.trim(),
        tags: tagsArray,
        optedOut: editOptedOut
      });

      setSelectedContact(null);
    }
  };

  // Delete Contact
  const handleDeleteContact = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this contact record?')) {
      await db.contacts.delete(id);
      setSelectedContact(null);
    }
  };

  // Toggle Opt-Out Quick Status
  const handleToggleOptOut = async (contact: Contact) => {
    if (contact.id) {
      await db.contacts.update(contact.id, { optedOut: !contact.optedOut });
    }
  };

  // CSV File Upload & Parsing Handler
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSummary(null);
    setIsProcessingCsv(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndValidateCsv(text);
      setIsProcessingCsv(false);
    };
    reader.readAsText(file);
  };

  // Validate CSV Rows
  const parseAndValidateCsv = (csvText: string) => {
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      alert('CSV file is empty or missing data rows.');
      return;
    }

    const rows: CsvRowPreview[] = [];
    const csvSeenPhones = new Set<string>();

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const name = parts[0] || '';
      const phone = parts[1] || '';
      const studentClass = parts[2] || 'General';
      const rawTags = parts[3] || 'Parent';
      const optedOutStr = parts[4] || 'false';

      const tags = rawTags.split(';').map((t) => t.trim()).filter(Boolean);
      const optedOut = optedOutStr.toLowerCase() === 'true' || optedOutStr === '1';

      const cleanPhone = phone.replace(/[^\d]/g, '');

      let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
      let reason: string | undefined = undefined;

      // Validation Checks
      if (!name || !phone) {
        status = 'invalid';
        reason = 'Missing Name or Phone Number';
      } else if (csvSeenPhones.has(cleanPhone)) {
        status = 'duplicate';
        reason = 'Duplicate phone number inside CSV file';
      } else {
        const existingInDb = (contacts || []).find(
          (c) => c.phone.replace(/[^\d]/g, '') === cleanPhone
        );
        if (existingInDb) {
          status = 'duplicate';
          reason = `Matches existing DB contact (${existingInDb.name})`;
        }
      }

      if (cleanPhone) {
        csvSeenPhones.add(cleanPhone);
      }

      rows.push({
        rowIndex: i,
        name,
        phone,
        studentClass,
        tags: tags.length > 0 ? tags : ['Parent'],
        optedOut,
        status,
        reason
      });
    }

    setParsedRows(rows);
  };

  // Confirm CSV Import Handler
  const handleConfirmCsvImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'valid');
    const duplicateRows = parsedRows.filter((r) => r.status === 'duplicate');
    const invalidRows = parsedRows.filter((r) => r.status === 'invalid');

    if (validRows.length === 0) {
      alert('No valid contact records found to import.');
      return;
    }

    setIsProcessingCsv(true);

    const recordsToAdd = validRows.map((r) => ({
      name: r.name,
      phone: r.phone,
      linkedStudentClass: r.studentClass,
      tags: r.tags,
      status: 'Active' as const,
      optedOut: r.optedOut,
      createdAt: new Date().toISOString()
    }));

    await db.contacts.bulkAdd(recordsToAdd);

    setImportSummary({
      total: parsedRows.length,
      imported: validRows.length,
      skipped: duplicateRows.length,
      errors: invalidRows.length
    });

    setIsProcessingCsv(false);
  };

  return (
    <div className="contacts-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts Directory</h1>
          <p className="page-subtitle">
            Manage parent contacts, student class bindings, opt-out restrictions, and bulk CSV imports
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => setShowCsvModal(true)}>
            <Upload size={16} />
            <span>Import CSV</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>+ Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search Bar Card */}
      <div className="card mb-6">
        <div className="search-contacts-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search parent contacts by name, phone number, or student class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Parent Name</th>
              <th>Phone Number</th>
              <th>Linked Student / Class</th>
              <th>Tags</th>
              <th>WhatsApp Opt Status</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <div className="user-cell" onClick={() => openDetailModal(contact)} style={{ cursor: 'pointer' }}>
                      <div className="avatar-circle-sm">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong className="contact-name">{contact.name}</strong>
                        <span className="contact-id">ID: #{contact.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="phone-cell">
                      <Phone size={14} className="text-muted" />
                      <span>{contact.phone}</span>
                    </div>
                  </td>
                  <td>
                    <strong className="student-text">{contact.linkedStudentClass}</strong>
                  </td>
                  <td>
                    <div className="tags-cell">
                      {contact.tags.map((tag, idx) => (
                        <span key={idx} className="badge badge-neutral">
                          <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {contact.optedOut ? (
                      <span
                        className="badge badge-danger text-clickable"
                        onClick={() => handleToggleOptOut(contact)}
                        title="Click to toggle Opt-In status"
                      >
                        <ShieldAlert size={12} /> Opted Out (Restricted)
                      </span>
                    ) : (
                      <span
                        className="badge badge-success text-clickable"
                        onClick={() => handleToggleOptOut(contact)}
                        title="Click to toggle Opt-Out status"
                      >
                        <ShieldCheck size={12} /> Opted In
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        contact.status === 'Active'
                          ? 'badge-success'
                          : contact.status === 'Lead'
                          ? 'badge-warning'
                          : 'badge-neutral'
                      }`}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => openDetailModal(contact)} title="View / Edit Contact">
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDeleteContact(contact.id!)}
                        title="Delete Contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center p-4 text-muted">
                  {searchQuery ? `No contacts matching "${searchQuery}".` : 'No parent contacts found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD CONTACT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>+ Add New Parent Contact</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddContact}>
              <div className="modal-body">
                {duplicateWarning && (
                  <div className="alert alert-warning mb-4">
                    <AlertCircle size={18} />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Parent Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Phone Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Student & Class</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addStudentClass}
                    onChange={(e) => setAddStudentClass(e.target.value)}
                    placeholder="e.g. Aarav Sharma (Grade 2-B)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addTags}
                    onChange={(e) => setAddTags(e.target.value)}
                    placeholder="Parent, Fee Paid, High Priority"
                  />
                </div>

                <div className="form-group flex-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={addOptedOut}
                      onChange={(e) => setAddOptedOut(e.target.checked)}
                    />
                    <span>Mark as Opted-Out (Restricts WhatsApp Messages)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT & DETAIL MODAL */}
      {selectedContact && (
        <div className="modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Contact Details & Edit</h3>
                <p className="text-xs text-muted">ID: #{selectedContact.id}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedContact(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {/* Related Data Counters */}
                <div className="contact-meta-counts-card mb-4">
                  <div>
                    <span className="meta-count">
                      {(allInquiries || []).filter((i) => i.contactId === selectedContact.id).length}
                    </span>
                    <span className="meta-label">Linked Inquiries</span>
                  </div>
                  <div>
                    <span className="meta-count">
                      {(allMessages || []).filter((m) => m.contactId === selectedContact.id).length}
                    </span>
                    <span className="meta-label">Logged Messages</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Student & Class</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editStudentClass}
                    onChange={(e) => setEditStudentClass(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                  />
                </div>

                <div className="form-group flex-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editOptedOut}
                      onChange={(e) => setEditOptedOut(e.target.checked)}
                    />
                    <span>Opted-Out of WhatsApp Communication (Message Restriction Active)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-sm mr-auto"
                  onClick={() => handleDeleteContact(selectedContact.id!)}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedContact(null)}>
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

      {/* CSV BULK IMPORT MODAL */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal-content csv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Import Contacts from CSV</h3>
              <button className="modal-close" onClick={() => setShowCsvModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Step 1: File Picker */}
              {!importSummary ? (
                <>
                  <div className="csv-upload-box mb-4">
                    <FileSpreadsheet size={36} className="text-primary mb-2" />
                    <h4>Select CSV File to Upload</h4>
                    <p className="text-xs text-muted mb-3">
                      CSV format: <code>Name, Phone, StudentClass, Tags, OptedOut</code>
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileUpload}
                      className="csv-file-input"
                    />
                  </div>

                  {/* Step 2: Parsed Rows Preview & Validation */}
                  {parsedRows.length > 0 && (
                    <div className="csv-preview-container">
                      <div className="csv-preview-header">
                        <h4>Pre-Import Validation Preview ({parsedRows.length} Rows)</h4>
                        <div className="validation-counts">
                          <span className="badge badge-success">
                            {parsedRows.filter((r) => r.status === 'valid').length} Ready
                          </span>
                          <span className="badge badge-warning">
                            {parsedRows.filter((r) => r.status === 'duplicate').length} Duplicates (Skipped)
                          </span>
                          <span className="badge badge-danger">
                            {parsedRows.filter((r) => r.status === 'invalid').length} Errors
                          </span>
                        </div>
                      </div>

                      <div className="table-container max-h-60">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Name</th>
                              <th>Phone</th>
                              <th>Student Class</th>
                              <th>Import Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedRows.map((r) => (
                              <tr key={r.rowIndex}>
                                <td>#{r.rowIndex}</td>
                                <td>{r.name || '---'}</td>
                                <td>{r.phone || '---'}</td>
                                <td>{r.studentClass}</td>
                                <td>
                                  {r.status === 'valid' && (
                                    <span className="badge badge-success">
                                      <CheckCircle2 size={12} /> Ready
                                    </span>
                                  )}
                                  {r.status === 'duplicate' && (
                                    <span className="badge badge-warning" title={r.reason}>
                                      <AlertCircle size={12} /> Duplicate (Skipped)
                                    </span>
                                  )}
                                  {r.status === 'invalid' && (
                                    <span className="badge badge-danger" title={r.reason}>
                                      <AlertCircle size={12} /> Invalid Row
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Step 3: Summary Report */
                <div className="csv-summary-box text-center p-4">
                  <CheckCircle2 size={48} className="text-emerald mb-3" />
                  <h3>CSV Import Complete!</h3>
                  <div className="grid-4 my-4">
                    <div className="card">
                      <div className="stat-label">Total Processed</div>
                      <div className="stat-value">{importSummary.total}</div>
                    </div>
                    <div className="card">
                      <div className="stat-label">Imported</div>
                      <div className="stat-value text-emerald">{importSummary.imported}</div>
                    </div>
                    <div className="card">
                      <div className="stat-label">Skipped Duplicates</div>
                      <div className="stat-value text-amber">{importSummary.skipped}</div>
                    </div>
                    <div className="card">
                      <div className="stat-label">Invalid Rows</div>
                      <div className="stat-value text-rose">{importSummary.errors}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!importSummary ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCsvModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={parsedRows.filter((r) => r.status === 'valid').length === 0 || isProcessingCsv}
                    onClick={handleConfirmCsvImport}
                  >
                    {isProcessingCsv ? 'Importing...' : `Confirm Import (${parsedRows.filter((r) => r.status === 'valid').length} Records)`}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowCsvModal(false);
                    setParsedRows([]);
                    setImportSummary(null);
                  }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .my-4 { margin: 1rem 0; }
        .text-xs { font-size: 0.75rem; }
        .mr-auto { margin-right: auto; }
        .max-h-60 { max-height: 240px; overflow-y: auto; }
        .text-clickable { cursor: pointer; }

        .search-contacts-box {
          position: relative;
        }

        .search-contacts-box input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.6rem;
          font-size: 0.875rem;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          outline: none;
        }

        .search-contacts-box input:focus {
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }

        .search-contacts-box .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--slate-400);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar-circle-sm {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
        }

        .contact-name {
          color: var(--navy-900);
          display: block;
        }

        .contact-id {
          font-size: 0.6875rem;
          color: var(--slate-400);
        }

        .phone-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
        }

        .student-text {
          color: var(--primary-700);
        }

        .tags-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.4rem;
        }

        .btn-icon {
          background: transparent;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-sm);
          padding: 0.3rem;
          color: var(--slate-600);
          cursor: pointer;
        }

        .btn-icon:hover {
          background-color: var(--slate-100);
          color: var(--navy-900);
        }

        .btn-icon.danger:hover {
          background-color: #ffe4e6;
          color: #e11d48;
          border-color: #fecdd3;
        }

        .flex-row {
          display: flex;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--slate-700);
          cursor: pointer;
        }

        .contact-meta-counts-card {
          display: flex;
          justify-content: space-around;
          padding: 1rem;
          background-color: var(--slate-50);
          border-radius: var(--radius-md);
          border: 1px solid var(--slate-200);
          text-align: center;
        }

        .meta-count {
          display: block;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .meta-label {
          font-size: 0.75rem;
          color: var(--slate-500);
        }

        .csv-modal {
          max-width: 800px;
        }

        .csv-upload-box {
          border: 2px dashed var(--slate-300);
          border-radius: var(--radius-lg);
          padding: 2rem;
          text-align: center;
          background-color: var(--slate-50);
        }

        .csv-file-input {
          font-size: 0.875rem;
        }

        .csv-preview-container {
          background-color: #ffffff;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        .csv-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .csv-preview-header h4 {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .validation-counts {
          display: flex;
          gap: 0.4rem;
        }
      `}</style>
    </div>
  );
};
