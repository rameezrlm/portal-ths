import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import type { GradeAssessment, GradeMark, GradeSection } from '../types';
import {
  fetchGradeAssessments,
  fetchGradeMarks,
  fetchGradeSections,
  markKey,
  readGradeAssessmentsLocal,
  readGradeMarksLocal,
  readGradeSectionsLocal,
  computeClassGradebookStats,
} from '../services/gradebookService';

interface StudentGradebookProps {
  classId: string;
  studentId: string;
  studentName: string;
  classStudentIds: string[];
}

interface SectionView {
  section: GradeSection;
  assessments: {
    assessment: GradeAssessment;
    marks: number | null;
    highestMarks: number | null;
    classAverageMarks: number | null;
  }[];
  obtained: number;
  total: number;
}

export const StudentGradebook: React.FC<StudentGradebookProps> = ({
  classId,
  studentId,
  studentName,
  classStudentIds,
}) => {
  const initialSections = readGradeSectionsLocal().filter((section) => section.classId === classId);
  const initialSectionIds = new Set(initialSections.map((section) => section.id));
  const initialAssessments = readGradeAssessmentsLocal().filter((assessment) =>
    initialSectionIds.has(assessment.sectionId)
  );
  const [sections, setSections] = useState<GradeSection[]>(() => initialSections);
  const [assessments, setAssessments] = useState<GradeAssessment[]>(() => initialAssessments);
  const [marks, setMarks] = useState<GradeMark[]>(() => readGradeMarksLocal());
  const [isLoading, setIsLoading] = useState(
    () =>
      initialSections.length === 0 &&
      initialAssessments.length === 0 &&
      readGradeMarksLocal().length === 0
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    initialSections.forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    const hasCache =
      readGradeSectionsLocal().length > 0 ||
      readGradeAssessmentsLocal().length > 0 ||
      readGradeMarksLocal().length > 0;

    const load = async (silent: boolean) => {
      if (!silent) setIsLoading(true);
      try {
        const [sectionList, assessmentList, markList] = await Promise.all([
          fetchGradeSections(),
          fetchGradeAssessments(),
          fetchGradeMarks(),
        ]);
        if (cancelled) return;
        const classSections = sectionList.filter((section) => section.classId === classId);
        const sectionIds = new Set(classSections.map((section) => section.id));
        setSections(classSections);
        setAssessments(assessmentList.filter((item) => sectionIds.has(item.sectionId)));
        setMarks(markList);

        const initial: Record<string, boolean> = {};
        classSections.forEach((s) => {
          initial[s.id] = true;
        });
        setExpanded(initial);
      } catch (err) {
        console.error('Failed to load student gradebook:', err);
      } finally {
        if (!cancelled && !silent) setIsLoading(false);
      }
    };

    void load(hasCache);
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const marksMap = useMemo(() => {
    const map: Record<string, number> = {};
    marks.forEach((m) => {
      if (m.studentId === studentId) {
        map[m.id] = m.marks;
      }
    });
    return map;
  }, [marks, studentId]);

  const classMemberIds = useMemo(
    () => Array.from(new Set([...classStudentIds, studentId])),
    [classStudentIds, studentId]
  );

  const courseStats = useMemo(
    () => computeClassGradebookStats(classMemberIds, assessments, marks),
    [classMemberIds, assessments, marks]
  );
  const hasClassMarks = useMemo(() => {
    const assessmentIds = new Set(assessments.map((assessment) => assessment.id));
    return marks.some(
      (mark) => classMemberIds.includes(mark.studentId) && assessmentIds.has(mark.assessmentId)
    );
  }, [assessments, classMemberIds, marks]);

  const sectionViews: SectionView[] = useMemo(() => {
    return sections
      .map((section) => {
        const sectionAssessments = assessments.filter((a) => a.sectionId === section.id);
        const rows = sectionAssessments.map((assessment) => {
          const key = markKey(assessment.id, studentId);
          const value = marksMap[key];
          const classMarks = marks.filter(
            (mark) => mark.assessmentId === assessment.id && classMemberIds.includes(mark.studentId)
          );
          return {
            assessment,
            marks: typeof value === 'number' ? value : null,
            highestMarks:
              classMarks.length > 0 ? Math.max(...classMarks.map((mark) => mark.marks)) : null,
            classAverageMarks:
              classMarks.length > 0 && classMemberIds.length > 0
                ? classMarks.reduce((sum, mark) => sum + mark.marks, 0) / classMemberIds.length
                : null,
          };
        });
        const obtained = rows.reduce((sum, row) => sum + (row.marks ?? 0), 0);
        const total = rows.reduce((sum, row) => sum + row.assessment.totalMarks, 0);
        return { section, assessments: rows, obtained, total };
      })
      .filter((view) => view.assessments.length > 0);
  }, [sections, assessments, marks, marksMap, studentId, classMemberIds]);

  const courseTotals = useMemo(
    () => sectionViews.reduce(
      (totals, view) => ({ obtained: totals.obtained + view.obtained, total: totals.total + view.total }),
      { obtained: 0, total: 0 }
    ),
    [sectionViews]
  );

  const toggle = (sectionId: string) => {
    setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading your marks...</p>
      </div>
    );
  }

  return (
    <div id="student-gradebook" className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Gradebook</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Marks for {studentName}. Class results are shown without student names.
        </p>
      </div>

      {assessments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your total</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {courseTotals.obtained} <span className="text-sm font-medium text-slate-400">/ {courseTotals.total}</span>
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Class average</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">
              {hasClassMarks ? `${courseStats.classAveragePercent.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {sectionViews.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No marks published yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Your teacher has not added any assessments to the gradebook.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sectionViews.map((view) => {
            const isOpen = !!expanded[view.section.id];
            return (
              <div
                key={view.section.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  id={`btn-toggle-section-${view.section.id}`}
                  onClick={() => toggle(view.section.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-bold text-slate-900">{view.section.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-slate-700">
                      {view.obtained}/{view.total}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t border-slate-100 px-4 py-2">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <th className="py-2 pr-3">Category</th>
                          <th className="py-2 pr-3">Assessment</th>
                          <th className="py-2 px-2 text-right">Your marks</th>
                          <th className="py-2 px-2 text-right">Highest</th>
                          <th className="py-2 pl-2 text-right">Class avg.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.assessments.map((row) => (
                          <tr key={row.assessment.id} className="border-b border-slate-50 last:border-b-0">
                            <td className="py-2.5 pr-3 font-medium text-slate-600">
                              {view.section.name}
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-slate-700">
                              {row.assessment.name}
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                              {row.marks === null ? (
                                <span className="text-slate-400 font-medium">—</span>
                              ) : (
                                <>
                                  {row.marks}
                                  <span className="text-slate-400 font-medium">
                                    {' '}/ {row.assessment.totalMarks}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-indigo-700">
                              {row.highestMarks === null ? (
                                '—'
                              ) : (
                                <>
                                  {row.highestMarks}
                                  <span className="text-slate-400 font-medium">
                                    {' '}/ {row.assessment.totalMarks}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 pl-2 text-right font-medium text-slate-700">
                              {row.classAverageMarks === null ? (
                                '—'
                              ) : (
                                <>
                                  {row.classAverageMarks.toFixed(1)}
                                  <span className="text-slate-400">
                                    {' '}/ {row.assessment.totalMarks}
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
