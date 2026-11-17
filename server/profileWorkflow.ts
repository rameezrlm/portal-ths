import type { DrivePicture } from './drive';

type PictureOwner = { id: string; profileImageUrl?: string; profileImageFileId?: string };
export interface PictureDependencies<T extends PictureOwner> {
  upload: (ownerId: string, file: { filename: string; mimeType: string; base64: string }) => Promise<DrivePicture>;
  trash: (ownerId: string, fileId: string) => Promise<void>;
  save: (owner: T, picture: DrivePicture | null) => Promise<void>;
}
async function trashWithRetry<T extends PictureOwner>(deps: PictureDependencies<T>, ownerId: string, fileId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { await deps.trash(ownerId, fileId); return true; }
    catch (error) { if (attempt === 1) console.error('Could not trash old profile picture:', error); }
  }
  return false;
}
export async function replaceProfilePicture<T extends PictureOwner>(student: T, file: { filename: string; mimeType: string; base64: string }, deps: PictureDependencies<T>) {
  const picture = await deps.upload(student.id, file);
  try { await deps.save(student, picture); }
  catch (error) {
    await trashWithRetry(deps, student.id, picture.fileId);
    throw error;
  }
  const cleanupPending = Boolean(student.profileImageFileId && student.profileImageFileId !== picture.fileId && !(await trashWithRetry(deps, student.id, student.profileImageFileId)));
  return { ...picture, cleanupPending };
}
export async function removeProfilePicture<T extends PictureOwner>(student: T, deps: PictureDependencies<T>) {
  if (!student.profileImageUrl && !student.profileImageFileId) return { cleanupPending: false };
  await deps.save(student, null);
  const cleanupPending = Boolean(student.profileImageFileId && !(await trashWithRetry(deps, student.id, student.profileImageFileId)));
  return { cleanupPending };
}
