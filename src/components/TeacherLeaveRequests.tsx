import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, X } from 'lucide-react';
import type { LeaveRequest } from '../types';
import { decideLeaveRequest, fetchTeacherLeaveRequests, subscribeLeaveRequests } from '../services/leaveRequestService';

type Props = { classId: string; teacherId: string };
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const badge = { pending: 'bg-amber-50 text-amber-800 border-amber-200', approved: 'bg-emerald-50 text-emerald-800 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

export const TeacherLeaveRequests: React.FC<Props> = ({ classId, teacherId }) => {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => void fetchTeacherLeaveRequests(teacherId, classId).then(list => { if (active) setItems(list); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load leave applications.'); });
    load();
    const unsubscribe = subscribeLeaveRequests(load);
    window.addEventListener('focus', load);
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', load); window.clearInterval(timer); };
  }, [classId, teacherId]);
  const decide = async (item: LeaveRequest, status: 'approved' | 'rejected') => {
    setBusyId(item.id); setError('');
    try {
      const updated = await decideLeaveRequest({ id: item.id, classId, teacherId, status, reviewNote: notes[item.id] || '' });
      setItems(current => current.map(entry => entry.id === updated.id ? updated : entry));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not review leave application.'); }
    finally { setBusyId(''); }
  };
  const sorted = [...items].sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.createdAt.localeCompare(a.createdAt));
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs" aria-label="Student leave applications">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3"><div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-emerald-700" />Leave applications</h3><p className="mt-0.5 text-xs text-slate-500">Review requests from students in this course.</p></div><span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">{items.filter(item => item.status === 'pending').length} pending</span></div>
    {error && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {sorted.length === 0 ? <p className="p-5 text-xs text-slate-500">No leave applications for this course.</p> : <ul className="divide-y divide-slate-100">{sorted.map(item => <li key={item.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{item.studentName}</p><p className="mt-0.5 text-xs text-slate-500">{dateLabel(item.fromDate)}{item.toDate !== item.fromDate ? ` – ${dateLabel(item.toDate)}` : ''}</p></div><span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize ${badge[item.status]}`}>{item.status}</span></div><p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{item.reason}</p>{item.status === 'pending' ? <div className="mt-3 flex flex-wrap items-center gap-2"><input type="text" maxLength={1000} value={notes[item.id] || ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Optional note to student" aria-label={`Note for ${item.studentName}`} className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" /><button type="button" disabled={busyId === item.id} onClick={() => void decide(item, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Approve</button><button type="button" disabled={busyId === item.id} onClick={() => void decide(item, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-3.5 w-3.5" />Reject</button></div> : <p className="mt-2 text-xs text-slate-500">Reviewed by {item.reviewedBy || 'teacher'}{item.reviewNote ? ` · ${item.reviewNote}` : ''}</p>}</li>)}</ul>}
  </section>;
};
