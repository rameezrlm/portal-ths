import React from 'react';
import { Header } from './Header';
import { DashboardBreadcrumb } from './DashboardBreadcrumb';
import { WorkspaceTabs, type WorkspaceTab } from './WorkspaceTabs';
import type { UserSession } from '../types';

interface DashboardLayoutProps {
  session: UserSession;
  breadcrumb: string[];
  tabs?: WorkspaceTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabsId?: string;
  onOpenProfile?: () => void;
  isProfileActive?: boolean;
  contentMaxWidth?: '3xl' | '7xl';
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  session,
  breadcrumb,
  tabs,
  activeTab,
  onTabChange,
  tabsId,
  onOpenProfile,
  isProfileActive,
  contentMaxWidth = '7xl',
  children,
}) => {
  const maxWidthClass = contentMaxWidth === '3xl' ? 'max-w-3xl' : 'max-w-7xl';
  return (
    <div className="app-shell min-h-screen text-slate-800 flex flex-col antialiased">
      <Header
        session={session}
        onOpenProfile={onOpenProfile}
        isProfileActive={isProfileActive}
      />

      <DashboardBreadcrumb items={breadcrumb} />

      {tabs && activeTab && onTabChange && (
        <WorkspaceTabs
          id={tabsId}
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
        />
      )}

      <main className={`flex-1 ${maxWidthClass} w-full mx-auto px-4 sm:px-6 lg:px-8 py-6`}>
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        THS Tech labs LMS • Taleem-O-Hunar Society
      </footer>
    </div>
  );
};
