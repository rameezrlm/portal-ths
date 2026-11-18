import { randomUUID } from 'node:crypto';
import type { LeaveRequest } from '../src/types.js';
import { basePath, FirestoreError, firestoreFetch } from './firestore.js';

type Value = { stringValue?: string; arrayValue?: { values?: Value[] } };
type Document = { name: string; updateTime: string; fields?: Record<string, Value> };
const text = (doc: Document, field: string) => doc.fields?.[field]?.stringValue || '';
const fields = (value: Record<string, string>) => Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, { stringValue: entry }]));

export async function classMembers(classId: string): Promise<{ students: string[]; teachers: string[] } | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(classId)) return null;
  const response = await firestoreFetch(`${basePath()}/labClasses/${encodeURIComponent(classId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new FirestoreError(response.status);
  const doc = await response.json() as Document;
  const values = (field: string) => doc.fields?.[field]?.arrayValue?.values?.map(value => value.stringValue || '').filter(Boolean) || [];
  return { students: values('studentIds'), teachers: values('teacherIds') };
}

function parseLeave(doc: Document): LeaveRequest {
  const status = text(doc, 'status');
  return {
    id: doc.name.split('/').pop() || '', classId: text(doc, 'classId'), studentId: text(doc, 'studentId'),
    studentName: text(doc, 'studentName'), fromDate: text(doc, 'fromDate'), toDate: text(doc, 'toDate'),
    reason: text(doc, 'reason'), status: status === 'approved' || status === 'rejected' ? status : 'pending',
    createdAt: text(doc, 'createdAt'), reviewedAt: text(doc, 'reviewedAt') || undefined,
    reviewedBy: text(doc, 'reviewedBy') || undefined, reviewNote: text(doc, 'reviewNote') || undefined,
  };
}
export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await firestoreFetch(`${basePath()}:runQuery`, {
    method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'leaveRequests' }] } }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
  const rows = await response.json() as { document?: Document }[];
  return rows.filter(row => row.document).map(row => parseLeave(row.document!)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getLeaveRequest(id: string): Promise<{ leave: LeaveRequest; updateTime: string } | null> {
  if (!/^leave_[A-Za-z0-9_-]{8,100}$/.test(id)) return null;
  const response = await firestoreFetch(`${basePath()}/leaveRequests/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new FirestoreError(response.status);
  const doc = await response.json() as Document;
  return { leave: parseLeave(doc), updateTime: doc.updateTime };
}
export async function createLeaveRequest(input: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>): Promise<LeaveRequest> {
  const leave: LeaveRequest = { ...input, id: `leave_${randomUUID()}`, status: 'pending', createdAt: new Date().toISOString() };
  const response = await firestoreFetch(`${basePath()}/leaveRequests?documentId=${encodeURIComponent(leave.id)}`, {
    method: 'POST', body: JSON.stringify({ fields: fields({
      classId: leave.classId, studentId: leave.studentId, studentName: leave.studentName,
      fromDate: leave.fromDate, toDate: leave.toDate, reason: leave.reason,
      status: leave.status, createdAt: leave.createdAt,
    }) }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
  return leave;
}
export async function reviewLeaveRequest(current: { leave: LeaveRequest; updateTime: string }, status: 'approved' | 'rejected', teacherName: string, note: string): Promise<LeaveRequest> {
  const reviewedAt = new Date().toISOString();
  const query = new URLSearchParams();
  for (const field of ['status', 'reviewedAt', 'reviewedBy', 'reviewNote']) query.append('updateMask.fieldPaths', field);
  query.set('currentDocument.updateTime', current.updateTime);
  const response = await firestoreFetch(`${basePath()}/leaveRequests/${encodeURIComponent(current.leave.id)}?${query}`, {
    method: 'PATCH', body: JSON.stringify({ fields: fields({ status, reviewedAt, reviewedBy: teacherName, reviewNote: note }) }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
  return { ...current.leave, status, reviewedAt, reviewedBy: teacherName, reviewNote: note || undefined };
}
