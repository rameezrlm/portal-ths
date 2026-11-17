import test from 'node:test';
import assert from 'node:assert/strict';
import leaveApi from '../api/leave-requests.ts';

const url = 'https://portal.example.test/api/leave-requests';
test('leave requests require a signed student or teacher session', async () => {
  assert.equal((await leaveApi.fetch(new Request(`${url}?classId=class-1`))).status, 401);
  assert.equal((await leaveApi.fetch(new Request(`${url}?role=teacher&classId=class-1`))).status, 401);
  assert.equal((await leaveApi.fetch(new Request(url, { method: 'POST', headers: { origin: 'https://portal.example.test', 'content-type': 'application/json' }, body: JSON.stringify({ classId: 'class-1', fromDate: '2026-11-17', toDate: '2026-11-17', reason: 'I need medical leave.' }) }))).status, 401);
  assert.equal((await leaveApi.fetch(new Request(url, { method: 'PATCH', headers: { origin: 'https://portal.example.test', 'content-type': 'application/json' }, body: JSON.stringify({ id: 'leave_xxx', status: 'approved' }) }))).status, 401);
});
test('cross-origin leave decisions and submissions are rejected', async () => {
  assert.equal((await leaveApi.fetch(new Request(url, { method: 'POST', headers: { origin: 'https://other.example.test' }, body: '{}' }))).status, 403);
  assert.equal((await leaveApi.fetch(new Request(url, { method: 'PATCH', headers: { origin: 'https://other.example.test' }, body: '{}' }))).status, 403);
});
