import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import { fetchStudents } from './studentService';
import type { CourseAccessPermission, Teacher, UserSession } from '../types';

const TEACHERS_STORAGE_KEY = 'it_lab_teachers';
const SESSION_STORAGE_KEY = 'it_lab_auth_session';

function getLocalTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(TEACHERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: Teacher[] = JSON.parse(raw);
    // Filter out dummy teacher 't_1' if previously cached
    const cleaned = parsed.filter((t) => t.id !== 't_1');
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function readTeachersLocal(): Teacher[] {
  return getLocalTeachers();
}

function saveLocalTeachers(teachers: Teacher[]) {
  try {
    localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
  } catch (err) {
    console.error('Failed to save teachers to localStorage', err);
  }
}

export function getTeacherByIdLocal(id: string): Teacher | null {
  return getLocalTeachers().find((t) => t.id === id) ?? null;
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const cached = getTeacherByIdLocal(id);
  try {
    const list = await fetchTeachers();
    return list.find((t) => t.id === id) ?? cached;
  } catch {
    return cached;
  }
}

export async function fetchTeachers(): Promise<Teacher[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      if (!snap.empty) {
        const list: Teacher[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name || '',
            email: data.email || '',
            password: data.password || '',
            profileImageUrl: data.profileImageUrl || undefined,
            profileImageFileId: data.profileImageFileId || undefined,
            accountType: data.accountType === 'user' ? 'user' : 'teacher',
            permissions: Array.isArray(data.permissions) ? data.permissions as CourseAccessPermission[] : undefined,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        saveLocalTeachers(list);
        return list;
      }

      // If Firestore is empty, sync any local teachers
      const local = getLocalTeachers();
      if (local.length > 0) {
        for (const t of local) {
          try {
            await setDoc(doc(db, 'teachers', t.id), t);
          } catch (e) {
            console.error('Error migrating local teacher to Firestore:', e);
          }
        }
        return local;
      }

      saveLocalTeachers([]);
      return [];
    } catch (err) {
      console.warn('Error fetching teachers from Firestore, using local:', err);
      return getLocalTeachers();
    }
  }

  return getLocalTeachers();
}

export async function addTeacher(name: string, email: string, password: string, accountType: 'teacher' | 'user' = 'teacher', permissions: CourseAccessPermission[] = []): Promise<Teacher> {
  const newTeacher: Teacher = {
    id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    accountType,
    ...(accountType === 'user' ? { permissions } : {}),
    createdAt: new Date().toISOString(),
  };

  const list = getLocalTeachers();
  list.push(newTeacher);
  saveLocalTeachers(list);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'teachers', newTeacher.id), newTeacher);
    } catch (err) {
      console.error('Error saving teacher to Firestore:', err);
    }
  }

  return newTeacher;
}

export async function deleteTeacher(teacherId: string): Promise<void> {
  const list = getLocalTeachers().filter((t) => t.id !== teacherId);
  saveLocalTeachers(list);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'teachers', teacherId));
    } catch (err) {
      console.error('Error deleting teacher from Firestore:', err);
    }
  }
}

export async function updateTeacher(
  id: string,
  name: string,
  email: string,
  password?: string,
  accountType?: 'teacher' | 'user',
  permissions?: CourseAccessPermission[]
): Promise<Teacher> {
  const list = getLocalTeachers();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Teacher not found');
  }
  const nextAccountType = accountType || list[index].accountType || 'teacher';
  const nextPermissions = permissions || list[index].permissions || [];

  const updated: Teacher = {
    ...list[index],
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password && password.trim() ? password.trim() : list[index].password,
    accountType: nextAccountType,
    ...(nextAccountType === 'user' ? { permissions: nextPermissions } : { permissions: undefined }),
  };

  list[index] = updated;
  saveLocalTeachers(list);

  if (isFirebaseConfigured && db) {
    try {
      const payload: Record<string, unknown> = {
        name: updated.name,
        email: updated.email,
        accountType: updated.accountType || 'teacher',
        permissions: updated.permissions || [],
      };
      if (password && password.trim()) {
        payload.password = updated.password;
      }
      await updateDoc(doc(db, 'teachers', id), payload);
    } catch (err) {
      console.error('Error updating teacher in Firestore:', err);
    }
  }

  return updated;
}


/**
 * Authenticate either as fixed admin or registered teacher.
 */
export async function loginUser(identifier: string, password: string): Promise<UserSession> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Check fixed Admin Credentials
  // Fixed credentials: username: admin, password: admin@123
  if (cleanId === 'admin' && cleanPass === 'admin@123') {
    const session: UserSession = {
      role: 'admin',
      name: 'Admin',
      email: 'admin',
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  // 2. Check Teacher credentials
  const teachers = await fetchTeachers();
  const matched = teachers.find(
    (t) => t.email.toLowerCase() === cleanId && t.password === cleanPass
  );

  if (matched) {
    let profileImageUrl = matched.profileImageUrl;
    try {
      const response = await fetch('/api/teacher-login', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass }), signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const payload = await response.json() as { teacher: { profileImageUrl?: string } };
        profileImageUrl = payload.teacher.profileImageUrl || undefined;
      }
    } catch (error) { console.warn('Teacher picture service is unavailable:', error); }
    const session: UserSession = {
      role: matched.accountType === 'user' ? 'user' : 'teacher',
      name: matched.name,
      email: matched.email,
      teacherId: matched.id,
      permissions: matched.accountType === 'user' ? matched.permissions || [] : undefined,
      profileImageUrl,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  // 3. Check Student credentials
  try {
    const response = await fetch('/api/student-login', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
    });
    if (response.ok) {
      const payload = await response.json() as { student: { id: string; name: string; email: string; profileImageUrl?: string } };
      const session: UserSession = {
        role: 'student', name: payload.student.name, email: payload.student.email,
        studentId: payload.student.id, profileImageUrl: payload.student.profileImageUrl || undefined,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return session;
    }
    if (response.status !== 404 || !import.meta.env.DEV) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || 'Student sign-in is unavailable.');
    }
  } catch (error) {
    if (!import.meta.env.DEV) throw error;
    console.warn('Student API unavailable in Vite development; using local login.', error);
  }

  // Vite's standalone dev server does not host Vercel functions.
  const students = await fetchStudents();
  const localStudents = students;
  const matchedStudent = localStudents.find(
    (s) => s.email.toLowerCase() === cleanId && (s.password || '') === cleanPass && !!s.password
  );

  if (matchedStudent) {
    const session: UserSession = {
      role: 'student',
      name: matchedStudent.name,
      email: matchedStudent.email,
      studentId: matchedStudent.id,
      profileImageUrl: matchedStudent.profileImageUrl,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  throw new Error('Invalid credentials. Please check your email/username and password.');
}

export function getCurrentSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function logoutUser(): Promise<void> {
  const session = getCurrentSession();
  if (session?.role === 'teacher' || session?.role === 'user') {
    try { await fetch('/api/teacher-logout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(5000) }); }
    catch (error) { console.warn('Could not clear teacher picture session:', error); }
  }
  if (session?.role === 'student') {
    try {
      const response = await fetch('/api/student-logout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(5000) });
      if (!response.ok && !import.meta.env.DEV) throw new Error('Sign-out service is unavailable. Please try again.');
    } catch (error) {
      if (!import.meta.env.DEV) throw error;
      console.warn('Could not clear server student session in development:', error);
    }
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function updateTeacherPictureCache(teacherId: string, imageUrl?: string, fileId?: string): void {
  saveLocalTeachers(getLocalTeachers().map(teacher => teacher.id === teacherId
    ? { ...teacher, profileImageUrl: imageUrl, profileImageFileId: fileId } : teacher));
}
