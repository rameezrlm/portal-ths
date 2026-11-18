import React, { useEffect, useState } from 'react';
import { BookOpen, ClipboardList, GraduationCap, Megaphone, Users, UserRound } from 'lucide-react';
import type { LabClass, Teacher } from '../types';
import type { CourseAccessPermission } from '../types';
import { StudentAcademicStandings } from './StudentAcademicStandings';
import { fetchTeachers, readTeachersLocal } from '../services/teacherService';
import { fetchAssignments, fetchAssignmentSubmissions, readAssignmentsLocal, readAssignmentSubmissionsLocal } from '../services/assignmentService';
import { fetchGradeAssessments, fetchGradeMarks, fetchGradeSections, readGradeAssessmentsLocal, readGradeMarksLocal, readGradeSectionsLocal } from '../services/gradebookService';
import { readCourseActivitySeen, summarizeCourseActivity, type CourseActivityData } from '../utils/courseActivity';

export type CourseSection = 'announcements' | 'assignments' | 'gradebook' | 'attendance';

interface CoursePickerProps {
  classes: LabClass[];
  roleLabel: 'teacher' | 'student' | 'user';
  visibleSections?: CourseAccessPermission[];
  studentId?: string;
  isLoading?: boolean;
  unreadCountForCourse?: (classId: string) => number;
  announcementCountForCourse?: (classId: string) => number;
  activityUserKey: string;
  afterStudentInfo?: React.ReactNode;
  onSelect: (classId: string, section: CourseSection) => void;
}

export const CoursePicker: React.FC<CoursePickerProps> = ({
  classes,
  roleLabel,
  visibleSections,
  studentId,
  isLoading = false,
  unreadCountForCourse,
  announcementCountForCourse,
  activityUserKey,
  afterStudentInfo,
  onSelect,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>(readTeachersLocal);
  const [activity, setActivity] = useState<CourseActivityData>(() => ({
    assignments: readAssignmentsLocal(),
    submissions: readAssignmentSubmissionsLocal(),
    sections: readGradeSectionsLocal(),
    assessments: readGradeAssessmentsLocal(),
    marks: readGradeMarksLocal(),
  }));

  useEffect(() => {
    let cancelled = false;
    void fetchTeachers()
      .then(items => { if (!cancelled) setTeachers(items); })
      .catch(error => console.error('Failed to load course instructors:', error));
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchAssignments(), fetchAssignmentSubmissions(), fetchGradeSections(), fetchGradeAssessments(), fetchGradeMarks(),
    ]).then(([assignments, submissions, sections, assessments, marks]) => {
      if (!cancelled) setActivity({ assignments, submissions, sections, assessments, marks });
    }).catch(error => console.error('Failed to refresh course activity:', error));
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-xs font-medium text-slate-500">Loading your courses...</p>
    </div>;
  }

  if (classes.length === 0) {
    return <div className="space-y-5">
      {roleLabel === 'student' && studentId && <StudentAcademicStandings classes={classes} studentId={studentId} />}
      {afterStudentInfo}
      <div className="animate-zoom-in rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><BookOpen className="h-5 w-5" /></div>
        <p className="text-sm font-semibold text-slate-800">No courses assigned yet</p>
        <p className="mt-1 text-xs text-slate-500">Ask an administrator to add you to a class section.</p>
      </div>
    </div>;
  }

  return <div id="course-picker" className="space-y-5 animate-zoom-in">
    {roleLabel === 'student' && studentId && <StudentAcademicStandings classes={classes} studentId={studentId} />}
    {afterStudentInfo}

    <div>
      <h2 className="text-lg font-bold tracking-tight text-slate-900">My Courses</h2>
      <p className="mt-0.5 text-xs text-slate-500">A quick view of each course. Open one to see its sections.</p>
    </div>

    <div className="course-picker-grid grid auto-rows-fr gap-5">
      {classes.map((course, index) => {
        const assignedTeachers = teachers.filter(teacher => course.teacherIds.includes(teacher.id));
        const unread = unreadCountForCourse?.(course.id) || 0;
        const noticeCount = announcementCountForCourse?.(course.id) || 0;
        const summary = summarizeCourseActivity(course.id, roleLabel, studentId, activity, {
          assignments: readCourseActivitySeen(activityUserKey, course.id, 'assignments'),
          gradebook: readCourseActivitySeen(activityUserKey, course.id, 'gradebook'),
        });
        const newUploads = roleLabel !== 'student' ? summary.newSubmissions : summary.newAssignments;
        const newCount = unread + newUploads + summary.newGrades;
        const allMetrics = roleLabel !== 'student' ? [
          { label: 'Notices', count: noticeCount, fresh: unread, icon: Megaphone },
          { label: 'Assignments', count: summary.assignments, fresh: 0, icon: ClipboardList },
          { label: 'Submissions', count: summary.submissions, fresh: summary.newSubmissions, icon: ClipboardList },
          { label: 'Assessments', count: summary.grades, fresh: 0, icon: GraduationCap },
        ] : [
          { label: 'Notices', count: noticeCount, fresh: unread, icon: Megaphone },
          { label: 'Assignments', count: summary.assignments, fresh: summary.newAssignments, icon: ClipboardList },
          { label: 'Grades', count: summary.grades, fresh: summary.newGrades, icon: GraduationCap },
        ];
        const metrics = allMetrics.filter(metric => roleLabel !== 'user' || visibleSections?.includes(
          metric.label === 'Notices' ? 'announcements' : metric.label === 'Submissions' ? 'assignments' : 'gradebook'
        ));
        return <article
          key={course.id}
          id={`course-card-${course.id}`}
          className="course-picker-card animate-zoom-in flex h-full min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <button
            type="button"
            onClick={() => {
              if (roleLabel === 'user' && !visibleSections?.length) return;
              onSelect(course.id, roleLabel === 'user' ? visibleSections![0] : 'announcements');
            }}
            className="group flex h-full w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
            aria-label={`Open ${course.name}`}
          >
            <span className="flex min-h-16 w-full items-start justify-between gap-3 bg-emerald-800 px-4 py-3 text-white transition-colors group-hover:bg-emerald-900">
              <span className="min-w-0"><strong className="block truncate text-sm font-bold">{course.name}</strong><span className="mt-1 block truncate text-[11px] text-emerald-100">{course.description || 'Course workspace'}</span></span>
              <span className="flex shrink-0 items-center gap-1.5">{newCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-emerald-800" aria-label={`${newCount} new course items`}>{newCount}</span>}<BookOpen className="h-4 w-4 text-emerald-100" aria-hidden="true" /></span>
            </span>
            <span className="flex w-full flex-1 flex-col px-4 py-3">
              <span className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" /><span className="line-clamp-2">{assignedTeachers.length ? assignedTeachers.map(teacher => teacher.name).join(', ') : 'Instructor not assigned'}</span></span>
              <span className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><Users className="h-3.5 w-3.5" aria-hidden="true" />{course.studentIds.length} students</span>
              <span className={`mt-4 grid gap-1.5 ${roleLabel !== 'student' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {metrics.map(({ label, count, fresh, icon: Icon }) => <span key={label} className="min-w-0 border border-slate-100 bg-slate-50 px-2 py-2">
                  <span className="flex items-center justify-between gap-1 text-slate-500"><Icon className="h-3 w-3 shrink-0" aria-hidden="true" />{fresh > 0 && <span className="rounded-sm bg-emerald-100 px-1 text-[9px] font-bold text-emerald-800">{fresh} new</span>}</span>
                  <span className="mt-1 block text-base font-bold leading-none text-slate-900">{count}</span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-slate-500">{label}</span>
                </span>)}
              </span>
              <span className="mt-3 text-[11px] font-semibold text-emerald-800">Open course →</span>
            </span>
          </button>
        </article>;
      })}
    </div>
  </div>;
};
