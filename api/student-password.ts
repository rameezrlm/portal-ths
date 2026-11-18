import { FirestoreError, setStudentPassword, type StudentRecord } from '../server/firestore.js';
import { json, readJson } from '../server/http.js';
import { authenticateStudent, issueStudentCookie, passwordMatches, sameOrigin } from '../server/session.js';

interface Dependencies {
  authenticate: (request: Request) => Promise<StudentRecord | null>;
  save: (student: StudentRecord, password: string) => Promise<void>;
  cookie: (student: StudentRecord, request: Request) => string;
}

const dependencies: Dependencies = {
  authenticate: authenticateStudent,
  save: setStudentPassword,
  cookie: issueStudentCookie,
};

export async function changeStudentPassword(request: Request, services: Dependencies = dependencies): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);

  let student: StudentRecord | null;
  try { student = await services.authenticate(request); }
  catch (error) {
    console.error('Student password authentication unavailable:', error);
    return json({ error: 'Password service is temporarily unavailable.' }, 503);
  }
  if (!student) return json({ error: 'Please sign in again to change your password.' }, 401);

  let body: Record<string, unknown>;
  try { body = await readJson(request, 4096); }
  catch { return json({ error: 'Invalid password request.' }, 400); }
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 1024 ||
      typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128 || newPassword.trim() !== newPassword) {
    return json({ error: 'Enter your current password and a new password of 8 to 128 characters.' }, 400);
  }
  if (!passwordMatches(currentPassword, student.password)) return json({ error: 'Current password is incorrect.' }, 403);
  if (passwordMatches(newPassword, student.password)) return json({ error: 'Choose a different password.' }, 400);

  let cookie: string;
  try { cookie = services.cookie({ ...student, password: newPassword }, request); }
  catch (error) {
    console.error('Student password session unavailable:', error);
    return json({ error: 'Password service is temporarily unavailable.' }, 503);
  }
  try {
    await services.save(student, newPassword);
    return json({ success: true }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    if (error instanceof FirestoreError && error.status === 412) return json({ error: 'Your account changed while saving. Please try again.' }, 409);
    console.error('Student password update failed:', error);
    return json({ error: 'Could not save your password. Please try again.' }, 503);
  }
}

export default { fetch: changeStudentPassword };
