import React, { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import type { GradeAssessment, GradeMark, GradeSection, LabClass, Student } from '../types';
import { fetchStudents, readStudentsLocal } from '../services/studentService';
import { StudentAvatar } from './StudentAvatar';
import {
  fetchGradeAssessments,
  fetchGradeMarks,
  fetchGradeSections,
  readGradeAssessmentsLocal,
  readGradeMarksLocal,
  readGradeSectionsLocal,
  markKey,
  formatGradeMark,
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
    const refresh = async () => {
      try {
        const [studentList, sectionList, assessmentList, markList] = await Promise.all([
          fetchStudents(),
          fetchGradeSections(),
          fetchGradeAssessments(),
          fetchGradeMarks(),
        ]);
        if (cancelled) return;
        setStudents(studentList);
        setSections(sectionList);
        setAssessments(assessmentList);
        setMarks(markList);
      } catch (error) {
        console.error('Failed to refresh academic standings:', error);
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const refreshPicture = () => setStudents(readStudentsLocal());

    void refresh();
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('it-lab-student-picture-changed', refreshPicture);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('it-lab-student-picture-changed', refreshPicture);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const profile = useMemo(() => {
    const student = students.find((item) => item.id === studentId);
    const classSectionIds = new Set(
      sections.filter((section) => classes.some((course) => course.id === section.classId)).map((section) => section.id)
    );
    const studentAssessments = assessments.filter(
      (assessment) =>
        classSectionIds.has(assessment.sectionId) && !assessment.hiddenFromStudents
    );
    const marksByKey = new Map(
      marks.map((mark) => [markKey(mark.assessmentId, mark.studentId), mark.marks])
    );
    const earned = studentAssessments.reduce(
      (sum, assessment) => sum + (marksByKey.get(markKey(assessment.id, studentId)) ?? 0),
      0
    );
    const total = studentAssessments.reduce((sum, assessment) => sum + assessment.totalMarks, 0);
    const percent = total > 0 ? (earned / total) * 100 : null;

    const peerIds = new Set([studentId, ...classes.flatMap((course) => course.studentIds)]);
    const peerStats = Array.from(peerIds).flatMap((peerId) => {
      const peerClassIds = new Set(
        peerId === studentId
          ? classes.map((course) => course.id)
          : classes.filter((course) => course.studentIds.includes(peerId)).map((course) => course.id)
      );
      const peerAssessments = assessments.filter((assessment) => {
        if (assessment.hiddenFromStudents) return false;
        const section = sections.find((item) => item.id === assessment.sectionId);
        return Boolean(section?.classId && peerClassIds.has(section.classId));
      });
      const peerTotal = peerAssessments.reduce((sum, assessment) => sum + assessment.totalMarks, 0);
      const hasPeerMarks = peerAssessments.some((assessment) =>
        marksByKey.has(markKey(assessment.id, peerId))
      );
      if (peerTotal <= 0 || !hasPeerMarks) return [];
      const peerEarned = peerAssessments.reduce(
        (sum, assessment) => sum + (marksByKey.get(markKey(assessment.id, peerId)) ?? 0),
        0
      );
      return [{ studentId: peerId, percent: Number(((peerEarned / peerTotal) * 100).toFixed(2)) }];
    });
    const rankedPeers = [...peerStats].sort((a, b) => b.percent - a.percent);
    const currentPeer = rankedPeers.find((peer) => peer.studentId === studentId);
    const rankPosition = currentPeer
      ? 1 + rankedPeers.filter((peer) => peer.percent > currentPeer.percent).length
      : null;

    const standing = percent === null
      ? 'Not graded yet'
      : percent >= 80 ? 'Excellent'
        : percent >= 65 ? 'Good'
          : percent >= 50 ? 'Satisfactory'
            : percent >= 40 ? 'Passing' : 'Needs improvement';

    return {
      name: student?.name || 'Student',
      rankPosition,
      rankTotal: rankedPeers.length,
      earned,
      total,
      percent,
      standing,
      imageUrl: student?.profileImageUrl,
    };
  }, [students, sections, assessments, marks, classes, studentId]);

  return (
    <section id="student-academic-standings" className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm" aria-label="Your Academic Standing">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <StudentAvatar name={profile.name} imageUrl={profile.imageUrl} size="md" className="!h-12 !w-12" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{profile.name}</h2>
        <p className="mt-1 text-[11px] text-slate-500">Class Rank: <span className="font-semibold text-slate-700">{profile.rankPosition ? `${profile.rankPosition} of ${profile.rankTotal}` : '—'}</span></p>
          </div>
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Academic Standing</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-800"><Award className="h-4 w-4 shrink-0" />{profile.standing}</div>
          {profile.percent !== null && <p className="mt-0.5 text-[11px] text-slate-500">{profile.percent.toFixed(1)}% overall</p>}
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Earned Marks</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{formatGradeMark(profile.earned)} <span className="font-medium text-slate-400">/ {formatGradeMark(profile.total)}</span></p>
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
