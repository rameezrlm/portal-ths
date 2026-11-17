import assert from 'node:assert/strict';
import { test } from 'node:test';
import profileApi from '../api/profile-picture.ts';

test('picture reads and writes require an authenticated student cookie', async () => {
  const url = 'https://portal.example.test/api/profile-picture';
  const get = await profileApi.fetch(new Request(url));
  assert.equal(get.status, 401);
  const upload = await profileApi.fetch(new Request(url, {
    method: 'POST', headers: { origin: 'https://portal.example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ studentId: 'std_other', filename: 'x.png', mimeType: 'image/png', fileData: 'abc' }),
  }));
  assert.equal(upload.status, 401);
  const remove = await profileApi.fetch(new Request(url, {
    method: 'DELETE', headers: { origin: 'https://portal.example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ studentId: 'std_other' }),
  }));
  assert.equal(remove.status, 401);
});

test('cross-origin mutation is rejected before authentication', async () => {
  const response = await profileApi.fetch(new Request('https://portal.example.test/api/profile-picture', {
    method: 'DELETE', headers: { origin: 'https://other.example.test', 'content-type': 'application/json' },
    body: '{}',
  }));
  assert.equal(response.status, 403);
});
