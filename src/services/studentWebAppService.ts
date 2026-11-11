import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import { withFirestoreTimeout } from '../utils/firestoreTimeout';

export interface StudentWebApp {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

const COLLECTION = 'studentWebApps';
const STORAGE_KEY = 'it_lab_student_web_apps';

function readLocal(): StudentWebApp[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as StudentWebApp[];
  } catch {
    return [];
  }
}

function saveLocal(apps: StudentWebApp[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function normalizeUrl(value: string): string {
  const raw = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Enter a valid website URL.');
  }
  return url.toString();
}

export async function fetchStudentWebApps(): Promise<StudentWebApp[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await withFirestoreTimeout(getDocs(collection(db, COLLECTION)));
      const apps = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<StudentWebApp, 'id'>),
      }));
      apps.sort((a, b) => a.name.localeCompare(b.name));
      saveLocal(apps);
      return apps;
    } catch (error) {
      console.warn('Could not load student web apps from Firebase:', error);
    }
  }
  return readLocal().sort((a, b) => a.name.localeCompare(b.name));
}

export async function addStudentWebApp(name: string, rawUrl: string): Promise<StudentWebApp> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Enter an app name.');
  const url = normalizeUrl(rawUrl);
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. The app link was not saved.');
  }

  const app: StudentWebApp = {
    id: `webapp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    url,
    createdAt: new Date().toISOString(),
  };
  await withFirestoreTimeout(setDoc(doc(db, COLLECTION, app.id), app), 10000);
  saveLocal([...readLocal().filter((item) => item.id !== app.id), app]);
  return app;
}

export async function removeStudentWebApp(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  await withFirestoreTimeout(deleteDoc(doc(db, COLLECTION, id)), 10000);
  saveLocal(readLocal().filter((item) => item.id !== id));
}
