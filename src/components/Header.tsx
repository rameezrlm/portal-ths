import React, { useEffect, useRef, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import type { UserSession } from '../types';
import { StudentAvatar } from './StudentAvatar';

interface HeaderProps {
  session: UserSession;
  onGoHome?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  isProfileActive?: boolean;
  onToggleSidebar?: () => void;
  isSidebarExpanded?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onGoHome,
  onOpenProfile,
  onLogout,
  isProfileActive = false,
  onToggleSidebar,
  isSidebarExpanded = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    firstItem.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRoot.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const brand = <>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
      <img src="/logo.png" alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none'; }} />
    </span>
    <span className="header-brand-copy min-w-0">
      <span className="block truncate text-sm font-bold leading-tight text-white sm:text-base">THS Tech labs LMS</span>
      <span className="block truncate whitespace-nowrap text-[11px] font-medium text-emerald-100">Taleem-O-Hunar Society</span>
    </span>
  </>;

  return <header id="app-header" className="sticky top-0 z-50 border-b border-emerald-900 bg-emerald-800 text-white shadow-sm">
    <div className={`flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 ${onToggleSidebar ? 'w-full' : 'mx-auto max-w-7xl'}`}>
      {onToggleSidebar && <button type="button" className={`role-sidebar-header-toggle ${isSidebarExpanded ? 'is-open' : ''}`} aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={isSidebarExpanded} onClick={onToggleSidebar}><span /><span /><span /></button>}
      {onGoHome ? <button id="btn-go-home" type="button" onClick={onGoHome} title="My Courses" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left cursor-pointer">{brand}</button> : <div className="flex min-w-0 flex-1 items-center gap-3">{brand}</div>}
      {onOpenProfile && <div ref={menuRoot} className="relative shrink-0">
        <button ref={trigger} id="user-profile-menu" type="button" onClick={() => setMenuOpen(open => !open)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={menuOpen} aria-controls="account-menu" className={`grid h-9 w-9 place-items-center rounded-full bg-white text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-800 ${isProfileActive || menuOpen ? 'ring-2 ring-emerald-300' : ''}`}>{session.profileImageUrl ? <StudentAvatar name={session.name} imageUrl={session.profileImageUrl} size="sm" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}</button>
        {menuOpen && <div id="account-menu" role="menu" aria-label={`${session.role} account`} className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl">
          <button ref={firstItem} type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenProfile(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-800"><UserRound className="h-4 w-4" /> My Profile</button>
          {onLogout && <><div className="my-1 border-t border-slate-100" /><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" /> Log out</button></>}
        </div>}
      </div>}
    </div>
  </header>;
};
