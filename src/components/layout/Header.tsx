import React from 'react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { whatsappSettingsService } from '../../services/whatsappSettingsService';
import { Menu, Search, Database, Bell, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { navItems, type NavItemKey } from './Sidebar';

interface HeaderProps {
  activeTab: NavItemKey;
  onOpenMobileSidebar: () => void;
  onOpenDbInspector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileSidebar,
  onOpenDbInspector
}) => {
  const currentNav = navItems.find((item) => item.key === activeTab);

  const { data: settingsList } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const settings = settingsList?.[0];

  const isConnected = settings?.connectionStatus === 'CONNECTED';

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-trigger"
          onClick={onOpenMobileSidebar}
          aria-label="Open Navigation"
        >
          <Menu size={22} />
        </button>

        <div className="header-breadcrumb">
          <img src="/logo.png" alt="SpacECE Logo" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }} />
          <span className="breadcrumb-root">SpacECE CRM</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentNav?.label || 'Dashboard'}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Global Search Bar */}
        <div className="header-search">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search contacts, inquiries, templates..."
            className="search-input"
          />
        </div>

        {/* DB Inspector Action */}
        <button
          className="header-action-btn db-btn"
          onClick={onOpenDbInspector}
          title="Open Database Inspector"
        >
          <Database size={18} />
          <span className="db-btn-label">IndexedDB</span>
        </button>

        {/* Dynamic WhatsApp Connection Badge */}
        {isConnected ? (
          <div className="connection-badge success" title="WhatsApp Business API Verified & Active">
            <CheckCircle2 size={15} />
            <span>API Connected</span>
          </div>
        ) : (
          <div className="connection-badge warning" title="WhatsApp Business API is not connected">
            <ShieldAlert size={15} />
            <span>API Disconnected</span>
          </div>
        )}

        {/* Notifications Icon */}
        <button className="header-action-btn icon-only" title="Notifications">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </button>

        {/* Admin Avatar */}
        <div className="user-profile">
          <div className="avatar">SF</div>
          <div className="user-info">
            <span className="user-name">Spacece Admin</span>
            <span className="user-role">India Foundation</span>
          </div>
        </div>
      </div>

      <style>{`
        .app-header {
          height: var(--header-height);
          background-color: #ffffff;
          border-bottom: 1px solid var(--border-color);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 40;
          box-shadow: var(--shadow-sm);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mobile-menu-trigger {
          display: none;
          background: transparent;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          padding: 0.4rem;
          color: var(--slate-700);
        }

        @media (max-width: 1024px) {
          .mobile-menu-trigger {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .app-header {
            padding: 0 1rem;
          }
        }

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .breadcrumb-root {
          color: var(--slate-400);
        }

        .breadcrumb-separator {
          color: var(--slate-300);
        }

        .breadcrumb-current {
          color: var(--navy-900);
          font-weight: 700;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-search {
          position: relative;
          width: 280px;
        }

        @media (max-width: 768px) {
          .header-search {
            display: none;
          }
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--slate-400);
        }

        .search-input {
          width: 100%;
          padding: 0.45rem 0.875rem 0.45rem 2.4rem;
          font-size: 0.8125rem;
          background-color: var(--slate-100);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-full);
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          background-color: #ffffff;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }

        .header-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.875rem;
          background-color: var(--slate-100);
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-md);
          color: var(--slate-700);
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all 0.2s ease;
          position: relative;
        }

        .header-action-btn:hover {
          background-color: var(--slate-200);
          color: var(--navy-900);
        }

        .header-action-btn.icon-only {
          padding: 0.5rem;
          border-radius: 50%;
        }

        .db-btn {
          color: var(--primary-700);
          background-color: var(--primary-50);
          border-color: var(--primary-100);
        }

        .db-btn:hover {
          background-color: var(--primary-100);
        }

        @media (max-width: 640px) {
          .db-btn-label {
            display: none;
          }
        }

        .notification-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          background-color: var(--rose-500);
          border-radius: 50%;
          border: 2px solid #ffffff;
        }

        .connection-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .connection-badge.warning {
          background-color: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .connection-badge.success {
          background-color: #d1fae5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        @media (max-width: 640px) {
          .connection-badge span {
            display: none;
          }
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding-left: 0.5rem;
          border-left: 1px solid var(--slate-200);
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--navy-700), var(--navy-900));
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .user-info {
            display: none;
          }
        }

        .user-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--navy-900);
          line-height: 1.1;
        }

        .user-role {
          font-size: 0.6875rem;
          color: var(--slate-500);
        }
      `}</style>
    </header>
  );
};
