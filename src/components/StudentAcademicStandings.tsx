import React, { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import type { GradeAssessment, GradeMark, GradeSection, LabClass, Student } from '../types';
import { fetchStudents, readStudentsLocal } from '../services/studentService';
import {
  fetchGradeAssessments,
  fetchGradeMarks,
  fetchGradeSections,
  readGradeAssessmentsLocal,
  readGradeMarksLocal,
  readGradeSectionsLocal,
} from '../services/gradebookService';

interface StudentAcademicStandingsProps {
  classes: LabClass[];
  studentId: string;
}

export const StudentAcademicStandings: React.FC<StudentAcademicStandingsProps> = ({ classes, studentId }) => {
  const [students, setStudents] = useState<Student[]>(() => readStudentsLocal());
  const [sections, setSections] = useState<GradeSection[]>(() => readGradeSectionsLocal());
  const [assessments, setAssessments] = useState<GradeAssessment[]>(() => readGradeAssessmentsLocal());
  const [marks, setMarks] = useState<GradeMark[]>(() => readGradeMarksLocal());

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudents(), fetchGradeSections(), fetchGradeAssessments(), fetchGradeMarks()])
      .then(([studentList, sectionList, assessmentList, markList]) => {
        if (cancelled) return;
        setStudents(studentList);
        setSections(sectionList);
        setAssessments(assessmentList);
        setMarks(markList);
      })
      .catch((error) => console.error('Failed to refresh academic standings:', error));
    return () => { cancelled = true; };
  }, []);

  const profile = useMemo(() => {
    const student = students.find((item) => item.id === studentId);
    const orderedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
    const rosterPosition = orderedStudents.findIndex((item) => item.id === studentId);
    const classSectionIds = new Set(
      sections.filter((section) => classes.some((course) => course.id === section.classId)).map((section) => section.id)
    );
    const studentAssessments = assessments.filter((assessment) => classSectionIds.has(assessment.sectionId));
    const assessmentIds = new Set(studentAssessments.map((assessment) => assessment.id));
    const studentMarks = marks.filter((mark) => mark.studentId === studentId && assessmentIds.has(mark.assessmentId));
    const earned = studentMarks.reduce((sum, mark) => sum + mark.marks, 0);
    const total = studentAssessments.reduce((sum, assessment) => sum + assessment.totalMarks, 0);
    const percent = total > 0 ? (earned / total) * 100 : null;
    const standing = percent === null
      ? 'Not graded yet'
      : percent >= 80 ? 'Excellent'
        : percent >= 65 ? 'Good'
          : percent >= 50 ? 'Satisfactory'
            : percent >= 40 ? 'Passing' : 'Needs improvement';

    return {
      name: student?.name || 'Student',
      rollNumber: rosterPosition >= 0 ? rosterPosition + 1 : null,
      earned,
      total,
      percent,
      standing,
      initials: (student?.name || 'S').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    };
  }, [students, sections, assessments, marks, classes, studentId]);

  return (
    <section id="student-academic-standings" className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm" aria-label="Your Academic Standing">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900 ring-2 ring-emerald-50">{profile.initials}</div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{profile.name}</h2>
            <p className="mt-1 text-[11px] text-slate-500">Roll Number: <span className="font-semibold text-slate-700">{profile.rollNumber ?? '—'}</span></p>
          </div>
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Academic Standing</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-800"><Award className="h-4 w-4 shrink-0" />{profile.standing}</div>
          {profile.percent !== null && <p className="mt-0.5 text-[11px] text-slate-500">{profile.percent.toFixed(1)}% overall</p>}
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Earned Marks</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{profile.earned} <span className="font-medium text-slate-400">/ {profile.total}</span></p>
          <p className="mt-0.5 text-[11px] text-slate-500">Across enrolled courses</p>
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">My Courses</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{classes.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Enrolled courses</p>
        </div>
      </div>
    </section>
  );
};
