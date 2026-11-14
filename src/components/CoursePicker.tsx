import React, { useEffect, useState } from 'react';
import { BookOpen, Users, UserRound } from 'lucide-react';
import type { LabClass, Teacher } from '../types';
import { StudentAcademicStandings } from './StudentAcademicStandings';
import { fetchTeachers, readTeachersLocal } from '../services/teacherService';

interface CoursePickerProps {
  classes: LabClass[];
  roleLabel: string;
  studentId?: string;
  isLoading?: boolean;
  onSelect: (classId: string) => void;
}

export const CoursePicker: React.FC<CoursePickerProps> = ({
  classes,
  roleLabel,
  studentId,
  isLoading = false,
  onSelect,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>(() => readTeachersLocal());

  useEffect(() => {
    let cancelled = false;
    void fetchTeachers()
      .then((items) => { if (!cancelled) setTeachers(items); })
      .catch((error) => console.error('Failed to load course instructors:', error));
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading your courses...</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center animate-zoom-in">
        <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-800">No courses assigned yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Ask an administrator to add you to a class section.
        </p>
      </div>
    );
  }

  return (
    <div id="course-picker" className="space-y-5 animate-zoom-in">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Courses</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select a course to open the {roleLabel} workspace.
        </p>
      </div>

      {roleLabel === 'student' && studentId && (
        <StudentAcademicStandings classes={classes} studentId={studentId} />
      )}

      <div className="course-picker-grid grid auto-rows-fr gap-4">
        {classes.map((course, index) => {
          const assignedTeachers = teachers.filter((teacher) => course.teacherIds.includes(teacher.id));
          return (
          <button
            key={course.id}
            id={`course-card-${course.id}`}
            type="button"
            onClick={() => onSelect(course.id)}
            className="course-picker-card animate-zoom-in group flex h-full min-h-[148px] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex min-h-10 items-center justify-between gap-3 bg-emerald-800 px-4 py-2.5 text-white">
              <h3 className="min-w-0 truncate text-xs font-bold tracking-wide">
                {course.name}
              </h3>
              <BookOpen className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col px-4 py-3 underline decoration-slate-300 underline-offset-2 group-hover:no-underline">
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                {course.description || 'Course workspace and learning resources'}
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
                <UserRound className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" aria-hidden="true" />
                <span className="line-clamp-2">{assignedTeachers.length > 0 ? assignedTeachers.map((teacher) => teacher.name).join(', ') : 'Instructor not assigned'}</span>
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {course.studentIds.length} students
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  Open course
                </span>
              </div>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
};
