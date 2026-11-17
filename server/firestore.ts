import { GoogleAuth } from 'google-auth-library';

interface FirestoreValue { stringValue?: string }
interface FirestoreDocument {
  name: string;
  updateTime: string;
  fields?: Record<string, FirestoreValue>;
}
export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  profileImageFileId?: string;
  updateTime: string;
}
export interface TeacherRecord extends StudentRecord {}

export class FirestoreError extends Error {
  constructor(public status: number) { super('Student database request failed.'); }
}

let auth: GoogleAuth | undefined;
let projectId = '';
function firestoreConfig() {
  if (!auth) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    const credentials = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) throw new Error('Firebase service account is incomplete.');
    projectId = credentials.project_id;
    auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/datastore'] });
  }
  return { auth, projectId };
}
export async function firestoreFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { auth } = firestoreConfig();
  const client = await auth.getClient();
  const access = await client.getAccessToken();
  if (!access.token) throw new Error('Could not authenticate to Firestore.');
  return fetch(`https://firestore.googleapis.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(12000),
  });
}
export function basePath() {
  return `projects/${encodeURIComponent(firestoreConfig().projectId)}/databases/(default)/documents`;
}
function fromDocument(document: FirestoreDocument): StudentRecord {
  const value = (key: string) => document.fields?.[key]?.stringValue || '';
  return {
    id: document.name.split('/').pop() || '',
    name: value('name'), email: value('email'), password: value('password'),
    profileImageUrl: value('profileImageUrl') || undefined,
    profileImageFileId: value('profileImageFileId') || undefined,
    updateTime: document.updateTime,
  };
}
export async function findStudentByEmail(email: string): Promise<StudentRecord | null> {
  const response = await firestoreFetch(`${basePath()}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'students' }],
      where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
      limit: 1,
    } }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
  const rows = await response.json() as { document?: FirestoreDocument }[];
  const found = rows.find(row => row.document)?.document;
  return found ? fromDocument(found) : null;
}
export async function getStudentById(studentId: string): Promise<StudentRecord | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(studentId)) return null;
  const response = await firestoreFetch(`${basePath()}/students/${encodeURIComponent(studentId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new FirestoreError(response.status);
  return fromDocument(await response.json() as FirestoreDocument);
}
export async function setStudentPicture(student: StudentRecord, picture: { imageUrl: string; fileId: string } | null): Promise<void> {
  return setPicture('students', student, picture);
}
export async function setStudentPassword(student: StudentRecord, password: string): Promise<void> {
  const query = new URLSearchParams();
  query.set('updateMask.fieldPaths', 'password');
  query.set('currentDocument.updateTime', student.updateTime);
  const response = await firestoreFetch(`${basePath()}/students/${encodeURIComponent(student.id)}?${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { password: { stringValue: password } } }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
}
export async function findTeacherByEmail(email: string): Promise<TeacherRecord | null> {
  const response = await firestoreFetch(`${basePath()}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'teachers' }],
      where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
      limit: 1,
    } }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
  const rows = await response.json() as { document?: FirestoreDocument }[];
  const found = rows.find(row => row.document)?.document;
  return found ? fromDocument(found) : null;
}
export async function getTeacherById(teacherId: string): Promise<TeacherRecord | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(teacherId)) return null;
  const response = await firestoreFetch(`${basePath()}/teachers/${encodeURIComponent(teacherId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new FirestoreError(response.status);
  return fromDocument(await response.json() as FirestoreDocument);
}
export async function setTeacherPicture(teacher: TeacherRecord, picture: { imageUrl: string; fileId: string } | null): Promise<void> {
  return setPicture('teachers', teacher, picture);
}
async function setPicture(collectionName: 'students' | 'teachers', student: StudentRecord, picture: { imageUrl: string; fileId: string } | null): Promise<void> {
  const query = new URLSearchParams();
  query.append('updateMask.fieldPaths', 'profileImageUrl');
  query.append('updateMask.fieldPaths', 'profileImageFileId');
  query.set('currentDocument.updateTime', student.updateTime);
  const fields = picture ? {
    profileImageUrl: { stringValue: picture.imageUrl },
    profileImageFileId: { stringValue: picture.fileId },
  } : {};
  const response = await firestoreFetch(`${basePath()}/${collectionName}/${encodeURIComponent(student.id)}?${query}`, {
    method: 'PATCH', body: JSON.stringify({ name: `${basePath()}/${collectionName}/${student.id}`, fields }),
  });
  if (!response.ok) throw new FirestoreError(response.status);
}
