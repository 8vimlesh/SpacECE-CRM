import React, { useState, useEffect } from 'react';
import { Sidebar, type NavItemKey } from './Sidebar';
import { Header } from './Header';
import { DatabaseInspectorModal } from '../common/DatabaseInspectorModal';

import { DashboardView } from '../../pages/DashboardView';
import { ChatsView } from '../../pages/ChatsView';
import { InquiriesView } from '../../pages/InquiriesView';
import { ContactsView } from '../../pages/ContactsView';
import { TemplatesView } from '../../pages/TemplatesView';
import { CampaignsView } from '../../pages/CampaignsView';
import { MediaLibraryView } from '../../pages/MediaLibraryView';
import { AnalyticsView } from '../../pages/AnalyticsView';
import { SubscriptionView } from '../../pages/SubscriptionView';
import { SettingsView } from '../../pages/SettingsView';
import { AutomationView } from '../../pages/AutomationView';

import { migrateIndexedDbToSupabase } from '../../services/dataMigrationService';
import { seedDatabase } from '../../db/seed';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);

  // Initialize local DB & Sync to Supabase on initial render
  useEffect(() => {
    seedDatabase()
      .then(() => migrateIndexedDbToSupabase())
      .catch((err) => {
        console.error('Failed to initialize database:', err);
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
          {renderActiveView()}
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
