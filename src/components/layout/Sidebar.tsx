import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  GitPullRequest,
  Users,
  FileText,
  Send,
  Folder,
  BarChart3,
  CreditCard,
  Settings,
  Zap,
  X,
  Database
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'chats'
  | 'inquiries'
  | 'contacts'
  | 'templates'
  | 'campaigns'
  | 'media'
  | 'analytics'
  | 'subscription'
  | 'settings'
  | 'automation';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (key: NavItemKey) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenDbInspector: () => void;
}

interface NavItemConfig {
  key: NavItemKey;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeType?: 'primary' | 'warning' | 'info';
}

export const navItems: NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'chats', label: 'Chats', icon: MessageSquare, badge: 'Live Thread', badgeType: 'info' },
  { key: 'inquiries', label: 'Inquiries', icon: GitPullRequest, badge: '3 New', badgeType: 'warning' },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'campaigns', label: 'Campaigns', icon: Send },
  { key: 'media', label: 'Media Library', icon: Folder },
  { key: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { key: 'subscription', label: 'Subscription / Usage', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: Settings, badge: 'Pending API', badgeType: 'warning' },
  { key: 'automation', label: 'Automation', icon: Zap }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenDbInspector
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 49
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src="/logo.png" alt="SpacECE Logo" className="brand-logo-img" />
          </div>
          <div className="brand-info">
            <h1 className="brand-title">SpacECE India</h1>
            <span className="brand-subtitle">WhatsApp CRM System</span>
          </div>
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="nav-group-label">MAIN NAVIGATION</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab(item.key);
                  onClose();
                }}
              >
                <Icon className="nav-icon" size={20} />
                <span className="nav-label">{item.label}</span>
                {item.badge && (
                  <span className={`nav-badge ${item.badgeType || 'info'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & DB Inspector quick button */}
        <div className="sidebar-footer">
          <button className="db-inspector-trigger" onClick={onOpenDbInspector}>
            <Database size={16} />
            <span>DB Inspector (8 Tables)</span>
          </button>
          <div className="system-status">
            <span className="status-indicator warning"></span>
            <span className="status-text">WhatsApp API: <strong>Disconnected</strong></span>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--navy-900);
          color: #ffffff;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }

        .sidebar-brand {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background-color: rgba(0, 0, 0, 0.15);
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
          overflow: hidden;
        }

        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: calc(var(--radius-md) - 2px);
        }

        .brand-info {
          flex: 1;
          min-width: 0;
        }

        .brand-title {
          font-size: 1rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brand-subtitle {
          font-size: 0.75rem;
          color: var(--primary-100);
          opacity: 0.85;
          display: block;
        }

        .mobile-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--slate-400);
          padding: 0.25rem;
        }

        @media (max-width: 1024px) {
          .mobile-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.25rem 0.875rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-group-label {
          font-size: 0.6875rem;
          font-weight: 800;
          color: var(--slate-400);
          letter-spacing: 0.08em;
          padding: 0.5rem 0.75rem 0.25rem 0.75rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 0.875rem;
          border-radius: var(--radius-md);
          color: var(--slate-300);
          background: transparent;
          border: none;
          width: 100%;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: left;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          color: #ffffff;
          background-color: rgba(255, 255, 255, 0.07);
        }

        .nav-item.active {
          color: #ffffff;
          background: linear-gradient(90deg, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.08) 100%);
          border-left: 3px solid var(--primary-500);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .nav-icon {
          color: var(--slate-400);
          transition: color 0.2s ease;
          flex-shrink: 0;
        }

        .nav-item:hover .nav-icon,
        .nav-item.active .nav-icon {
          color: var(--primary-500);
        }

        .nav-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          line-height: 1;
        }

        .nav-badge.info { background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; }
        .nav-badge.warning { background-color: rgba(245, 158, 11, 0.2); color: #fcd34d; }
        .nav-badge.primary { background-color: rgba(13, 148, 136, 0.25); color: #5eead4; }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background-color: rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .db-inspector-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem;
          background-color: rgba(255, 255, 255, 0.06);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-md);
          color: var(--slate-300);
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .db-inspector-trigger:hover {
          background-color: rgba(13, 148, 136, 0.2);
          border-color: var(--primary-500);
          color: #ffffff;
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--slate-400);
          padding: 0 0.25rem;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.warning {
          background-color: var(--amber-500);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }
      `}</style>
    </>
  );
};
