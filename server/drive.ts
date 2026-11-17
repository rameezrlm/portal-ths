export interface DrivePicture { imageUrl: string; fileId: string }
function config() {
  const url = process.env.GOOGLE_DRIVE_SCRIPT_URL;
  const secret = process.env.GOOGLE_DRIVE_API_SECRET;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) || !secret || secret.length < 32) {
    throw new Error('Google Drive profile-picture service is not configured.');
  }
  return { url, secret };
}
async function callDrive(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { url, secret } = config();
  const response = await fetch(url, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('Google Drive request failed.');
  const result = await response.json() as Record<string, unknown>;
  if (result.status !== 'success') throw new Error(typeof result.message === 'string' ? result.message : 'Google Drive request failed.');
  return result;
}
export async function uploadDrivePicture(studentId: string, file: { filename: string; mimeType: string; base64: string }): Promise<DrivePicture> {
  const result = await callDrive({ operation: 'upload', studentId, filename: file.filename, mimeType: file.mimeType, fileData: file.base64 });
  if (typeof result.imageUrl !== 'string' || typeof result.fileId !== 'string' || !result.fileId) throw new Error('Google Drive returned an incomplete upload response.');
  return { imageUrl: result.imageUrl, fileId: result.fileId };
}
export async function trashDrivePicture(studentId: string, fileId: string): Promise<void> {
  await callDrive({ operation: 'delete', studentId, fileId });
}
export async function uploadTeacherDrivePicture(teacherId: string, file: { filename: string; mimeType: string; base64: string }): Promise<DrivePicture> {
  const result = await callDrive({ operation: 'upload', ownerId: teacherId, filename: file.filename, mimeType: file.mimeType, fileData: file.base64 });
  if (typeof result.imageUrl !== 'string' || typeof result.fileId !== 'string' || !result.fileId) throw new Error('Google Drive returned an incomplete upload response.');
  return { imageUrl: result.imageUrl, fileId: result.fileId };
}
export async function trashTeacherDrivePicture(teacherId: string, fileId: string): Promise<void> {
  await callDrive({ operation: 'delete', ownerId: teacherId, fileId });
}
export function decodeProfileImage(base64: string, mimeType: string): Buffer {
  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 2_800_000) throw new Error('Invalid image file.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) throw new Error('Image must be 2 MB or smaller.');
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!((mimeType === 'image/jpeg' && isJpeg) || (mimeType === 'image/png' && isPng) || (mimeType === 'image/webp' && isWebp))) {
    throw new Error('Choose a valid JPG, PNG, or WEBP image.');
  }
  return bytes;
}
