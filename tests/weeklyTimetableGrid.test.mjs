import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyTimetableGrid } from '../src/components/WeeklyTimetableGrid.tsx';

const classes = [
  { id: 'a', name: 'E-commerce', teacherIds: [], studentIds: [], createdAt: '' },
  { id: 'b', name: 'IT Lab', teacherIds: [], studentIds: [], createdAt: '' },
];
const base = { id: 'a-slot', classId: 'a', teacherIds: ['teacher'], date: '2026-11-16', weekdays: [1, 3], time: '09:00', durationMinutes: 90, createdAt: '', active: true };

test('weekly grid places each meeting under its selected day and stretches its block to the end time', () => {
  const html = renderToStaticMarkup(React.createElement(WeeklyTimetableGrid, { classes, schedules: [base] }));
  assert.match(html, /Monday/);
  assert.match(html, /Wednesday/);
  assert.equal((html.match(/aria-label="E-commerce, (Monday|Wednesday),/g) || []).length, 2);
  assert.match(html, /style="top:2px;height:128px/);
  assert.doesNotMatch(html, /overflow-auto|min-w-\[1030px\]|max-h-\[720px\]/);
});

test('overlapping classes remain visible side by side', () => {
  const second = { ...base, id: 'b-slot', classId: 'b', weekdays: [1], time: '09:30', durationMinutes: 60 };
  const html = renderToStaticMarkup(React.createElement(WeeklyTimetableGrid, { classes, schedules: [base, second] }));
  assert.match(html, /aria-label="E-commerce, Monday,/);
  assert.match(html, /aria-label="IT Lab, Monday,/);
  assert.equal((html.match(/width:calc\(50% - 4px\)/g) || []).length, 2);
});
