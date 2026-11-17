import React from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import type { ClassSchedule, LabClass } from '../types';
import { scheduleTimeRange, scheduleWeekdays } from '../utils/scheduleRecurrence';

type Props = { schedules: ClassSchedule[]; classes: LabClass[] };
type Meeting = { item: ClassSchedule; start: number; end: number; lane: number; laneCount: number };

const days = [
  { index: 1, name: 'Monday', short: 'Mon' },
  { index: 2, name: 'Tuesday', short: 'Tue' },
  { index: 3, name: 'Wednesday', short: 'Wed' },
  { index: 4, name: 'Thursday', short: 'Thu' },
  { index: 5, name: 'Friday', short: 'Fri' },
  { index: 6, name: 'Saturday', short: 'Sat' },
  { index: 0, name: 'Sunday', short: 'Sun' },
];
const pixelsPerHour = 88;
const minutesFromTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : null;
};
const formatHour = (minutes: number) => new Date(2020, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function positionMeetings(items: ClassSchedule[]): Meeting[] {
  const meetings = items.map(item => {
    const start = minutesFromTime(item.time);
    return start === null || item.durationMinutes <= 0 ? null : { item, start, end: start + item.durationMinutes, lane: 0, laneCount: 1 };
  }).filter((item): item is Meeting => item !== null).sort((a, b) => a.start - b.start || a.end - b.end);

  let group: Meeting[] = [];
  let groupEnd = -1;
  const finishGroup = () => {
    const laneEnds: number[] = [];
    for (const meeting of group) {
      const available = laneEnds.findIndex(end => end <= meeting.start);
      meeting.lane = available < 0 ? laneEnds.length : available;
      laneEnds[meeting.lane] = meeting.end;
    }
    for (const meeting of group) meeting.laneCount = laneEnds.length;
  };
  for (const meeting of meetings) {
    if (group.length && meeting.start >= groupEnd) { finishGroup(); group = []; }
    group.push(meeting);
    groupEnd = Math.max(groupEnd, meeting.end);
  }
  if (group.length) finishGroup();
  return meetings;
}

export const WeeklyTimetableGrid: React.FC<Props> = ({ schedules, classes }) => {
  const classNames = new Map(classes.map(course => [course.id, course.name]));
  const active = schedules.filter(item => item.active !== false && minutesFromTime(item.time) !== null && item.durationMinutes > 0);
  const meetingsByDay = days.map(day => positionMeetings(active.filter(item => scheduleWeekdays(item).includes(day.index))));
  const allMeetings = meetingsByDay.flat();

  if (allMeetings.length === 0) return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"><CalendarDays className="mx-auto mb-2 h-6 w-6 text-slate-300" />No active classes scheduled.</div>;

  const firstMinute = Math.floor(Math.min(...allMeetings.map(meeting => meeting.start)) / 60) * 60;
  const lastMinute = Math.min(1440, Math.ceil(Math.max(...allMeetings.map(meeting => meeting.end)) / 60) * 60);
  const gridHeight = (lastMinute - firstMinute) / 60 * pixelsPerHour;
  const halfHours = (lastMinute - firstMinute) / 30;
  const lines = Array.from({ length: halfHours + 1 }, (_, index) => index);

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs" aria-label="Weekly timetable grid">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div><h3 className="text-sm font-bold text-slate-900">Weekly timetable</h3><p className="mt-0.5 text-[11px] text-slate-500">Classes are placed by day, start time, and duration.</p></div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5 text-emerald-700" />{formatHour(firstMinute)} – {formatHour(lastMinute)}</span>
    </div>
    <div>
      <div className="grid w-full" style={{ gridTemplateColumns: 'clamp(44px, 6vw, 76px) repeat(7, minmax(0, 1fr))' }}>
        <div className="sticky left-0 top-0 z-30 flex h-12 items-center justify-center border-b border-r border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">Time</div>
        {days.map(day => <div key={day.index} className={`flex h-12 min-w-0 items-center justify-center border-b border-r text-[10px] font-bold sm:text-xs ${day.index === new Date().getDay() ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}><span className="lg:hidden">{day.short}</span><span className="hidden lg:inline">{day.name}</span></div>)}
        <div className="sticky left-0 z-10 border-r border-slate-200 bg-white" style={{ height: gridHeight }}>
          {lines.map(index => <div key={index} className={`absolute right-2 text-right text-[10px] ${index % 2 === 0 ? 'font-semibold text-slate-600' : 'font-medium text-slate-400'}`} style={{ top: index * pixelsPerHour / 2, left: 0, transform: index === 0 ? 'translateY(3px)' : index === halfHours ? 'translateY(-100%)' : 'translateY(-50%)' }}>{formatHour(firstMinute + index * 30)}</div>)}
        </div>
        {days.map((day, dayPosition) => <div key={day.index} className="relative border-r border-slate-200 bg-white" style={{ height: gridHeight }}>
          {lines.map(index => <div key={index} className={`pointer-events-none absolute inset-x-0 border-t ${index % 2 === 0 ? 'border-slate-200' : 'border-slate-100'}`} style={{ top: index * pixelsPerHour / 2 }} />)}
          {meetingsByDay[dayPosition].map(meeting => {
            const height = Math.min(meeting.end, lastMinute) - meeting.start;
            const top = (meeting.start - firstMinute) / 60 * pixelsPerHour;
            const width = 100 / meeting.laneCount;
            const name = classNames.get(meeting.item.classId) || 'Course';
            const range = scheduleTimeRange(meeting.item);
            return <article key={meeting.item.id} title={`${name} · ${day.name}, ${range}`} aria-label={`${name}, ${day.name}, ${range}`} className={`absolute z-[1] overflow-hidden rounded-[4px] border border-emerald-200 border-l-[3px] border-l-emerald-700 bg-emerald-50 text-emerald-950 shadow-xs ${height < 35 ? 'px-0.5 py-0 sm:px-1.5' : 'px-0.5 py-1 sm:px-2'}`} style={{ top: top + 2, height: Math.max(0, height / 60 * pixelsPerHour - 4), left: `calc(${meeting.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}>
              <p className="truncate text-[9px] font-bold leading-4 sm:text-[11px]">{name}</p>
              {height >= 35 && <p className="mt-0.5 hidden truncate text-[10px] leading-4 text-emerald-800 md:block">{range}</p>}
            </article>;
          })}
        </div>)}
      </div>
    </div>
  </section>;
};
