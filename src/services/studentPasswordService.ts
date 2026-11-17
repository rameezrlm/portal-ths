import { updateStudentPasswordCache } from './studentService';

export async function changeOwnStudentPassword(studentId: string, currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch('/api/student-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const result = await response.json().catch(() => ({})) as { success?: boolean; error?: string };
  if (!response.ok) throw new Error(result.error || 'Password service is unavailable. Please try again.');
  if (!result.success) throw new Error('Password service returned an incomplete response.');
  updateStudentPasswordCache(studentId, newPassword);
}
