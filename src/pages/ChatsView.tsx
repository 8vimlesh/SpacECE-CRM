import React, { useState, useEffect, useRef } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { contactsService } from '../services/contactsService';
import { messagesService } from '../services/messagesService';
import { inquiriesService } from '../services/inquiriesService';
import { whatsappSettingsService } from '../services/whatsappSettingsService';
import type { Contact, Message } from '../db/database';
import {
  sendWhatsAppMessage,
  markConversationAsRead,
  receiveIncomingWhatsAppMessage
} from '../services/whatsappService';
import {
  Search,
  Send,
  CheckCheck,
  ShieldCheck,
  ShieldAlert,
  PanelRightOpen,
  PanelRightClose,
  Phone,
  Tag,
  Plus,
  Zap,
  Info,
  RefreshCw,
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface ConversationItem {
  contact: Contact;
  latestMessage: Message | null;
  unreadCount: number;
}

const renderFormattedMessageText = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="chat-inline-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const ChatsView: React.FC = () => {
  // Supabase queries
  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());
  const { data: allMessages } = useSupabaseData('messages', () => messagesService.getAll());
  const { data: inquiries } = useSupabaseData('inquiries', () => inquiriesService.getAll());
  const { data: settingsList } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const settings = settingsList?.[0];

  // UI State
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [showRightSidepanel, setShowRightSidepanel] = useState(true);

  // Composer State
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; msg: string; waLink?: string } | null>(null);

  // Test Incoming Message Modal State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simPhone, setSimPhone] = useState('+91 98765 43210');
  const [simName, setSimName] = useState('Rajesh Sharma');
  const [simContent, setSimContent] = useState('Hello, I would like to inquire about Nursery admission fees for next month.');
  const [isSimulating, setIsSimulating] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const isApiConnected = settings?.connectionStatus === 'CONNECTED';

  // Aggregate Conversations List (Contacts + Messages + Unread Counts)
  const conversations: ConversationItem[] = (contacts || []).map((contact) => {
    const contactMsgs = (allMessages || []).filter((m) => m.contactId === contact.id);
    contactMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latestMessage = contactMsgs[0] || null;
    const unreadCount = contactMsgs.filter((m) => m.direction === 'in' && m.status !== 'read').length;

    return {
      contact,
      latestMessage,
      unreadCount
    };
  });

  // Sort conversations by latest message timestamp descending
  conversations.sort((a, b) => {
    const timeA = a.latestMessage ? new Date(a.latestMessage.timestamp).getTime() : 0;
    const timeB = b.latestMessage ? new Date(b.latestMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // Default select first conversation if none selected
  useEffect(() => {
    if (!selectedContactId && conversations.length > 0) {
      setSelectedContactId(conversations[0].contact.id || null);
    }
  }, [conversations, selectedContactId]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedContactId) {
      markConversationAsRead(selectedContactId).catch(console.error);
    }
  }, [selectedContactId, allMessages]);

  // Auto-scroll chat window to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContactId, allMessages]);

  // Filter conversations by Search & Filter Tabs
  const filteredConversations = conversations.filter((item) => {
    const matchesSearch =
      item.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contact.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterTab === 'unread') {
      return item.unreadCount > 0;
    }

    return true;
  });

  // Active Selected Contact Object
  const activeContact = (contacts || []).find((c) => c.id === selectedContactId) || null;

  const activeMessages = (allMessages || [])
    .filter((m) => m.contactId === selectedContactId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Linked Inquiry info for active contact
  const linkedInquiry = (inquiries || []).find((i) => i.contactId === selectedContactId) || null;

  // Send Outgoing WhatsApp Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContactId || !activeContact) return;

    setIsSending(true);
    setSendFeedback(null);

    const textToSend = messageInput.trim();

    try {
      const result = await sendWhatsAppMessage({
        contactId: selectedContactId,
        recipientPhone: activeContact.phone,
        messageText: textToSend
      });

      if (result.success) {
        setMessageInput('');
        setSendFeedback({
          type: 'success',
          msg: 'Message dispatched successfully via Meta WhatsApp Cloud API!'
        });
      } else {
        setSendFeedback({
          type: 'error',
          msg: result.error || 'Failed to dispatch message'
        });
      }
    } catch (err: any) {
      setSendFeedback({
        type: 'error',
        msg: `Error: ${err.message || 'Failed to send message'}`
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setSendFeedback(null), 6000);
    }
  };

  // Simulate Incoming Message Handler
  const handleSimulateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simContent.trim() || !simPhone.trim()) return;

    setIsSimulating(true);
    try {
      const { contact } = await receiveIncomingWhatsAppMessage({
        phone: simPhone.trim(),
        parentName: simName.trim() || 'Parent',
        content: simContent.trim()
      });

      setSelectedContactId(contact.id || null);
      setShowSimulateModal(false);
      setSimContent('');
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="chats-view-page">
      {/* Three-Panel WhatsApp CRM Inbox Layout */}
      <div className="inbox-3panel-container">
        
        {/* PANEL 1: LEFT CONVERSATION LIST */}
        <div className="panel-left-conversations">
          {/* Header & Search */}
          <div className="conv-header">
            <div className="conv-title-row">
              <h3>Parent Conversations</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowSimulateModal(true)}
                title="Test receiving an incoming parent WhatsApp message"
              >
                <Plus size={14} /> Test Incoming
              </button>
            </div>

            {/* Search Input */}
            <div className="search-bar-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Tabs: All vs Unread */}
            <div className="filter-tabs-row">
              <button
                className={`tab-btn ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All <span>({conversations.length})</span>
              </button>
              <button
                className={`tab-btn ${filterTab === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterTab('unread')}
              >
                Unread{' '}
                {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
                  <span className="unread-pill">
                    {conversations.filter((c) => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation List Container */}
          <div className="conv-list-scroll">
            {filteredConversations.length > 0 ? (
              filteredConversations.map(({ contact, latestMessage, unreadCount }) => {
                const isSelected = contact.id === selectedContactId;
                const formattedTime = latestMessage
                  ? new Date(latestMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={contact.id}
                    className={`conv-card-item ${isSelected ? 'selected' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
                    onClick={() => setSelectedContactId(contact.id || null)}
                  >
                    <div className="avatar-circle">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="conv-card-main">
                      <div className="conv-card-top">
                        <span className="contact-title" title={contact.name}>
                          {contact.name}
                        </span>
                        <span className="msg-time">{formattedTime}</span>
                      </div>

                      <div className="contact-student-tag">{contact.linkedStudentClass}</div>

                      <div className="conv-card-bottom">
                        <span className="msg-snippet">
                          {latestMessage ? (
                            <>
                              {latestMessage.direction === 'out' && (
                                <CheckCheck size={14} className="snippet-icon" />
                              )}
                              {latestMessage.content}
                            </>
                          ) : (
                            <em>No messages yet</em>
                          )}
                        </span>

                        {unreadCount > 0 && (
                          <span className="badge-unread-count">{unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-conv-state">
                <Info size={32} />
                <p>
                  {filterTab === 'unread'
                    ? 'No unread conversations found.'
                    : searchQuery
                    ? `No conversations matching "${searchQuery}".`
                    : 'No conversations in database.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: CENTER THREAD & COMPOSER */}
        <div className="panel-center-thread">
          {activeContact ? (
            <>
              {/* Thread Header Bar */}
              <div className="thread-header-bar">
                <div className="thread-header-left">
                  <div className="avatar-circle-md">
                    {activeContact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="active-name">{activeContact.name}</h4>
                    <span className="active-phone">
                      <Phone size={12} /> {activeContact.phone} • {activeContact.linkedStudentClass}
                    </span>
                  </div>
                </div>

                <div className="thread-header-right">
                  <span className={`badge ${isApiConnected ? 'badge-success' : 'badge-warning'}`}>
                    {isApiConnected ? 'Meta API Connected' : 'API Disconnected'}
                  </span>

                  <button
                    className="sidepanel-toggle-btn"
                    onClick={() => setShowRightSidepanel(!showRightSidepanel)}
                    title="Toggle Parent Info Sidepanel"
                  >
                    {showRightSidepanel ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                  </button>
                </div>
              </div>

              {/* Message History Window */}
              <div className="thread-messages-scroll">
                {activeMessages.length > 0 ? (
                  activeMessages.map((msg) => {
                    const isOut = msg.direction === 'out';
                    const msgTime = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`message-row ${isOut ? 'outgoing-row' : 'incoming-row'}`}
                      >
                        <div className={`message-bubble-card ${isOut ? 'out-bubble' : 'in-bubble'}`}>
                          <div className="bubble-text">{renderFormattedMessageText(msg.content)}</div>

                          <div className="bubble-footer-meta">
                            <span className="meta-time">{msgTime}</span>
                            {isOut && (
                              <span className="meta-status">
                                <CheckCheck
                                  size={14}
                                  className={msg.status === 'read' ? 'status-blue' : 'status-gray'}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="thread-empty-box">
                    <FileText size={36} />
                    <p>No messages logged for {activeContact.name} yet.</p>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Feedback Alert */}
              {sendFeedback && (
                <div className={`composer-feedback-alert ${sendFeedback.type}`}>
                  {sendFeedback.type === 'success' ? <CheckCheck size={16} /> : <AlertCircle size={16} />}
                  <span>{sendFeedback.msg}</span>
                </div>
              )}

              {/* Disconnected Warning Bar if not connected */}
              {!isApiConnected && (
                <div className="api-notice-bar">
                  <AlertCircle size={14} />
                  <span>WhatsApp API is disconnected. Outgoing messages will log locally in CRM database.</span>
                </div>
              )}

              {/* Message Composer Footer */}
              <form className="thread-composer-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="composer-input"
                  placeholder={`Reply to ${activeContact.name} via WhatsApp...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className="btn btn-primary composer-send-btn"
                  disabled={isSending || !messageInput.trim()}
                >
                  {isSending ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-center-state">
              <Info size={44} />
              <p>Select a parent conversation from the left inbox to view message history.</p>
            </div>
          )}
        </div>

        {/* PANEL 3: RIGHT PARENT INFO SIDEPANEL */}
        {showRightSidepanel && activeContact && (
          <div className="panel-right-info">
            <div className="sidepanel-header">
              <h4>Parent Profile</h4>
            </div>

            <div className="sidepanel-content-scroll">
              {/* Profile Avatar Card */}
              <div className="profile-summary-box">
                <div className="avatar-circle-lg">
                  {activeContact.name.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="profile-name">{activeContact.name}</h3>
                <span className="profile-phone">{activeContact.phone}</span>
                <span className={`badge mt-2 ${activeContact.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {activeContact.status} Contact
                </span>
              </div>

              {/* Student Binding Card */}
              <div className="info-section-card">
                <div className="info-label">LINKED STUDENT & CLASS</div>
                <div className="info-value-highlight">{activeContact.linkedStudentClass}</div>
              </div>

              {/* WhatsApp Opt Status */}
              <div className="info-section-card">
                <div className="info-label">WHATSAPP COMPLIANCE</div>
                {activeContact.optedOut ? (
                  <div className="opt-status-box danger">
                    <ShieldAlert size={18} />
                    <span>Opted-Out of Broadcasts</span>
                  </div>
                ) : (
                  <div className="opt-status-box success">
                    <ShieldCheck size={18} />
                    <span>Active Opted-In Parent</span>
                  </div>
                )}
              </div>

              {/* Admission Inquiry Stage */}
              {linkedInquiry && (
                <div className="info-section-card">
                  <div className="info-label">ADMISSION PIPELINE STAGE</div>
                  <div className="pipeline-stage-box">
                    <span className="badge badge-info">{linkedInquiry.pipelineStage}</span>
                    <p className="inq-notes-text">{linkedInquiry.notes}</p>
                    <span className="inq-date-text">Follow-up: {linkedInquiry.followUpDate}</span>
                  </div>
                </div>
              )}

              {/* Contact Tags */}
              <div className="info-section-card">
                <div className="info-label">TAGS & LABELS</div>
                <div className="tags-flex-wrap">
                  {activeContact.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-neutral">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="info-section-card">
                <div className="info-label">QUICK ACTIONS</div>
                <a
                  href={`https://api.whatsapp.com/send?phone=${activeContact.phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm w-full mb-2"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} /> Open in Personal WhatsApp
                </a>
                <button className="btn btn-outline btn-sm w-full mb-2" onClick={() => setShowSimulateModal(true)}>
                  <Zap size={14} /> Simulate Incoming Test Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Incoming Message Simulation Modal */}
      {showSimulateModal && (
        <div className="modal-overlay" onClick={() => setShowSimulateModal(false)}>
          <div className="modal-content simulate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Simulate Incoming WhatsApp Parent Message</h3>
              <button className="modal-close" onClick={() => setShowSimulateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSimulateIncoming}>
              <div className="modal-body">
                <p className="text-sm text-muted mb-4">
                  Simulate receiving a live WhatsApp message from a parent number to test real-time conversation list updates and unread counters.
                </p>

                <div className="form-group">
                  <label className="form-label">Parent Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Name (if new contact)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Message Content</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={simContent}
                    onChange={(e) => setSimContent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSimulateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSimulating}>
                  {isSimulating ? 'Processing...' : 'Receive Test Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Styles for 3-Panel CRM Inbox Layout */}
      <style>{`
        .chats-view-page {
          height: calc(100vh - var(--header-height) - 3.5rem);
          display: flex;
          flex-direction: column;
        }

        .inbox-3panel-container {
          display: flex;
          flex: 1;
          background-color: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        /* PANEL 1: LEFT CONVERSATION LIST */
        .panel-left-conversations {
          width: 340px;
          min-width: 340px;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background-color: var(--slate-50);
        }

        .conv-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          background-color: #ffffff;
        }

        .conv-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .conv-title-row h3 {
          font-size: 1rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .search-bar-box {
          position: relative;
          margin-bottom: 0.75rem;
        }

        .search-bar-box input {
          width: 100%;
          padding: 0.45rem 0.75rem 0.45rem 2.2rem;
          font-size: 0.8125rem;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          background-color: var(--slate-50);
        }

        .search-bar-box .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--slate-400);
        }

        .filter-tabs-row {
          display: flex;
          gap: 0.5rem;
        }

        .tab-btn {
          flex: 1;
          padding: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid var(--slate-200);
          color: var(--slate-600);
          cursor: pointer;
        }

        .tab-btn.active {
          background-color: var(--primary-600);
          color: #ffffff;
          border-color: var(--primary-700);
        }

        .unread-pill {
          background-color: #e11d48;
          color: #ffffff;
          font-size: 0.6875rem;
          padding: 0.05rem 0.35rem;
          border-radius: var(--radius-full);
          margin-left: 0.2rem;
        }

        .conv-list-scroll {
          flex: 1;
          overflow-y: auto;
        }

        .conv-card-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--slate-200);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .conv-card-item:hover {
          background-color: var(--slate-100);
        }

        .conv-card-item.selected {
          background-color: #f0fdfa;
          border-left: 3px solid var(--primary-600);
        }

        .conv-card-item.has-unread {
          font-weight: 700;
        }

        .avatar-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .conv-card-main {
          flex: 1;
          min-width: 0;
        }

        .conv-card-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .contact-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--navy-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .msg-time {
          font-size: 0.6875rem;
          color: var(--slate-400);
        }

        .contact-student-tag {
          font-size: 0.75rem;
          color: var(--primary-700);
          font-weight: 600;
        }

        .conv-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.2rem;
        }

        .msg-snippet {
          font-size: 0.78125rem;
          color: var(--slate-500);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .snippet-icon {
          color: var(--primary-600);
          flex-shrink: 0;
        }

        .badge-unread-count {
          background-color: #10b981;
          color: #ffffff;
          font-size: 0.6875rem;
          font-weight: 800;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
        }

        .empty-conv-state {
          padding: 3rem 1.5rem;
          text-align: center;
          color: var(--slate-400);
        }

        /* PANEL 2: CENTER THREAD & COMPOSER */
        .panel-center-thread {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
        }

        .thread-header-bar {
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #ffffff;
        }

        .thread-header-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .avatar-circle-md {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--navy-800);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .active-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .active-phone {
          font-size: 0.75rem;
          color: var(--slate-500);
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .thread-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sidepanel-toggle-btn {
          background: transparent;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 0.4rem;
          color: var(--slate-600);
          cursor: pointer;
        }

        .sidepanel-toggle-btn:hover {
          background-color: var(--slate-100);
          color: var(--navy-900);
        }

        .thread-messages-scroll {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          background-color: #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .incoming-row {
          justify-content: flex-start;
        }

        .outgoing-row {
          justify-content: flex-end;
        }

        .message-bubble-card {
          max-width: 65%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          line-height: 1.45;
          box-shadow: var(--shadow-sm);
        }

        .in-bubble {
          background-color: #ffffff;
          color: var(--navy-900);
          border-bottom-left-radius: 2px;
        }

        .out-bubble {
          background-color: var(--primary-100);
          color: var(--primary-900);
          border-bottom-right-radius: 2px;
        }

        .bubble-footer-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.3rem;
          font-size: 0.6875rem;
          color: var(--slate-500);
          margin-top: 0.35rem;
        }

        .status-blue { color: #0284c7; }
        .status-gray { color: var(--slate-400); }

        .thread-empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--slate-400);
        }

        .composer-feedback-alert {
          padding: 0.5rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .composer-feedback-alert.success {
          background-color: #d1fae5;
          color: #047857;
        }

        .composer-feedback-alert.error {
          background-color: #ffe4e6;
          color: #be123c;
        }

        .api-notice-bar {
          background-color: #fffbeb;
          border-top: 1px solid #fde68a;
          padding: 0.4rem 1.25rem;
          font-size: 0.75rem;
          color: #b45309;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .thread-composer-bar {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 0.75rem;
          background-color: #ffffff;
        }

        .composer-input {
          flex: 1;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          outline: none;
        }

        .composer-input:focus {
          border-color: var(--primary-600);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }

        .empty-center-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--slate-400);
        }

        /* PANEL 3: RIGHT PARENT INFO SIDEPANEL */
        .panel-right-info {
          width: 300px;
          min-width: 300px;
          border-left: 1px solid var(--border-color);
          background-color: var(--slate-50);
          display: flex;
          flex-direction: column;
        }

        .sidepanel-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          background-color: #ffffff;
        }

        .sidepanel-header h4 {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .sidepanel-content-scroll {
          padding: 1.25rem 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .profile-summary-box {
          text-align: center;
          padding: 1rem;
          background-color: #ffffff;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .avatar-circle-lg {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--navy-700), var(--navy-900));
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0 auto 0.75rem auto;
        }

        .profile-name {
          font-size: 1rem;
          font-weight: 800;
          color: var(--navy-900);
        }

        .profile-phone {
          font-size: 0.75rem;
          color: var(--slate-500);
          display: block;
        }

        .info-section-card {
          background-color: #ffffff;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          padding: 0.875rem 1rem;
        }

        .info-label {
          font-size: 0.6875rem;
          font-weight: 800;
          color: var(--slate-400);
          letter-spacing: 0.05em;
          margin-bottom: 0.4rem;
        }

        .info-value-highlight {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--primary-700);
        }

        .opt-status-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .opt-status-box.success { color: #047857; }
        .opt-status-box.danger { color: #be123c; }

        .pipeline-stage-box {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .inq-notes-text {
          font-size: 0.75rem;
          color: var(--slate-600);
          line-height: 1.3;
        }

        .inq-date-text {
          font-size: 0.6875rem;
          color: var(--slate-400);
        }

        .tags-flex-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .simulate-modal {
          max-width: 500px;
        }

        .chat-inline-link {
          color: #2563eb;
          text-decoration: underline;
          word-break: break-all;
          font-weight: 600;
        }

        .out-bubble .chat-inline-link {
          color: #1e40af;
        }

        .chat-inline-link:hover {
          color: #1d4ed8;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};
