import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar, type NavItemKey } from './Sidebar';
import { Header } from './Header';
import { DatabaseInspectorModal } from '../common/DatabaseInspectorModal';
import { seedDatabase } from '../../db/seed';

const DashboardView = lazy(() => import('../../pages/DashboardView').then((m) => ({ default: m.DashboardView })));
const ChatsView = lazy(() => import('../../pages/ChatsView').then((m) => ({ default: m.ChatsView })));
const InquiriesView = lazy(() => import('../../pages/InquiriesView').then((m) => ({ default: m.InquiriesView })));
const ContactsView = lazy(() => import('../../pages/ContactsView').then((m) => ({ default: m.ContactsView })));
const TemplatesView = lazy(() => import('../../pages/TemplatesView').then((m) => ({ default: m.TemplatesView })));
const CampaignsView = lazy(() => import('../../pages/CampaignsView').then((m) => ({ default: m.CampaignsView })));
const MediaLibraryView = lazy(() => import('../../pages/MediaLibraryView').then((m) => ({ default: m.MediaLibraryView })));
const AnalyticsView = lazy(() => import('../../pages/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const SubscriptionView = lazy(() => import('../../pages/SubscriptionView').then((m) => ({ default: m.SubscriptionView })));
const SettingsView = lazy(() => import('../../pages/SettingsView').then((m) => ({ default: m.SettingsView })));
const AutomationView = lazy(() => import('../../pages/AutomationView').then((m) => ({ default: m.AutomationView })));

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);

  // Initialize DB seed on initial render
  useEffect(() => {
    seedDatabase().catch((err) => {
      console.error('Failed to seed database:', err);
    });
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} onOpenDbInspector={() => setIsDbInspectorOpen(true)} />;
      case 'chats':
        return <ChatsView />;
      case 'inquiries':
        return <InquiriesView />;
      case 'contacts':
        return <ContactsView />;
      case 'templates':
        return <TemplatesView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'media':
        return <MediaLibraryView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'subscription':
        return <SubscriptionView />;
      case 'settings':
        return <SettingsView />;
      case 'automation':
        return <AutomationView />;
      default:
        return <DashboardView onNavigate={setActiveTab} onOpenDbInspector={() => setIsDbInspectorOpen(true)} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenDbInspector={() => setIsDbInspectorOpen(true)}
      />

      {/* Main Content Body */}
      <div className="main-wrapper">
        <Header
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDbInspector={() => setIsDbInspectorOpen(true)}
        />

        <main className="main-content">
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading view...</div>}>
            {renderActiveView()}
          </Suspense>
        </main>
      </div>

      {/* Interactive IndexedDB Inspector Modal */}
      <DatabaseInspectorModal
        isOpen={isDbInspectorOpen}
        onClose={() => setIsDbInspectorOpen(false)}
      />
    </div>
  );
};
