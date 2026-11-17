import React from 'react';
import { CalendarCheck2, ClipboardList, GraduationCap, Megaphone } from 'lucide-react';
import type { CourseSection } from './CoursePicker';

const tabs = [
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'gradebook', label: 'Gradebook', icon: GraduationCap },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
] as const;

export const CourseWorkspaceNav: React.FC<{
  className: string;
  active: CourseSection;
  onSelect: (section: CourseSection) => void;
}> = ({ className, active, onSelect }) => <nav aria-label={`${className} navigation`} className="course-workspace-nav grid grid-cols-2 gap-1 border-b border-slate-200 bg-white px-2 pt-2 sm:flex sm:flex-wrap sm:px-3">
  {tabs.map(({ id, label, icon: Icon }) => <button
    key={id}
    type="button"
    onClick={() => onSelect(id)}
    aria-current={active === id ? 'page' : undefined}
    className={`inline-flex min-w-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm ${active === id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-emerald-800'}`}
  ><Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></button>)}
</nav>;
