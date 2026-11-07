import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import type { Announcement } from '../types';
import { withFirestoreTimeout } from '../utils/firestoreTimeout';

const ANNOUNCEMENTS_KEY = 'it_lab_announcements';
const ANNOUNCEMENTS_CHANGED_EVENT = 'it-lab-announcements-changed';
const PENDING_LOCAL_MS = 15 * 60 * 1000;

function newId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

function toIso(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      const date = toDate.call(value);
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return '';
}

function normalizeAnnouncement(raw: Partial<Announcement> & { id: string }): Announcement {
  return {
    id: raw.id,
    classId: raw.classId || undefined,
    title: typeof raw.title === 'string' ? raw.title : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
    createdAt: toIso(raw.createdAt) || new Date().toISOString(),
  };
}

function readAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Announcement>[]) : [];
    return parsed
      .filter((item): item is Partial<Announcement> & { id: string } => Boolean(item && item.id))
      .map(normalizeAnnouncement);
  } catch {
    return [];
  }
}

function writeAnnouncements(list: Announcement[], notify = false): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));
    if (notify && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));
    }
  } catch (err) {
    console.error('Failed to save announcements to localStorage', err);
  }
}

function sortAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function mergeAnnouncements(remote: Announcement[], local: Announcement[]): Announcement[] {
  const map = new Map<string, Announcement>();
  for (const item of remote) {
    map.set(item.id, item);
  }
  const remoteIds = new Set(remote.map((item) => item.id));
  for (const item of local) {
    if (remoteIds.has(item.id)) continue;
    const created = Date.parse(item.createdAt);
    const age = Date.now() - created;
    if (Number.isFinite(created) && age >= 0 && age < PENDING_LOCAL_MS) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

function toPayload(announcement: Announcement): Record<string, unknown> {
  return JSON.parse(JSON.stringify(announcement)) as Record<string, unknown>;
}

function fromSnapshotDocs(
  docs: { id: string; data: () => Record<string, unknown> }[]
): Announcement[] {
  return docs.map((d) =>
    normalizeAnnouncement({ ...(d.data() as unknown as Partial<Announcement>), id: d.id })
  );
}

async function persistAnnouncement(announcement: Announcement): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await withFirestoreTimeout(
    setDoc(doc(db, 'announcements', announcement.id), toPayload(announcement), {
      merge: true,
    }),
    10000
  );
}

export function announcementsForClass(list: Announcement[], classId: string): Announcement[] {
  return list.filter((item) => !item.classId || item.classId === classId);
}

export function formatAnnouncementTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function subscribeAnnouncementUpdates(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, 200);
  };

  window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, trigger);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ANNOUNCEMENTS_KEY || event.key === null) trigger();
  };
  window.addEventListener('storage', onStorage);

  let unsubscribeFirestore: (() => void) | undefined;
  if (isFirebaseConfigured && db) {
    unsubscribeFirestore = onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        const remote = fromSnapshotDocs(snap.docs);
        const merged = sortAnnouncements(mergeAnnouncements(remote, readAnnouncements()));
        writeAnnouncements(merged);
        trigger();
      },
      (err) => {
        console.warn('Announcement live updates unavailable:', err);
      }
    );
  }

  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, trigger);
    window.removeEventListener('storage', onStorage);
    unsubscribeFirestore?.();
  };
}

export function readAnnouncementsLocal(): Announcement[] {
  return sortAnnouncements(readAnnouncements());
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const local = sortAnnouncements(readAnnouncements());

  if (isFirebaseConfigured && db) {
    try {
      const snap = await withFirestoreTimeout(getDocs(collection(db, 'announcements')));
      const remote = fromSnapshotDocs(snap.docs);

      if (remote.length > 0) {
        const merged = sortAnnouncements(mergeAnnouncements(remote, local));
        writeAnnouncements(merged);
        return merged;
      }

      if (local.length > 0) {
        for (const announcement of local) {
          try {
            await setDoc(doc(db, 'announcements', announcement.id), toPayload(announcement));
          } catch (e) {
            console.error('Error migrating announcement to Firestore:', e);
          }
        }
        return local;
      }

      writeAnnouncements([]);
      return [];
    } catch (err) {
      console.warn('Error fetching announcements from Firestore, using local:', err);
      return local;
    }
  }

  return local;
}

export async function createAnnouncement(input: {
  title: string;
  message: string;
  createdBy: string;
  classId: string;
}): Promise<Announcement> {
  const title = input.title.trim();
  const message = input.message.trim();
  const classId = input.classId.trim();
  if (!title) {
    throw new Error('Please enter a title.');
  }
  if (!message) {
    throw new Error('Please enter an announcement message.');
  }
  if (!classId) {
    throw new Error('Select a course before posting an announcement.');
  }

  const announcement: Announcement = {
    id: newId(),
    classId,
    title,
    message,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  const list = readAnnouncements();
  writeAnnouncements(
    sortAnnouncements([announcement, ...list.filter((item) => item.id !== announcement.id)]),
    true
  );

  try {
    await persistAnnouncement(announcement);
  } catch (err) {
    console.error(`Error saving announcement ${announcement.id}:`, err);
    throw new Error('Announcement saved on this device, but it could not reach students. Check your connection and try again.');
  }

  return announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const next = readAnnouncements().filter((item) => item.id !== id);
  writeAnnouncements(next, true);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      console.error('Error deleting announcement from Firestore:', err);
      throw new Error('Could not delete this announcement for students. Try again.');
    }
  }
}
