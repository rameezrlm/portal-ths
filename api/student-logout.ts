import { json } from '../server/http';
import { clearStudentCookie, sameOrigin } from '../server/session';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    return json({ success: true }, 200, { 'Set-Cookie': clearStudentCookie(request) });
  },
};
