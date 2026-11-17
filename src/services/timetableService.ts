import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';
import type { ClassSchedule } from '../types';
import { withFirestoreTimeout } from '../utils/firestoreTimeout';
import { scheduleTeacherIds, scheduleWeekdays } from '../utils/scheduleRecurrence';

const KEY = 'it_lab_timetable';
const EVENT = 'it-lab-timetable-changed';
const sort = (items: ClassSchedule[]) => [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
const normalize = (item: ClassSchedule): ClassSchedule => ({ ...item, teacherIds: scheduleTeacherIds(item), weekdays: scheduleWeekdays(item), active: item.active !== false });

export function readSchedulesLocal(): ClassSchedule[] {
  try { return sort((JSON.parse(localStorage.getItem(KEY) || '[]') as ClassSchedule[]).map(normalize)); } catch { return []; }
}
function write(items: ClassSchedule[]) {
  localStorage.setItem(KEY, JSON.stringify(sort(items)));
  window.dispatchEvent(new Event(EVENT));
}
export async function fetchSchedules(): Promise<ClassSchedule[]> {
  if (!isFirebaseConfigured || !db) return readSchedulesLocal();
  const snap = await withFirestoreTimeout(getDocs(collection(db, 'classSchedules')));
  const items = snap.docs.map(d => normalize({ ...d.data(), id: d.id } as ClassSchedule));
  write(items);
  return sort(items);
}
export function subscribeSchedules(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  const storage = (event: StorageEvent) => { if (event.key === KEY) onChange(); };
  window.addEventListener('storage', storage);
  const unsub = isFirebaseConfigured && db ? onSnapshot(collection(db, 'classSchedules'), snap => {
    write(snap.docs.map(d => normalize({ ...d.data(), id: d.id } as ClassSchedule)));
  }, error => console.warn('Schedule updates unavailable', error)) : undefined;
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', storage); unsub?.(); };
}
export async function saveSchedule(input: Omit<ClassSchedule, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<ClassSchedule> {
  if (!input.classId || scheduleTeacherIds(input as ClassSchedule).length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(new Date(`${input.date}T00:00:00`).getTime()) || scheduleWeekdays(input as ClassSchedule).length === 0 || !/^\d{2}:\d{2}$/.test(input.time) || !Number.isFinite(input.durationMinutes) || input.durationMinutes < 15) {
    throw new Error('Select a course, teacher, and at least one day, then enter a valid start date, time, and duration of at least 15 minutes.');
  }
  const item: ClassSchedule = normalize({ ...input, teacherIds: [...new Set(scheduleTeacherIds(input as ClassSchedule))], active: input.active !== false, id: input.id || `sched_${crypto.randomUUID()}`, createdAt: input.createdAt || new Date().toISOString() });
  delete item.teacherId;
  if (isFirebaseConfigured && db) await withFirestoreTimeout(setDoc(doc(db, 'classSchedules', item.id), item), 10000);
  write([...readSchedulesLocal().filter(s => s.id !== item.id), item]);
  return item;
}
export async function setScheduleActive(id: string, active: boolean): Promise<ClassSchedule> {
  const item = readSchedulesLocal().find(schedule => schedule.id === id);
  if (!item) throw new Error('Scheduled class not found. Refresh and try again.');
  return saveSchedule({ ...item, active });
}
export async function removeSchedule(id: string): Promise<void> {
  if (isFirebaseConfigured && db) await withFirestoreTimeout(deleteDoc(doc(db, 'classSchedules', id)), 10000);
  write(readSchedulesLocal().filter(s => s.id !== id));
}

export { nextScheduleOccurrence, scheduleWeekday, scheduleWeekdays, scheduleTimeRange, scheduleTeacherIds } from '../utils/scheduleRecurrence';
