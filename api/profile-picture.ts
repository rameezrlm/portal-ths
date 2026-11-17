import { decodeProfileImage, trashDrivePicture, trashTeacherDrivePicture, uploadDrivePicture, uploadTeacherDrivePicture } from '../server/drive';
import { setStudentPicture, setTeacherPicture } from '../server/firestore';
import { json, readJson } from '../server/http';
import { replaceProfilePicture, removeProfilePicture } from '../server/profileWorkflow';
import { authenticateStudent, authenticateTeacher, sameOrigin } from '../server/session';

const studentDependencies = { upload: uploadDrivePicture, trash: trashDrivePicture, save: setStudentPicture };
const teacherDependencies = { upload: uploadTeacherDrivePicture, trash: trashTeacherDrivePicture, save: setTeacherPicture };

export default {
  async fetch(request: Request): Promise<Response> {
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    let body: Record<string, unknown> = {};
    if (request.method !== 'GET') {
      try { body = await readJson(request, request.method === 'POST' ? 2_900_000 : 1024); }
      catch { return json({ error: 'Invalid picture request.' }, 400); }
    }
    const wantsTeacher = body.teacherId !== undefined || new URL(request.url).searchParams.get('role') === 'teacher';
    let owner;
    try { owner = wantsTeacher ? await authenticateTeacher(request) : await authenticateStudent(request); }
    catch (error) { console.error('Profile authentication failed:', error); return json({ error: 'Profile service is temporarily unavailable.' }, 503); }
    if (!owner) return json({ error: 'Please sign in again to manage your picture.' }, 401);
    if (request.method === 'GET') return json({ imageUrl: owner.profileImageUrl || '', fileId: owner.profileImageFileId || '' });
    if (wantsTeacher ? body.teacherId !== owner.id : body.studentId !== undefined && body.studentId !== owner.id) return json({ error: 'You can only manage your own picture.' }, 403);
    const dependencies = wantsTeacher ? teacherDependencies : studentDependencies;

    try {
      if (request.method === 'DELETE') {
        const result = await removeProfilePicture(owner, dependencies);
        return json({ imageUrl: '', fileId: '', cleanupPending: result.cleanupPending });
      }
      const filename = typeof body.filename === 'string' ? body.filename.slice(0, 120) : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
      const base64 = typeof body.fileData === 'string' ? body.fileData : '';
      if (!filename || !base64) return json({ error: 'Choose a picture to upload.' }, 400);
      try { decodeProfileImage(base64, mimeType); }
      catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid image.' }, 400); }
      const result = await replaceProfilePicture(owner, { filename, mimeType, base64 }, dependencies);
      return json(result);
    } catch (error) {
      console.error('Profile picture operation failed:', error);
      return json({ error: 'Could not update the picture. Your existing profile is safe.' }, 502);
    }
  },
};
