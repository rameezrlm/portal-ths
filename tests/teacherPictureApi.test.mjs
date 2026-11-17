import test from 'node:test';
import assert from 'node:assert/strict';
import teacherLogin from '../api/teacher-login.ts';
import profileApi from '../api/profile-picture.ts';

const url = 'https://portal.example.test';
test('teacher picture operations require the teacher session', async () => {
  const get = await profileApi.fetch(new Request(`${url}/api/profile-picture?role=teacher`));
  assert.equal(get.status, 401);
  const upload = await profileApi.fetch(new Request(`${url}/api/profile-picture`, {
    method: 'POST', headers: { origin: url, 'content-type': 'application/json' },
    body: JSON.stringify({ teacherId: 't_123456789_abc', filename: 'photo.png', mimeType: 'image/png', fileData: 'abc' }),
  }));
  assert.equal(upload.status, 401);
  const remove = await profileApi.fetch(new Request(`${url}/api/profile-picture`, {
    method: 'DELETE', headers: { origin: url, 'content-type': 'application/json' },
    body: JSON.stringify({ teacherId: 't_123456789_abc' }),
  }));
  assert.equal(remove.status, 401);
});
test('teacher session issuance rejects cross-origin requests', async () => {
  const response = await teacherLogin.fetch(new Request(`${url}/api/teacher-login`, {
    method: 'POST', headers: { origin: 'https://other.example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'teacher@example.test', password: 'password' }),
  }));
  assert.equal(response.status, 403);
});
