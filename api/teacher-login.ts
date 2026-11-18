import { findTeacherByEmail } from '../server/firestore.js';
import { json, readJson } from '../server/http.js';
import { issueTeacherCookie, passwordMatches, sameOrigin } from '../server/session.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    let body: Record<string, unknown>;
    try { body = await readJson(request, 4096); }
    catch { return json({ error: 'Invalid login request.' }, 400); }
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    if (!identifier || !password || identifier.length > 254 || password.length > 1024) return json({ error: 'Invalid credentials.' }, 401);
    try {
      const teacher = await findTeacherByEmail(identifier);
      if (!teacher || !teacher.password || !passwordMatches(password, teacher.password)) return json({ error: 'Invalid credentials.' }, 401);
      return json({ teacher: { id: teacher.id, name: teacher.name, email: teacher.email, profileImageUrl: teacher.profileImageUrl || '' } }, 200, { 'Set-Cookie': issueTeacherCookie(teacher, request) });
    } catch (error) {
      console.error('Teacher login backend unavailable:', error);
      return json({ error: 'Sign-in service is temporarily unavailable.' }, 503);
    }
  },
};
