import test from 'node:test';
import assert from 'node:assert/strict';
import { leaveInputError } from '../src/utils/leaveValidation.ts';

test('leave applications require real dates, an ordered range, and a meaningful reason', () => {
  assert.equal(leaveInputError('2026-11-17', '2026-11-18', 'Family appointment that requires travel.'), null);
  assert.match(leaveInputError('2026-02-30', '2026-03-01', 'Family appointment that requires travel.'), /valid date range/);
  assert.match(leaveInputError('2026-11-19', '2026-11-18', 'Family appointment that requires travel.'), /valid date range/);
  assert.match(leaveInputError('2026-11-17', '2026-12-20', 'Family appointment that requires travel.'), /31 days/);
  assert.match(leaveInputError('2026-11-17', '2026-11-17', 'sick'), /reason/);
  assert.equal(leaveInputError('2026-10-15', '2026-11-14', 'Family appointment that requires travel.'), null);
});
