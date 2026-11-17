import React from 'react';
import type { LabClass, UserSession } from '../types';
import { TimetablePreview } from './TimetablePreview';
import { StudentAvatar } from './StudentAvatar';

interface TeacherOverviewProps {
  session: UserSession;
  teacherId?: string;
  classes: LabClass[];
  isLoading?: boolean;
  onOpenTimetable: () => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({
  session, teacherId, classes, isLoading = false, onOpenTimetable,
}) => {
  return (
    <section className="teacher-overview rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 xl:grid xl:grid-cols-[minmax(0,1.05fr)_minmax(0,2fr)] xl:gap-6" aria-label="Teacher overview">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-6">
        <StudentAvatar name={session.name || 'Teacher'} imageUrl={session.profileImageUrl} size="md" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Teacher profile</p>
          <h2 className="truncate text-lg font-bold text-slate-900">{session.name}</h2>
          <p className="truncate text-xs text-slate-500">Teacher · {session.email}</p>
        </div>
      </div>

      <div className="grid gap-6 pt-5 md:grid-cols-2 xl:pt-0">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Courses assigned <span className="ml-1 text-emerald-700">{isLoading ? '…' : classes.length}</span></h3>
          {isLoading ? <p className="mt-3 text-xs text-slate-500">Loading courses…</p> : classes.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {classes.map(course => <li key={course.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{course.name}</li>)}
            </ul>
          ) : <p className="mt-3 text-xs text-slate-500">No courses assigned yet.</p>}
        </div>
        <TimetablePreview role="teacher" classes={classes} teacherId={teacherId} onOpen={onOpenTimetable} />
      </div>
    </section>
  );
};
