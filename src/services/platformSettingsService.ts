import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import { withFirestoreTimeout } from '../utils/firestoreTimeout';

export interface PlatformSettings {
  teachersCanPostAnnouncements: boolean;
  teachersCanManageApps: boolean;
  studentsCanOpenApps: boolean;
}
export const defaultPlatformSettings: PlatformSettings = { teachersCanPostAnnouncements: true, teachersCanManageApps: true, studentsCanOpenApps: true };
const KEY = 'it_lab_platform_settings';
const EVENT = 'it-lab-settings-changed';
export function readPlatformSettings(): PlatformSettings {
  try { return { ...defaultPlatformSettings, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaultPlatformSettings; }
}
function write(settings: PlatformSettings) { localStorage.setItem(KEY, JSON.stringify(settings)); window.dispatchEvent(new Event(EVENT)); }
export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  if (!isFirebaseConfigured || !db) return readPlatformSettings();
  const snap = await withFirestoreTimeout(getDoc(doc(db, 'platformSettings', 'global')));
  const settings = { ...defaultPlatformSettings, ...(snap.exists() ? snap.data() : {}) } as PlatformSettings;
  write(settings); return settings;
}
export async function savePlatformSettings(settings: PlatformSettings): Promise<void> {
  if (isFirebaseConfigured && db) await withFirestoreTimeout(setDoc(doc(db, 'platformSettings', 'global'), settings), 10000);
  write(settings);
}
export function subscribePlatformSettings(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  const storage = (event: StorageEvent) => { if (event.key === KEY) onChange(); };
  window.addEventListener('storage', storage);
  const unsub = isFirebaseConfigured && db ? onSnapshot(doc(db, 'platformSettings', 'global'), snap => {
    if (snap.exists()) write({ ...defaultPlatformSettings, ...snap.data() } as PlatformSettings);
  }, error => console.warn('Settings updates unavailable', error)) : undefined;
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', storage); unsub?.(); };
}
