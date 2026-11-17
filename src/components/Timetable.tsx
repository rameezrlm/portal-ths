import React, { useEffect, useState } from 'react';
import { Pencil, Power, Trash2 } from 'lucide-react';
import type { ClassSchedule, LabClass, Teacher } from '../types';
import { fetchSchedules, nextScheduleOccurrence, readSchedulesLocal, removeSchedule, saveSchedule, scheduleTeacherIds, scheduleTimeRange, scheduleWeekday, scheduleWeekdays, setScheduleActive, subscribeSchedules } from '../services/timetableService';
import { WeeklyTimetableGrid } from './WeeklyTimetableGrid';

type Props = { role: 'admin' | 'teacher' | 'student'; classes: LabClass[]; teachers?: Teacher[]; teacherId?: string; onError?: (message: string) => void };
const empty = { classId: '', teacherIds: [] as string[], date: '', weekdays: [] as number[], time: '', durationMinutes: 60 };
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';

export const Timetable: React.FC<Props> = ({ role, classes, teachers = [], teacherId, onError }) => {
  const [items, setItems] = useState<ClassSchedule[]>(readSchedulesLocal);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<ClassSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void fetchSchedules().then(setItems).catch(err => setError(err instanceof Error ? err.message : 'Could not load timetable.'));
    return subscribeSchedules(() => setItems(readSchedulesLocal()));
  }, []);

  const classIds = new Set(classes.map(item => item.id));
  const assignedTeachers = teachers.filter(teacher => classes.find(course => course.id === form.classId)?.teacherIds.includes(teacher.id));
  const visible = items
    .filter(item => classIds.has(item.classId) && (role !== 'teacher' || Boolean(teacherId && scheduleTeacherIds(item).includes(teacherId))) && (role === 'admin' || item.active !== false))
    .sort((a, b) => {
      if (role === 'admin') return Number(a.active === false) - Number(b.active === false) || `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
      return (nextScheduleOccurrence(a)?.getTime() || 0) - (nextScheduleOccurrence(b)?.getTime() || 0);
    });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await saveSchedule({ ...form, id: editing?.id, createdAt: editing?.createdAt, active: editing?.active !== false });
      setForm(empty); setEditing(null); setItems(readSchedulesLocal());
    } catch (err) { const message = err instanceof Error ? err.message : 'Could not save class.'; setError(message); onError?.(message); }
    finally { setBusy(false); }
  };
  const onToggleActive = async (item: ClassSchedule) => {
    setBusy(true); setError('');
    try { await setScheduleActive(item.id, item.active === false); setItems(readSchedulesLocal()); }
    catch (err) { const message = err instanceof Error ? err.message : 'Could not update class.'; setError(message); onError?.(message); }
    finally { setBusy(false); }
  };
  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this recurring class?')) return;
    try { await removeSchedule(id); setItems(readSchedulesLocal()); }
    catch (err) { const message = err instanceof Error ? err.message : 'Could not delete class.'; setError(message); onError?.(message); }
  };

  return <section className="space-y-5" aria-label="Timetable">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Timetable</h2>
      <p className="mt-1 text-xs font-semibold text-emerald-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <p className="mt-1 text-xs text-slate-500">{role === 'admin' ? 'Choose the meeting days. Classes repeat weekly from the start date until you deactivate them.' : 'Your weekly classes and next meeting dates.'}</p>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}

    {role === 'admin' && <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-slate-700">Course<select required value={form.classId} onChange={event => setForm({ ...form, classId: event.target.value, teacherIds: [] })} className={inputClass}><option value="">Select course</option>{classes.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
      <fieldset className="min-w-0 text-xs font-semibold text-slate-700"><legend>Teachers <span className="font-normal text-slate-500">(select one or more)</span></legend><div className="mt-1 max-h-28 min-h-10 space-y-1 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">{assignedTeachers.length ? assignedTeachers.map(teacher => <label key={teacher.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 font-medium hover:bg-emerald-50"><input type="checkbox" checked={form.teacherIds.includes(teacher.id)} onChange={event => setForm(current => ({ ...current, teacherIds: event.target.checked ? [...current.teacherIds, teacher.id] : current.teacherIds.filter(id => id !== teacher.id) }))} className="accent-emerald-700" />{teacher.name}</label>) : <p className="font-normal text-slate-500">{form.classId ? 'Assign teachers to this course first.' : 'Select a course first.'}</p>}</div></fieldset>
      <label className="text-xs font-semibold text-slate-700">Starts on<input required type="date" value={form.date} onChange={event => { const date = event.target.value; setForm(current => ({ ...current, date, weekdays: current.weekdays.length || !date ? current.weekdays : [new Date(`${date}T00:00:00`).getDay()] })); }} className={inputClass} /></label>
      <label className="text-xs font-semibold text-slate-700">Time<input required type="time" value={form.time} onChange={event => setForm({ ...form, time: event.target.value })} className={inputClass} /></label>
      <label className="text-xs font-semibold text-slate-700">Duration (minutes)<input required min="15" step="5" type="number" value={form.durationMinutes} onChange={event => setForm({ ...form, durationMinutes: Number(event.target.value) })} className={inputClass} /></label>
      <fieldset className="sm:col-span-2 lg:col-span-5"><legend className="text-xs font-semibold text-slate-700">Class days <span className="font-normal text-slate-500">({form.weekdays.length} selected)</span></legend><div className="mt-2 grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">{dayLabels.map((label, day) => <label key={day} className={`flex min-h-9 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600 ${form.weekdays.includes(day) ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'}`}><input type="checkbox" aria-label={dayNames[day]} checked={form.weekdays.includes(day)} onChange={event => setForm(current => ({ ...current, weekdays: event.target.checked ? [...current.weekdays, day].sort((a, b) => a - b) : current.weekdays.filter(value => value !== day) }))} className="sr-only" /><span>{label}</span></label>)}</div></fieldset>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">The start date is the first eligible date. All selected days use this time and duration; add another schedule for a different time.</p>
      <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{editing ? 'Save changes' : 'Add weekly class'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="rounded-lg border border-slate-300 px-4 py-2 text-xs">Cancel</button>}</div>
    </form>}

    <WeeklyTimetableGrid schedules={visible} classes={classes} />

    {visible.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold text-slate-900">Schedule details</h3><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><ul className="divide-y divide-slate-100">{visible.map(item => {
      const next = nextScheduleOccurrence(item);
      return <li key={item.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 ${item.active === false ? 'bg-slate-50 opacity-70' : ''}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{classes.find(course => course.id === item.classId)?.name}</p>{role === 'admin' && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.active === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{item.active === false ? 'Inactive' : 'Active'}</span>}</div>
          <p className="mt-1 text-xs text-slate-600">Every {scheduleWeekday(item)} · {scheduleTimeRange(item)}</p>
          <p className="mt-1 text-[11px] text-slate-400">{role === 'admin' ? `Started ${item.date} · ${scheduleTeacherIds(item).map(id => teachers.find(teacher => teacher.id === id)?.name || 'Unknown teacher').join(', ')}` : next ? `Next class ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
        </div>
        {role === 'admin' && <div className="flex items-center gap-1">
          <button type="button" disabled={busy} aria-label={item.active === false ? 'Activate class' : 'Deactivate class'} title={item.active === false ? 'Activate' : 'Deactivate'} onClick={() => void onToggleActive(item)} className={`rounded-lg p-2 disabled:opacity-50 ${item.active === false ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'}`}><Power className="h-4 w-4" /></button>
          <button type="button" aria-label="Edit class" onClick={() => { setEditing(item); setForm({ classId: item.classId, teacherIds: scheduleTeacherIds(item), date: item.date, weekdays: scheduleWeekdays(item), time: item.time, durationMinutes: item.durationMinutes }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Pencil className="h-4 w-4" /></button>
          <button type="button" aria-label="Delete class" onClick={() => void onDelete(item.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>}
      </li>;
    })}</ul></div></div>}
  </section>;
};
