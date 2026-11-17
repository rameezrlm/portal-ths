import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeCourseActivity } from '../src/utils/courseActivity.ts';

const data = {
  assignments: [
    { id: 'assignment-a', classId: 'course-a', createdAt: '2026-01-03' },
    { id: 'assignment-b', classId: 'course-b', createdAt: '2026-01-04' },
  ],
  submissions: [
    { id: 'submission-a', assignmentId: 'assignment-a', studentId: 'student-a', submittedAt: '2026-01-05' },
    { id: 'submission-b', assignmentId: 'assignment-b', studentId: 'student-b', submittedAt: '2026-01-05' },
  ],
  sections: [
    { id: 'section-a', classId: 'course-a' },
    { id: 'section-b', classId: 'course-b' },
  ],
  assessments: [
    { id: 'assessment-a', sectionId: 'section-a' },
    { id: 'hidden-a', sectionId: 'section-a', hiddenFromStudents: true },
    { id: 'assessment-b', sectionId: 'section-b' },
  ],
  marks: [
    { assessmentId: 'assessment-a', studentId: 'student-a', updatedAt: '2026-01-06' },
    { assessmentId: 'hidden-a', studentId: 'student-a', updatedAt: '2026-01-06' },
    { assessmentId: 'assessment-b', studentId: 'student-a', updatedAt: '2026-01-06' },
    { assessmentId: 'assessment-a', studentId: 'student-b', updatedAt: '2026-01-06' },
  ],
};

test('student card counts only their course uploads and visible grades', () => {
  const summary = summarizeCourseActivity('course-a', 'student', 'student-a', data, { assignments: '2026-01-02', gradebook: '2026-01-05' });
  assert.deepEqual(summary, { assignments: 1, newAssignments: 1, submissions: 1, newSubmissions: 0, grades: 1, newGrades: 1 });
});

test('teacher card counts only submissions and assessments in the assigned course', () => {
  const summary = summarizeCourseActivity('course-a', 'teacher', undefined, data, { assignments: '2026-01-04', gradebook: '' });
  assert.deepEqual(summary, { assignments: 1, newAssignments: 0, submissions: 1, newSubmissions: 1, grades: 2, newGrades: 0 });
});
