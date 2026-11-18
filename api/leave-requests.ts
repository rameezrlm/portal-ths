import { authenticateStudent, authenticateTeacher, sameOrigin } from '../server/session.js';
import { classMembers, createLeaveRequest, getLeaveRequest, listLeaveRequests, reviewLeaveRequest } from '../server/leaveStore.js';
import { json, readJson } from '../server/http.js';
import { leaveInputError } from '../src/utils/leaveValidation.js';
import { FirestoreError } from '../server/firestore.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    const url = new URL(request.url);
    const teacherMode = url.searchParams.get('role') === 'teacher' || request.method === 'PATCH';
    let actor;
    try { actor = teacherMode ? await authenticateTeacher(request) : await authenticateStudent(request); }
    catch (error) { console.error('Leave authentication failed:', error); return json({ error: 'Leave service is temporarily unavailable.' }, 503); }
    if (!actor) return json({ error: 'Please sign in again.' }, 401);
    try {
      if (request.method === 'GET') {
        const classId = url.searchParams.get('classId') || '';
        const members = await classMembers(classId);
        if (!members || !(teacherMode ? members.teachers : members.students).includes(actor.id)) return json({ error: 'This course is not available to your account.' }, 403);
        const items = (await listLeaveRequests()).filter(item => item.classId === classId && (teacherMode || item.studentId === actor.id));
        return json({ items });
      }
      let body: Record<string, unknown>;
      try { body = await readJson(request, 4096); }
      catch { return json({ error: 'Invalid leave request.' }, 400); }
      if (request.method === 'POST') {
        const classId = typeof body.classId === 'string' ? body.classId : '';
        const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
        const members = await classMembers(classId);
        if (!members || !members.students.includes(actor.id)) return json({ error: 'You are not enrolled in this course.' }, 403);
        const error = leaveInputError(body.fromDate, body.toDate, reason);
        if (error) return json({ error }, 400);
        const item = await createLeaveRequest({ classId, studentId: actor.id, studentName: actor.name, fromDate: body.fromDate as string, toDate: body.toDate as string, reason });
        return json({ item }, 201);
      }
      const id = typeof body.id === 'string' ? body.id : '';
      const status = body.status;
      const note = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : '';
      if (status !== 'approved' && status !== 'rejected') return json({ error: 'Choose approve or reject.' }, 400);
      if (note.length > 1000) return json({ error: 'Review note is too long.' }, 400);
      const current = await getLeaveRequest(id);
      if (!current) return json({ error: 'Leave request not found.' }, 404);
      const members = await classMembers(current.leave.classId);
      if (!members?.teachers.includes(actor.id)) return json({ error: 'You are not assigned to this course.' }, 403);
      if (current.leave.status !== 'pending') return json({ error: 'This request has already been reviewed.' }, 409);
      const item = await reviewLeaveRequest(current, status, actor.name, note);
      return json({ item });
    } catch (error) {
      if (error instanceof FirestoreError && (error.status === 409 || error.status === 412)) return json({ error: 'This application changed. Refresh and try again.' }, 409);
      console.error('Leave request failed:', error);
      return json({ error: 'Could not update leave requests. Please try again.' }, 503);
    }
  },
};
