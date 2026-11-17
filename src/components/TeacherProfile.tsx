import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Eye, EyeOff, Mail, Trash2, User } from 'lucide-react';
import type { Teacher, UserSession } from '../types';
import {
  fetchTeachers,
  getTeacherById,
  getTeacherByIdLocal,
  updateTeacher,
} from '../services/teacherService';
import { removeTeacherProfilePicture, uploadTeacherProfilePicture, validateProfilePicture } from '../services/profilePictureService';
import { StudentAvatar } from './StudentAvatar';

interface TeacherProfileProps {
  teacherId: string;
  session: UserSession;
  onSessionUpdated: (session: UserSession) => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({
  teacherId,
  session,
  onSessionUpdated,
  showToast,
}) => {
  const [teacher, setTeacher] = useState<Teacher | null>(() => getTeacherByIdLocal(teacherId));
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureNotice, setPictureNotice] = useState('');
  const pictureInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getTeacherById(teacherId);
        if (cancelled) return;
        if (data) {
          setTeacher(data);
          setName(data.name);
          setEmail(data.email);
        } else {
          setLoadError('Profile could not be found.');
        }
      } catch (err) {
        console.error('Failed to load teacher profile:', err);
        if (!cancelled && !getTeacherByIdLocal(teacherId)) {
          setLoadError('Failed to load your profile.');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);
  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const choosePicture = (file?: File) => {
    setError(null); setPictureNotice('');
    if (!file) return;
    try { validateProfilePicture(file); setSelectedFile(file); }
    catch (err) { setSelectedFile(null); if (pictureInput.current) pictureInput.current.value = ''; setError(err instanceof Error ? err.message : 'Invalid picture.'); }
  };
  const savePicture = async () => {
    if (!selectedFile) return;
    setPictureBusy(true); setError(null);
    try {
      const result = await uploadTeacherProfilePicture(teacherId, selectedFile);
      setTeacher(current => current ? { ...current, profileImageUrl: result.imageUrl, profileImageFileId: result.fileId } : current);
      onSessionUpdated({ ...session, profileImageUrl: result.imageUrl });
      setSelectedFile(null);
      if (pictureInput.current) pictureInput.current.value = '';
      setPictureNotice(result.cleanupPending ? 'Picture saved. The old Drive image needs administrator cleanup.' : 'Profile picture saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save picture.'); }
    finally { setPictureBusy(false); }
  };
  const removePicture = async () => {
    setPictureBusy(true); setError(null);
    try {
      const result = await removeTeacherProfilePicture(teacherId);
      setTeacher(current => current ? { ...current, profileImageUrl: undefined, profileImageFileId: undefined } : current);
      onSessionUpdated({ ...session, profileImageUrl: undefined });
      setSelectedFile(null);
      setPictureNotice(result.cleanupPending ? 'Picture removed. The Drive image needs administrator cleanup.' : 'Profile picture removed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove picture.'); }
    finally { setPictureBusy(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail) {
      setError('Please fill in name and email.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    try {
      const allTeachers = await fetchTeachers();
      if (allTeachers.some((t) => t.id !== teacherId && t.email.toLowerCase() === trimmedEmail)) {
        setError('Another account is already using this email.');
        return;
      }

      setIsSaving(true);
      const updated = await updateTeacher(
        teacherId,
        trimmedName,
        trimmedEmail,
        trimmedPassword || undefined
      );
      setTeacher(updated);
      setPassword('');

      const nextSession: UserSession = {
        ...session,
        name: updated.name,
        email: updated.email,
      };
      onSessionUpdated(nextSession);
      showToast('success', 'Profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = teacher?.name || session.name;
  const imageUrl = teacher ? teacher.profileImageUrl : session.profileImageUrl;

  return (
    <div id="teacher-profile" className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Update your name, login email, or password.
        </p>
      </div>

      {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Profile picture">
        <div className="flex flex-wrap items-center gap-5">
          {previewUrl ? <img src={previewUrl} alt="Selected profile picture preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-200" /> : <StudentAvatar name={displayName} imageUrl={imageUrl} size="lg" />}
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-900">Profile picture</h3><p className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP · maximum 2 MB</p><div className="mt-3 flex flex-wrap gap-2">
            <input ref={pictureInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="teacher-picture-input" onChange={event => choosePicture(event.target.files?.[0])} />
            <button type="button" disabled={pictureBusy} onClick={() => pictureInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Camera className="h-3.5 w-3.5" />{imageUrl ? 'Change picture' : 'Choose picture'}</button>
            {selectedFile && <button type="button" disabled={pictureBusy} onClick={() => void savePicture()} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{pictureBusy ? 'Saving...' : 'Save picture'}</button>}
            {selectedFile && <button type="button" disabled={pictureBusy} onClick={() => { setSelectedFile(null); if (pictureInput.current) pictureInput.current.value = ''; }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>}
            {imageUrl && !selectedFile && <button type="button" disabled={pictureBusy} onClick={() => void removePicture()} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Remove</button>}
          </div></div>
        </div>
        {pictureNotice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{pictureNotice}</p>}
      </section>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
        {loadError && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100">
          <StudentAvatar name={displayName} imageUrl={imageUrl} size="md" />
          <div>
            <p className="text-sm font-bold text-slate-900">{displayName}</p>
            <p className="text-[11px] text-slate-400">Teacher profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="teacher-profile-name"
              className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1"
            >
              <User className="w-3.5 h-3.5" />
              Full Name
            </label>
            <input
              id="teacher-profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-profile-email"
              className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1"
            >
              <Mail className="w-3.5 h-3.5" />
              Email / Login
            </label>
            <input
              id="teacher-profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-profile-password"
              className="block text-xs font-semibold text-slate-500 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="teacher-profile-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                minLength={4}
                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum 4 characters. Only fill in if you want to change your password.
            </p>
          </div>

          <div className="pt-2">
            <button
              id="btn-save-teacher-profile"
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
