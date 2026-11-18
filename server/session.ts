import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { StudentRecord, TeacherRecord } from './firestore.js';
import { getStudentById, getTeacherById } from './firestore.js';

const COOKIE = 'ths_student_session';
const TEACHER_COOKIE = 'ths_teacher_session';
const TTL_SECONDS = 60 * 60 * 24 * 7;
type SessionPayload = { studentId: string; passwordFingerprint: string; expiresAt: number };
function secret() {
  const value = process.env.STUDENT_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('STUDENT_SESSION_SECRET must be at least 32 characters.');
  return value;
}
function sign(data: string): string { return createHmac('sha256', secret()).update(data).digest('base64url'); }
function fingerprint(password: string): string { return createHmac('sha256', secret()).update(`password:${password}`).digest('base64url'); }
function equal(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function passwordMatches(provided: string, stored: string): boolean {
  return equal(createHash('sha256').update(provided).digest('hex'), createHash('sha256').update(stored).digest('hex'));
}
export function issueStudentCookie(student: StudentRecord, request: Request): string {
  const payload: SessionPayload = { studentId: student.id, passwordFingerprint: fingerprint(student.password), expiresAt: Date.now() + TTL_SECONDS * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${data}.${sign(data)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}${secure}`;
}
export function clearStudentCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}
export function issueTeacherCookie(teacher: TeacherRecord, request: Request): string {
  const payload = { teacherId: teacher.id, passwordFingerprint: fingerprint(teacher.password), expiresAt: Date.now() + TTL_SECONDS * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${TEACHER_COOKIE}=${data}.${sign(data)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}${secure}`;
}
export function clearTeacherCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${TEACHER_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}
export async function authenticateTeacher(request: Request): Promise<TeacherRecord | null> {
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${TEACHER_COOKIE}=`))?.slice(TEACHER_COOKIE.length + 1);
  if (!cookie) return null;
  const [data, signature] = cookie.split('.');
  if (!data || !signature || !equal(sign(data), signature)) return null;
  let payload: { teacherId: string; passwordFingerprint: string; expiresAt: number };
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as typeof payload; } catch { return null; }
  if (!payload.teacherId || payload.expiresAt < Date.now()) return null;
  const teacher = await getTeacherById(payload.teacherId);
  return teacher && equal(fingerprint(teacher.password), payload.passwordFingerprint) ? teacher : null;
}
export async function authenticateStudent(request: Request): Promise<StudentRecord | null> {
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie) return null;
  const [data, signature] = cookie.split('.');
  if (!data || !signature || !equal(sign(data), signature)) return null;
  let payload: SessionPayload;
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload; } catch { return null; }
  if (!payload.studentId || payload.expiresAt < Date.now()) return null;
  const student = await getStudentById(payload.studentId);
  return student && equal(fingerprint(student.password), payload.passwordFingerprint) ? student : null;
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
