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
  Zap
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

export interface NavItemConfig {
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
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'automation', label: 'Automation', icon: Zap }
];
