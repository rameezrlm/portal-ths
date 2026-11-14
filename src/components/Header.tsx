import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { UserSession } from '../types';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
  onGoHome?: () => void;
  onOpenTeacherManagement?: () => void;
  onOpenProfile?: () => void;
  isProfileActive?: boolean;
  todayDisplay: string;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onGoHome,
  onOpenProfile,
  isProfileActive = false,
  todayDisplay,
}) => {
  const displayName = session.name || session.email;
  const initial = (displayName.charAt(0) || 'U').toUpperCase();
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);

  return (
    <header id="app-header" className="sticky top-0 z-30 border-b border-emerald-900 bg-emerald-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding */}
        {onGoHome ? (
          <button
            id="btn-go-home"
            type="button"
            onClick={onGoHome}
            title="Go to home"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 -ml-1 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg border border-slate-200 p-1 bg-white shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="header-brand-copy min-w-0">
              <h1 className="truncate text-sm sm:text-base font-bold text-white leading-tight">
                THS Tech labs LMS
              </h1>
              <p className="truncate whitespace-nowrap text-[11px] text-emerald-100 font-medium">
                Taleem-O-Hunar Society
              </p>
            </div>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-slate-200 p-1 bg-white shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="header-brand-copy min-w-0">
              <h1 className="truncate text-sm sm:text-base font-bold text-white leading-tight">
                THS Tech labs LMS
              </h1>
              <p className="truncate whitespace-nowrap text-[11px] text-emerald-100 font-medium">
                Taleem-O-Hunar Society
              </p>
            </div>
          </div>
        )}

        {/* Right: Date, Profile Avatar, Logout */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
          {/* Today Date */}
          <span className="text-xs text-emerald-50 font-medium hidden md:inline">
            {todayDisplay}
          </span>

          <div className="h-5 w-px bg-emerald-600 hidden sm:block" />

          {onOpenProfile ? (
            <button
              id="user-profile-menu"
              type="button"
              onClick={() => {
                if (window.matchMedia('(max-width: 767px)').matches) {
                  setMobileAccountOpen((open) => !open);
                } else {
                  onOpenProfile();
                }
              }}
              title={mobileAccountOpen ? 'Close account actions' : 'Account actions'}
              aria-pressed={isProfileActive}
              className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-colors cursor-pointer ${
                isProfileActive
                  ? 'bg-emerald-700 ring-1 ring-emerald-500'
                  : 'hover:bg-emerald-700'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center text-xs font-bold shadow-xs">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white max-w-[130px] truncate leading-tight">
                  {displayName}
                </p>
                {session.role === 'student' && (
                  <p className="text-[10px] text-emerald-100 font-medium">Student</p>
                )}
                {session.role === 'teacher' && (
                  <p className="text-[10px] text-emerald-100 font-medium">Teacher</p>
                )}
              </div>
            </button>
          ) : (
            <div
              id="user-profile-menu"
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center text-xs font-bold shadow-xs">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white max-w-[130px] truncate leading-tight">
                  {displayName}
                </p>
              </div>
            </div>
          )}

          {/* Clean Logout */}
          <button
            id="btn-logout"
            type="button"
            onClick={onLogout}
            className={`p-2 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer${mobileAccountOpen ? ' mobile-account-logout' : ''}`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {mobileAccountOpen && onOpenProfile && (
            <div className="mobile-account-actions">
              <button type="button" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
