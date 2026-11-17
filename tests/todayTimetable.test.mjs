import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimetablePreview } from '../src/components/TimetablePreview.tsx';

const date = new Date();
const iso = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
const classes = [{ id: 'one', name: 'Today Course', teacherIds: ['teacher-1'], studentIds: ['student-1'], createdAt: '' }, { id: 'two', name: 'Tomorrow Course', teacherIds: ['teacher-1'], studentIds: ['student-1'], createdAt: '' }];
const schedules = [
  { id: 'today', classId: 'one', teacherIds: ['teacher-1'], date: iso(date), weekdays: [date.getDay()], time: '10:00', durationMinutes: 60, createdAt: '', active: true },
  { id: 'tomorrow', classId: 'two', teacherIds: ['teacher-1'], date: iso(nextDay), weekdays: [nextDay.getDay()], time: '10:00', durationMinutes: 60, createdAt: '', active: true },
];
const render = items => {
  globalThis.localStorage = { getItem: () => JSON.stringify(items) };
  return renderToStaticMarkup(React.createElement(TimetablePreview, { role: 'student', classes, compact: true, onOpen: () => {} }));
};

test('landing timetable shows only today’s classes', () => {
  const html = render(schedules);
  assert.match(html, /Today Course/);
  assert.doesNotMatch(html, /Tomorrow Course/);
});
test('landing timetable has a specific empty state for today', () => {
  assert.match(render([schedules[1]]), /No classes today\./);
});
