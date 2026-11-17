import type { AssignmentMaterial, AssignmentSubmission, GradeAssessment, GradeMark, GradeSection } from '../types';

export interface CourseActivityData {
  assignments: AssignmentMaterial[];
  submissions: AssignmentSubmission[];
  sections: GradeSection[];
  assessments: GradeAssessment[];
  marks: GradeMark[];
}

export function courseActivitySeenKey(userKey: string, classId: string, section: 'assignments' | 'gradebook'): string {
  return `it_lab_course_seen_${userKey}_${classId}_${section}`;
}

export function readCourseActivitySeen(userKey: string, classId: string, section: 'assignments' | 'gradebook'): string {
  try { return localStorage.getItem(courseActivitySeenKey(userKey, classId, section)) || ''; }
  catch { return ''; }
}

export function markCourseActivitySeen(userKey: string, classId: string, section: 'assignments' | 'gradebook'): void {
  try { localStorage.setItem(courseActivitySeenKey(userKey, classId, section), new Date().toISOString()); }
  catch { /* Browsers with disabled storage can still open the course. */ }
}

export function summarizeCourseActivity(
  classId: string,
  role: 'teacher' | 'student',
  studentId: string | undefined,
  data: CourseActivityData,
  seen: { assignments: string; gradebook: string }
) {
  const assignments = data.assignments.filter(item => item.classId === classId);
  const assignmentIds = new Set(assignments.map(item => item.id));
  const submissions = data.submissions.filter(item => assignmentIds.has(item.assignmentId));
  const sectionIds = new Set(data.sections.filter(item => item.classId === classId).map(item => item.id));
  const assessments = data.assessments.filter(item => sectionIds.has(item.sectionId) && (role === 'teacher' || !item.hiddenFromStudents));
  const assessmentIds = new Set(assessments.map(item => item.id));
  const marks = role === 'student' && studentId
    ? data.marks.filter(item => item.studentId === studentId && assessmentIds.has(item.assessmentId))
    : [];

  return {
    assignments: assignments.length,
    newAssignments: role === 'student' ? assignments.filter(item => item.createdAt > seen.assignments).length : 0,
    submissions: submissions.length,
    newSubmissions: role === 'teacher' ? submissions.filter(item => item.submittedAt > seen.assignments).length : 0,
    grades: role === 'student' ? marks.length : assessments.length,
    newGrades: role === 'student' ? marks.filter(item => item.updatedAt > seen.gradebook).length : 0,
  };
}
