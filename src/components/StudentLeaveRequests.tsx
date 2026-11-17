import React, { useEffect, useState } from 'react';
import { CalendarDays, Send } from 'lucide-react';
import type { LeaveRequest } from '../types';
import { fetchStudentLeaveRequests, submitLeaveRequest, subscribeLeaveRequests } from '../services/leaveRequestService';

type Props = { classId: string; studentId: string };
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const badge = { pending: 'bg-amber-50 text-amber-800 border-amber-200', approved: 'bg-emerald-50 text-emerald-800 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

export const StudentLeaveRequests: React.FC<Props> = ({ classId, studentId }) => {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => void fetchStudentLeaveRequests(studentId, classId).then(list => { if (active) setItems(list); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load leave requests.'); });
    load();
    const unsubscribe = subscribeLeaveRequests(load);
    window.addEventListener('focus', load);
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', load); window.clearInterval(timer); };
  }, [classId, studentId]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const item = await submitLeaveRequest({ classId, studentId, fromDate, toDate, reason });
      setItems(current => [item, ...current.filter(entry => entry.id !== item.id)]);
      setReason(''); setNotice('Leave application sent to your course teacher.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit leave application.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4" aria-label="Leave applications">
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-emerald-700" />Apply for leave</h3>
      <p className="mt-1 text-xs text-slate-500">Select the dates and explain why you need to miss this course.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">From<input required type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); if (toDate < event.target.value) setToDate(event.target.value); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" /></label><label className="text-xs font-semibold text-slate-700">To<input required type="date" min={fromDate} value={toDate} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" /></label></div>
        <label className="block text-xs font-semibold text-slate-700">Reason<textarea required minLength={10} maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain your leave request to your teacher…" className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm font-normal" /></label>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Send className="h-3.5 w-3.5" />{busy ? 'Submitting…' : 'Submit application'}</button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><h3 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-900">My leave applications</h3>{items.length === 0 ? <p className="p-5 text-xs text-slate-500">No leave applications yet.</p> : <ul className="divide-y divide-slate-100">{items.map(item => <li key={item.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-900">{dateLabel(item.fromDate)}{item.toDate !== item.fromDate ? ` – ${dateLabel(item.toDate)}` : ''}</p><span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize ${badge[item.status]}`}>{item.status}</span></div><p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{item.reason}</p>{item.reviewNote && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Teacher note: {item.reviewNote}</p>}</li>)}</ul>}</div>
  </section>;
};
