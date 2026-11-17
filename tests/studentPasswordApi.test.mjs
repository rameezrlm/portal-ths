import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeStudentPassword } from '../api/student-password.ts';

const url = 'https://portal.example.test/api/student-password';
const student = {
  id: 'std_1', name: 'Student', email: 'student@example.test',
  password: 'old-password', updateTime: '2026-01-01T00:00:00Z',
};
function request(body, origin = 'https://portal.example.test') {
  return new Request(url, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function services(overrides = {}) {
  return {
    authenticate: async () => student,
    save: async () => {},
    cookie: updated => `session-for-${updated.id}`,
    ...overrides,
  };
}

test('student password changes require a signed student session and same origin', async () => {
  const unauthenticated = await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'new-password' }), services({ authenticate: async () => null }));
  assert.equal(unauthenticated.status, 401);
  const crossOrigin = await changeStudentPassword(request({}, 'https://other.example.test'), services());
  assert.equal(crossOrigin.status, 403);
  const method = await changeStudentPassword(new Request(url), services());
  assert.equal(method.status, 405);
});

test('student password change validates ownership credentials and new password', async () => {
  let saves = 0;
  const deps = services({ save: async () => { saves++; } });
  assert.equal((await changeStudentPassword(request({ currentPassword: 'wrong', newPassword: 'new-password' }), deps)).status, 403);
  assert.equal((await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'short' }), deps)).status, 400);
  assert.equal((await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'old-password' }), deps)).status, 400);
  assert.equal((await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: ' new-password' }), deps)).status, 400);
  assert.equal(saves, 0);
});

test('successful password change saves and then returns a refreshed signed session', async () => {
  const order = [];
  const response = await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'new-password' }), services({
    save: async (record, password) => { assert.equal(record.id, 'std_1'); assert.equal(password, 'new-password'); order.push('save'); },
    cookie: updated => { assert.equal(updated.password, 'new-password'); order.push('cookie'); return 'new-session'; },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(response.headers.get('set-cookie'), 'new-session');
  assert.deepEqual(order, ['cookie', 'save']);
});

test('failed database save leaves the session unchanged', async () => {
  const response = await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'new-password' }), services({
    save: async () => { throw new Error('database unavailable'); },
    cookie: () => 'unused-session',
  }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('a session configuration failure does not change the database', async () => {
  let saved = false;
  const response = await changeStudentPassword(request({ currentPassword: 'old-password', newPassword: 'new-password' }), services({
    save: async () => { saved = true; },
    cookie: () => { throw new Error('session secret missing'); },
  }));
  assert.equal(response.status, 503);
  assert.equal(saved, false);
});
