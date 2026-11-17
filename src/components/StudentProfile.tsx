import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Eye, EyeOff, LockKeyhole, Mail, Phone, Trash2, User } from 'lucide-react';
import type { Student, UserSession } from '../types';
import { getStudentById, getStudentByIdLocal } from '../services/studentService';
import { removeProfilePicture, uploadProfilePicture, validateProfilePicture } from '../services/profilePictureService';
import { StudentAvatar } from './StudentAvatar';
import { changeOwnStudentPassword } from '../services/studentPasswordService';

interface StudentProfileProps {
  studentId: string;
  session: UserSession;
  onImageUpdated: (imageUrl: string) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, session, onImageUpdated }) => {
  const [student, setStudent] = useState<Student | null>(() => getStudentByIdLocal(studentId));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getStudentById(studentId).then(data => {
      if (cancelled) return;
      setStudent(data);
      if (!data) setError('Profile could not be found.');
      else if ((data.profileImageUrl || '') !== (session.profileImageUrl || '')) onImageUpdated(data.profileImageUrl || '');
    }).catch(err => {
      console.error('Failed to load student profile:', err);
      if (!cancelled && !getStudentByIdLocal(studentId)) setError('Failed to load your profile.');
    });
    return () => { cancelled = true; };
  }, [studentId]);
  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const name = student?.name || session.name;
  const email = student?.email || session.email;
  const contact = student?.contact || '';
  const imageUrl = student ? student.profileImageUrl : session.profileImageUrl;
  const onFileChange = (file?: File) => {
    setError(null); setNotice(null);
    if (!file) return;
    try { validateProfilePicture(file); setSelectedFile(file); }
    catch (err) { setSelectedFile(null); if (inputRef.current) inputRef.current.value = ''; setError(err instanceof Error ? err.message : 'Invalid image.'); }
  };
  const onUpload = async () => {
    if (!selectedFile) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await uploadProfilePicture(studentId, selectedFile);
      setStudent(current => current ? { ...current, profileImageUrl: result.imageUrl, profileImageFileId: result.fileId } : current);
      onImageUpdated(result.imageUrl);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setNotice(result.cleanupPending ? 'Picture saved. The old Drive image could not be trashed; please contact an administrator.' : 'Profile picture saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save picture.'); }
    finally { setBusy(false); }
  };
  const onRemove = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await removeProfilePicture(studentId);
      setStudent(current => current ? { ...current, profileImageUrl: undefined, profileImageFileId: undefined } : current);
      onImageUpdated('');
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setNotice(result.cleanupPending ? 'Picture removed from your profile. The Drive file could not be trashed; please contact an administrator.' : 'Profile picture removed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove picture.'); }
    finally { setBusy(false); }
  };
  const onChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null); setPasswordNotice(null);
    if (!currentPassword) { setPasswordError('Enter your current password.'); return; }
    if (newPassword.length < 8 || newPassword.length > 128 || newPassword.trim() !== newPassword) { setPasswordError('New password must be 8 to 128 characters, without spaces at the start or end.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    setPasswordBusy(true);
    try {
      await changeOwnStudentPassword(studentId, currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setVisiblePasswords(false);
      setPasswordNotice('Password changed successfully.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change your password.');
    } finally { setPasswordBusy(false); }
  };

  return <div id="student-profile" className="max-w-2xl space-y-5">
    <div><h2 className="text-lg font-bold tracking-tight text-slate-900">My Profile</h2><p className="mt-0.5 text-xs text-slate-500">Manage your picture, password, and account details.</p></div>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Profile picture">
      <div className="flex flex-wrap items-center gap-5">
        {previewUrl ? <img src={previewUrl} alt="Selected profile picture preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-200" /> : <StudentAvatar name={name} imageUrl={imageUrl} size="lg" />}
        <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-900">Profile picture</h3><p className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP · maximum 2 MB</p><div className="mt-3 flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="student-picture-input" onChange={event => onFileChange(event.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Camera className="h-3.5 w-3.5" />{imageUrl ? 'Change picture' : 'Choose picture'}</button>
          {selectedFile && <button type="button" disabled={busy} onClick={() => void onUpload()} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{busy ? 'Saving...' : 'Save picture'}</button>}
          {selectedFile && <button type="button" disabled={busy} onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = ''; }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>}
          {imageUrl && !selectedFile && <button type="button" disabled={busy} onClick={() => void onRemove()} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Remove</button>}
        </div></div>
      </div>
      {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Account details">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-5"><StudentAvatar name={name} imageUrl={imageUrl} size="md" /><div><p className="text-sm font-bold text-slate-900">{name}</p><p className="text-[11px] text-slate-400">Student profile</p></div></div>
      <p className="mb-4 text-xs text-slate-500">Account details are managed by an administrator.</p>
      <dl className="space-y-4">
        <div><dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><User className="h-3.5 w-3.5" />Full Name</dt><dd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{name || '—'}</dd></div>
        <div><dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Mail className="h-3.5 w-3.5" />Email</dt><dd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{email || '—'}</dd></div>
        <div><dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Phone className="h-3.5 w-3.5" />Contact</dt><dd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{contact || '—'}</dd></div>
      </dl>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Change password">
      <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4"><LockKeyhole className="h-4 w-4 text-emerald-700" /><div><h3 className="text-sm font-bold text-slate-900">Change password</h3><p className="mt-0.5 text-xs text-slate-500">Use at least 8 characters for your new password.</p></div></div>
      <form onSubmit={event => void onChangePassword(event)} className="space-y-4">
        {([
          { id: 'current-password', label: 'Current password', value: currentPassword, setValue: setCurrentPassword, autocomplete: 'current-password' },
          { id: 'new-password', label: 'New password', value: newPassword, setValue: setNewPassword, autocomplete: 'new-password' },
          { id: 'confirm-password', label: 'Confirm new password', value: confirmPassword, setValue: setConfirmPassword, autocomplete: 'new-password' },
        ] as const).map(field => <div key={field.id}>
          <label htmlFor={field.id} className="mb-1.5 block text-xs font-semibold text-slate-600">{field.label}</label>
          <input id={field.id} type={visiblePasswords ? 'text' : 'password'} value={field.value} onChange={event => field.setValue(event.target.value)} autoComplete={field.autocomplete} required maxLength={field.id === 'current-password' ? 1024 : 128} disabled={passwordBusy} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
        </div>)}
        <button type="button" onClick={() => setVisiblePasswords(value => !value)} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-800" aria-label={visiblePasswords ? 'Hide passwords' : 'Show passwords'}>{visiblePasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{visiblePasswords ? 'Hide passwords' : 'Show passwords'}</button>
        {passwordError && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{passwordError}</p>}
        {passwordNotice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{passwordNotice}</p>}
        <div><button type="submit" disabled={passwordBusy} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">{passwordBusy ? 'Saving...' : 'Change password'}</button></div>
      </form>
    </section>
  </div>;
};
