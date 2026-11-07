import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import type { Student } from '../types';
import { withFirestoreTimeout } from '../utils/firestoreTimeout';

const STORAGE_KEY = 'it_lab_students';

function getLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw) as Student[];
  } catch {
    return [];
  }
}

function saveLocalStudents(students: Student[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save students to localStorage', err);
  }
}

function sortStudents(list: Student[]): Student[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function mergeStudents(remote: Student[], local: Student[]): Student[] {
  const map = new Map<string, Student>();
  for (const student of local) {
    if (student?.id) map.set(student.id, student);
  }
  for (const student of remote) {
    if (!student?.id) continue;
    const existing = map.get(student.id);
    map.set(student.id, {
      ...existing,
      ...student,
      password: student.password || existing?.password || '',
      contact: student.contact || existing?.contact || '',
    });
  }
  return sortStudents([...map.values()]);
}

async function persistStudent(student: Student): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured, so the student cannot be saved for login.');
  }
  await withFirestoreTimeout(setDoc(doc(db, 'students', student.id), student, { merge: true }), 10000);
}

export function getStudentByIdLocal(id: string): Student | null {
  return getLocalStudents().find((s) => s.id === id) ?? null;
}

export function readStudentsLocal(): Student[] {
  return getLocalStudents();
}

export async function fetchStudents(): Promise<Student[]> {
  const local = getLocalStudents();

  if (isFirebaseConfigured && db) {
    try {
      const snap = await withFirestoreTimeout(getDocs(collection(db, 'students')));
      const remote: Student[] = [];
      snap.forEach((d) => {
        const data = d.data();
        remote.push({
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          contact: data.contact || '',
          password: data.password || '',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      const merged = mergeStudents(remote, local);
      saveLocalStudents(merged);

      const remoteIds = new Set(remote.map((item) => item.id));
      for (const student of merged) {
        const remoteStudent = remote.find((item) => item.id === student.id);
        const needsSync =
          !remoteIds.has(student.id) ||
          (!!student.password && !remoteStudent?.password);
        if (needsSync) {
          try {
            await persistStudent(student);
          } catch (err) {
            console.error(`Error syncing student ${student.id} to Firestore:`, err);
          }
        }
      }

      return merged;
    } catch (error) {
      console.warn('Firestore fetch error, reading local cache:', error);
      return local;
    }
  }

  return local;
}

export async function addStudent(
  name: string,
  email: string,
  password: string,
  contact = ''
): Promise<Student> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanContact = contact.trim();

  if (!cleanName) {
    throw new Error('Please enter the student name.');
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid student email.');
  }
  if (cleanPassword.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  const current = await fetchStudents();
  if (current.some((student) => student.email.toLowerCase() === cleanEmail)) {
    throw new Error('A student with this email address already exists.');
  }

  const newStudent: Student = {
    id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    contact: cleanContact,
    password: cleanPassword,
    createdAt: new Date().toISOString(),
  };

  saveLocalStudents(sortStudents([...current, newStudent]));

  try {
    await persistStudent(newStudent);
  } catch (err) {
    console.error('Error writing student to Firestore:', err);
    throw new Error(
      'Student was saved on this device, but Firebase save failed. Check the connection and try again so they can log in.'
    );
  }

  return newStudent;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const current = getLocalStudents().filter((s) => s.id !== studentId);
  saveLocalStudents(current);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (err) {
      console.error('Error deleting student from Firestore:', err);
    }
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  const cached = getStudentByIdLocal(id);
  try {
    const list = await fetchStudents();
    return list.find((s) => s.id === id) ?? cached;
  } catch {
    return cached;
  }
}

export async function updateStudent(
  id: string,
  name: string,
  email: string,
  password?: string,
  contact?: string
): Promise<Student> {
  const current = getLocalStudents();
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error('Student not found');
  }

  const updated: Student = {
    ...current[index],
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password && password.trim() ? password.trim() : current[index].password,
    contact: contact !== undefined ? contact.trim() : current[index].contact || '',
  };

  current[index] = updated;
  saveLocalStudents(sortStudents(current));

  try {
    await persistStudent(updated);
  } catch (err) {
    console.error('Error updating student in Firestore:', err);
    throw new Error('Could not save student changes to Firebase.');
  }

  return updated;
}

export async function updateStudentPassword(id: string, password: string): Promise<Student> {
  const current = await fetchStudents();
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error('Student not found');
  }

  const nextPassword = password.trim();
  if (nextPassword.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  const updated: Student = {
    ...current[index],
    password: nextPassword,
  };

  current[index] = updated;
  saveLocalStudents(current);

  try {
    await persistStudent(updated);
  } catch (err) {
    console.error('Error updating student password in Firestore:', err);
    throw new Error('Could not save the new password to Firebase.');
  }

  return updated;
}
