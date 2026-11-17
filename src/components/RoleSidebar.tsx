import React from 'react';
import { BookOpen, CalendarDays, Globe2, Megaphone, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlatformSettings } from '../services/platformSettingsService';
import { StudentAvatar } from './StudentAvatar';

type NavItem = { id: string; label: string; icon: LucideIcon; badge?: number };
type Props = { role: 'teacher' | 'student'; active: string; badge: number; settings: PlatformSettings; expanded: boolean; profileName?: string; profileImageUrl?: string; onClose: () => void; onSelect: (id: string) => void };
export const RoleSidebar: React.FC<Props> = ({ role, active, badge, settings, expanded, profileName, profileImageUrl, onClose, onSelect }) => {
  const appsAvailable = role === 'teacher' ? settings.teachersCanManageApps : settings.studentsCanOpenApps;
  const items: NavItem[] = [
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, badge },
    { id: 'timetable', label: 'Timetable', icon: CalendarDays },
    ...(appsAvailable ? [{ id: 'apps', label: 'Apps', icon: Globe2 }] : []),
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];
  return <>
    {expanded && <button type="button" className="role-sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`role-sidebar ${expanded ? 'is-expanded' : ''}`} aria-label={`${role} navigation`} aria-hidden={!expanded} inert={!expanded}>
      <div className="role-sidebar-heading"><span>Workspace</span></div>
      <nav>{items.map(({ id, label, icon: Icon, badge: count }) => <button key={id} type="button" title={label} aria-current={active === id ? 'page' : undefined} onClick={() => { onSelect(id); if (window.innerWidth < 1024) onClose(); }} className={`role-sidebar-item ${active === id ? 'is-active' : ''}`}>{id === 'profile' && profileImageUrl ? <StudentAvatar name={profileName || role} imageUrl={profileImageUrl} size="sm" className="!h-[19px] !w-[19px] !text-[8px]" /> : <Icon size={19} strokeWidth={1.9} />}<span className="role-sidebar-label">{label}</span>{Boolean(count) && <span className="role-sidebar-badge" aria-label={`${count} new announcements`}>{count}</span>}</button>)}</nav>
    </aside>
    <nav className="role-mobile-dock" aria-label={`${role} navigation`}>
      {items.map(({ id, label, icon: Icon, badge: count }) => <button key={id} type="button" title={label} aria-label={label} aria-current={active === id ? 'page' : undefined} onClick={() => { onSelect(id); onClose(); }} className={`role-mobile-dock-item ${active === id ? 'is-active' : ''}`}>
        <span className="role-mobile-dock-icon">{id === 'profile' && profileImageUrl ? <StudentAvatar name={profileName || role} imageUrl={profileImageUrl} size="sm" className="!h-5 !w-5 !text-[8px]" /> : <Icon size={19} strokeWidth={1.9} />}{Boolean(count) && <span className="role-mobile-dock-badge" aria-label={`${count} new announcements`}>{count}</span>}</span>
        <span className="role-mobile-dock-label">{label}</span>
      </button>)}
    </nav>
  </>;
};
