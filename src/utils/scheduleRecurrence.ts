import type { ClassSchedule } from '../types';

/** Weekly slots repeat on their selected weekdays from the start date until deactivated. */
export function scheduleWeekdays(item: ClassSchedule): number[] {
  if (Array.isArray(item.weekdays)) {
    return [...new Set(item.weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  }
  const start = new Date(`${item.date}T00:00:00`);
  return Number.isNaN(start.getTime()) ? [] : [start.getDay()];
}

export function nextScheduleOccurrence(item: ClassSchedule, from = new Date()): Date | null {
  if (item.active === false) return null;
  const first = new Date(`${item.date}T${item.time}:00`);
  const days = scheduleWeekdays(item);
  if (Number.isNaN(first.getTime()) || days.length === 0) return null;
  const start = new Date(Math.max(first.getTime(), from.getTime() - item.durationMinutes * 60_000));
  const candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let offset = 0; offset <= 7; offset++) {
    candidate.setHours(0, 0, 0, 0);
    if (days.includes(candidate.getDay())) {
      candidate.setHours(first.getHours(), first.getMinutes(), 0, 0);
      if (candidate.getTime() >= first.getTime() && candidate.getTime() + item.durationMinutes * 60_000 >= from.getTime()) return new Date(candidate);
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}
export function scheduleWeekday(item: ClassSchedule): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return scheduleWeekdays(item).map(day => names[day]).join(', ');
}
export function scheduleTimeRange(item: ClassSchedule): string {
  const start = new Date(`${item.date}T${item.time}:00`);
  if (Number.isNaN(start.getTime())) return `${item.time} · ${item.durationMinutes} min`;
  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  const format = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${format(start)} – ${format(end)}`;
}

export function scheduleTeacherIds(item: ClassSchedule): string[] {
  return Array.isArray(item.teacherIds) && item.teacherIds.length
    ? item.teacherIds.filter(id => typeof id === 'string' && id.length > 0)
    : item.teacherId ? [item.teacherId] : [];
}
