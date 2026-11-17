import { updateStudentPictureCache } from './studentService';
import { updateTeacherPictureCache } from './teacherService';

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateProfilePicture(file: File): void {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG, or WEBP image.');
  if (file.size === 0 || file.size > PROFILE_IMAGE_MAX_BYTES) throw new Error('Image must be 2 MB or smaller.');
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}
async function responseBody(response: Response): Promise<{ imageUrl?: string; fileId?: string; cleanupPending?: boolean; error?: string }> {
  const body = await response.json().catch(() => ({})) as { imageUrl?: string; fileId?: string; cleanupPending?: boolean; error?: string };
  if (!response.ok) throw new Error(body.error || 'Picture service is unavailable. Please try again.');
  return body;
}
export async function uploadProfilePicture(studentId: string, file: File) {
  validateProfilePicture(file);
  const fileData = await fileToBase64(file);
  const response = await fetch('/api/profile-picture', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, filename: file.name, mimeType: file.type, fileData }),
  });
  const result = await responseBody(response);
  if (!result.imageUrl || !result.fileId) throw new Error('Picture service returned an incomplete response.');
  updateStudentPictureCache(studentId, result.imageUrl, result.fileId);
  return { imageUrl: result.imageUrl, fileId: result.fileId, cleanupPending: Boolean(result.cleanupPending) };
}
export async function removeProfilePicture(studentId: string) {
  const response = await fetch('/api/profile-picture', {
    method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  const result = await responseBody(response);
  updateStudentPictureCache(studentId);
  return { cleanupPending: Boolean(result.cleanupPending) };
}
export async function uploadTeacherProfilePicture(teacherId: string, file: File) {
  validateProfilePicture(file);
  const fileData = await fileToBase64(file);
  const response = await fetch('/api/profile-picture', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId, filename: file.name, mimeType: file.type, fileData }),
  });
  const result = await responseBody(response);
  if (!result.imageUrl || !result.fileId) throw new Error('Picture service returned an incomplete response.');
  updateTeacherPictureCache(teacherId, result.imageUrl, result.fileId);
  return { imageUrl: result.imageUrl, fileId: result.fileId, cleanupPending: Boolean(result.cleanupPending) };
}
export async function removeTeacherProfilePicture(teacherId: string) {
  const response = await fetch('/api/profile-picture', {
    method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId }),
  });
  const result = await responseBody(response);
  updateTeacherPictureCache(teacherId);
  return { cleanupPending: Boolean(result.cleanupPending) };
}
