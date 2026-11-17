import test from 'node:test';
import assert from 'node:assert/strict';
import { nextScheduleOccurrence, scheduleWeekday, scheduleWeekdays } from '../src/utils/scheduleRecurrence.ts';

const schedule = {
  id: 'schedule-1', classId: 'course-1', teacherIds: ['teacher-1'],
  date: '2026-11-16', weekdays: [1, 3, 5], time: '15:30', durationMinutes: 90,
  createdAt: '2026-11-01T00:00:00.000Z', active: true,
};

test('a schedule meets on each selected day from its start date', () => {
  assert.deepEqual(scheduleWeekdays(schedule), [1, 3, 5]);
  assert.equal(scheduleWeekday(schedule), 'Monday, Wednesday, Friday');
  assert.equal(nextScheduleOccurrence(schedule, new Date('2026-11-17T12:00:00'))?.getDate(), 18);
  assert.equal(nextScheduleOccurrence(schedule, new Date('2026-11-18T16:00:00'))?.getDay(), 3);
  assert.equal(nextScheduleOccurrence(schedule, new Date('2026-11-18T17:01:00'))?.getDay(), 5);
});

test('selected weekdays before the start date do not create earlier meetings', () => {
  const startsWednesday = { ...schedule, date: '2026-11-18', weekdays: [1, 3] };
  assert.equal(nextScheduleOccurrence(startsWednesday, new Date('2026-11-17T12:00:00'))?.getDay(), 3);
});

test('older schedules still use the start date weekday and inactive schedules have no meeting', () => {
  const { weekdays: _weekdays, ...legacy } = schedule;
  assert.deepEqual(scheduleWeekdays(legacy), [1]);
  assert.equal(nextScheduleOccurrence(legacy, new Date('2026-11-17T12:00:00'))?.getDay(), 1);
  assert.equal(nextScheduleOccurrence({ ...schedule, active: false }), null);
});
