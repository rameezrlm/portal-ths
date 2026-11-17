import assert from 'node:assert/strict';
import { test } from 'node:test';
import { announcementsForClass, unreadAnnouncementCount } from '../src/services/announcementService.ts';

const now = new Date().toISOString();
const items = [
  { id: 'global', title: 'Platform notice', classId: undefined, published: true, createdAt: now },
  { id: 'course-a', title: 'Course A notice', classId: 'course-a', published: true, createdAt: now },
  { id: 'course-b', title: 'Course B notice', classId: 'course-b', published: true, createdAt: now },
  { id: 'draft', title: 'Draft', classId: 'course-a', published: false, createdAt: now },
];

test('course announcements exclude global and other-course posts', () => {
  assert.deepEqual(announcementsForClass(items, 'course-a').map(item => item.id), ['course-a']);
});

test('global and course badges count only their own scope', () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    assert.equal(unreadAnnouncementCount(items, 'student_global', []), 1);
    assert.equal(unreadAnnouncementCount(items, 'student_course_a', ['course-a']), 1);
  } finally { globalThis.localStorage = originalStorage; }
});
