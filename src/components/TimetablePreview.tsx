import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import type { ClassSchedule, LabClass } from '../types';
import { fetchSchedules, nextScheduleOccurrence, readSchedulesLocal, scheduleTeacherIds, scheduleTimeRange, subscribeSchedules } from '../services/timetableService';

interface TimetablePreviewProps {
  role: 'student' | 'teacher';
  classes: LabClass[];
  teacherId?: string;
  compact?: boolean;
  onOpen: () => void;
}

export const TimetablePreview: React.FC<TimetablePreviewProps> = ({ role, classes, teacherId, compact = false, onOpen }) => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>(readSchedulesLocal);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    void fetchSchedules().then(setSchedules).catch(error => console.warn('Could not load timetable preview:', error));
    const unsubscribe = subscribeSchedules(() => setSchedules(readSchedulesLocal()));
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, []);
  const courses = new Map(classes.map(course => [course.id, course.name]));
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayClasses = schedules
    .filter(item => courses.has(item.classId) && (role === 'student' || Boolean(teacherId && scheduleTeacherIds(item).includes(teacherId))) && item.active !== false)
    .map(item => ({ item, next: nextScheduleOccurrence(item, startOfToday) }))
    .filter((meeting): meeting is { item: ClassSchedule; next: Date } => Boolean(meeting.next && meeting.next.toDateString() === startOfToday.toDateString()))
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return <section className={`rounded-xl border border-emerald-100 bg-white shadow-xs ${compact ? 'px-4 py-3' : 'p-4 sm:p-5'}`} aria-label="Today's timetable">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-emerald-700" /> Today's classes</h2><p className="text-[11px] text-slate-500">{today}</p></div>
      <button type="button" onClick={onOpen} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">View all</button>
    </div>
    {todayClasses.length ? <ul className={`${compact ? 'mt-2' : 'mt-3'} divide-y divide-slate-100`}>{todayClasses.map(({ item }) => {
      return <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-xs"><span className="font-semibold text-slate-800">{courses.get(item.classId)}</span><span className="flex items-center gap-1.5 text-slate-500"><Clock3 className="h-3.5 w-3.5" />{scheduleTimeRange(item)}</span></li>;
    })}</ul> : <p className="mt-2 text-xs text-slate-500">No classes today.</p>}
  </section>;
};
