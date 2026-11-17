import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeProfileImage } from '../server/drive.ts';

test('accepts matching JPG, PNG, and WEBP signatures', () => {
  const examples = [
    ['image/jpeg', Buffer.from([255, 216, 255, 224, 0])],
    ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    ['image/webp', Buffer.from('RIFF0000WEBP', 'ascii')],
  ];
  for (const [type, bytes] of examples) assert.deepEqual(decodeProfileImage(bytes.toString('base64'), type), bytes);
});

test('rejects a spoofed MIME type and images over 2 MB', () => {
  const jpg = Buffer.from([255, 216, 255, 224]);
  assert.throws(() => decodeProfileImage(jpg.toString('base64'), 'image/png'), /valid JPG/);
  const oversized = Buffer.concat([jpg, Buffer.alloc(2 * 1024 * 1024)]);
  assert.throws(() => decodeProfileImage(oversized.toString('base64'), 'image/jpeg'), /2 MB/);
});
