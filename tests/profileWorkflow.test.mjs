import assert from 'node:assert/strict';
import { test } from 'node:test';
import { replaceProfilePicture, removeProfilePicture } from '../server/profileWorkflow.ts';

test('teacher replacement keeps the same safe save-then-trash order', async () => {
  const calls = [];
  const teacher = { id: 't_123456789_abc', profileImageUrl: 'old-url', profileImageFileId: 'old-file' };
  const result = await replaceProfilePicture(teacher, { filename: 'photo.png', mimeType: 'image/png', base64: 'abc' }, {
    upload: async ownerId => { calls.push(`upload:${ownerId}`); return { imageUrl: 'new-url', fileId: 'new-file' }; },
    save: async owner => { calls.push(`save:${owner.id}`); },
    trash: async (ownerId, fileId) => { calls.push(`trash:${ownerId}:${fileId}`); },
  });
  assert.equal(result.imageUrl, 'new-url');
  assert.deepEqual(calls, ['upload:t_123456789_abc', 'save:t_123456789_abc', 'trash:t_123456789_abc:old-file']);
});

const student = { id: 'std_1234', name: 'Student', email: 'student@example.com', password: 'secret', profileImageUrl: 'old-url', profileImageFileId: 'old-file', updateTime: 'now' };
const file = { filename: 'picture.png', mimeType: 'image/png', base64: 'data' };
const picture = { imageUrl: 'new-url', fileId: 'new-file' };

test('upload saves the new picture before trashing the old file', async () => {
  const events = [];
  const result = await replaceProfilePicture(student, file, {
    upload: async id => { events.push(`upload:${id}`); return picture; },
    save: async (_, value) => { events.push(`save:${value.fileId}`); },
    trash: async (_, id) => { events.push(`trash:${id}`); },
  });
  assert.deepEqual(events, ['upload:std_1234', 'save:new-file', 'trash:old-file']);
  assert.deepEqual(result, { ...picture, cleanupPending: false });
});

test('a database failure rolls back the new upload and preserves the old picture', async () => {
  const events = [];
  await assert.rejects(replaceProfilePicture(student, file, {
    upload: async () => picture,
    save: async () => { events.push('save-failed'); throw new Error('database unavailable'); },
    trash: async (_, id) => { events.push(`trash:${id}`); },
  }), /database unavailable/);
  assert.deepEqual(events, ['save-failed', 'trash:new-file']);
});

test('old-file deletion failure is reported without losing the saved new picture', async () => {
  let attempts = 0;
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await replaceProfilePicture(student, file, {
      upload: async () => picture,
      save: async () => {},
      trash: async () => { attempts++; throw new Error('Drive unavailable'); },
    });
    assert.equal(result.cleanupPending, true);
    assert.equal(attempts, 2);
  } finally { console.error = originalError; }
});

test('remove clears database fields before trashing the file', async () => {
  const events = [];
  const result = await removeProfilePicture(student, {
    upload: async () => picture,
    save: async (_, value) => { assert.equal(value, null); events.push('clear'); },
    trash: async (_, id) => { events.push(`trash:${id}`); },
  });
  assert.deepEqual(events, ['clear', 'trash:old-file']);
  assert.deepEqual(result, { cleanupPending: false });
});

test('remove keeps existing picture if database update fails', async () => {
  let trashCalled = false;
  await assert.rejects(removeProfilePicture(student, {
    upload: async () => picture,
    save: async () => { throw new Error('database unavailable'); },
    trash: async () => { trashCalled = true; },
  }), /database unavailable/);
  assert.equal(trashCalled, false);
});
