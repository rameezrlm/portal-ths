import type { LeaveRequest } from '../types';
import { readClassesLocal } from './classService';
import { getCurrentSession } from './teacherService';
import { leaveInputError } from '../utils/leaveValidation';

const KEY = 'it_lab_leave_requests';
const EVENT = 'it-lab-leave-requests-changed';
const read = (): LeaveRequest[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as LeaveRequest[]; }
  catch { return []; }
};
const write = (items: LeaveRequest[]) => {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
};
const sort = (items: LeaveRequest[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export function subscribeLeaveRequests(onChange: () => void): () => void {
  const storage = (event: StorageEvent) => { if (event.key === KEY) onChange(); };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', storage); };
}
async function request<T>(path: string, method = 'GET', body?: Record<string, unknown>): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`/api/leave-requests${path}`, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) { if (import.meta.env.DEV) return null; throw error; }
  if (import.meta.env.DEV && !response.headers.get('content-type')?.includes('application/json')) return null;
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Leave service is unavailable.');
  return payload;
}
function localCourse(classId: string, role: 'student' | 'teacher', id: string) {
  const course = readClassesLocal().find(item => item.id === classId);
  if (!course || !(role === 'student' ? course.studentIds : course.teacherIds).includes(id)) throw new Error('This course is not available to your account.');
}
function localActor(role: 'student' | 'teacher', id: string) {
  const session = getCurrentSession();
  if (!session || session.role !== role || (role === 'student' ? session.studentId : session.teacherId) !== id) throw new Error('Please sign in again.');
  return session;
}
export async function fetchStudentLeaveRequests(studentId: string, classId: string): Promise<LeaveRequest[]> {
  const remote = await request<{ items: LeaveRequest[] }>(`?classId=${encodeURIComponent(classId)}`);
  if (remote) return sort(remote.items);
  localActor('student', studentId); localCourse(classId, 'student', studentId);
  return sort(read().filter(item => item.studentId === studentId && item.classId === classId));
}
export async function fetchTeacherLeaveRequests(teacherId: string, classId: string): Promise<LeaveRequest[]> {
  const remote = await request<{ items: LeaveRequest[] }>(`?role=teacher&classId=${encodeURIComponent(classId)}`);
  if (remote) return sort(remote.items);
  localActor('teacher', teacherId); localCourse(classId, 'teacher', teacherId);
  return sort(read().filter(item => item.classId === classId));
}
export async function submitLeaveRequest(input: { classId: string; studentId: string; fromDate: string; toDate: string; reason: string }): Promise<LeaveRequest> {
  const reason = input.reason.trim();
  const error = leaveInputError(input.fromDate, input.toDate, reason);
  if (error) throw new Error(error);
  const remote = await request<{ item: LeaveRequest }>('', 'POST', { classId: input.classId, fromDate: input.fromDate, toDate: input.toDate, reason });
  if (remote) return remote.item;
  const session = localActor('student', input.studentId);
  localCourse(input.classId, 'student', input.studentId);
  const item: LeaveRequest = { id: `leave_${crypto.randomUUID()}`, classId: input.classId, studentId: input.studentId, studentName: session.name, fromDate: input.fromDate, toDate: input.toDate, reason, status: 'pending', createdAt: new Date().toISOString() };
  write([item, ...read()]);
  return item;
}
export async function decideLeaveRequest(input: { id: string; classId: string; teacherId: string; status: 'approved' | 'rejected'; reviewNote: string }): Promise<LeaveRequest> {
  const remote = await request<{ item: LeaveRequest }>('?role=teacher', 'PATCH', { id: input.id, status: input.status, reviewNote: input.reviewNote });
  if (remote) return remote.item;
  const session = localActor('teacher', input.teacherId);
  localCourse(input.classId, 'teacher', input.teacherId);
  const items = read();
  const item = items.find(entry => entry.id === input.id && entry.classId === input.classId);
  if (!item) throw new Error('Leave request not found.');
  if (item.status !== 'pending') throw new Error('This request has already been reviewed.');
  const updated: LeaveRequest = { ...item, status: input.status, reviewNote: input.reviewNote.trim() || undefined, reviewedBy: session.name, reviewedAt: new Date().toISOString() };
  write(items.map(entry => entry.id === item.id ? updated : entry));
  return updated;
}
