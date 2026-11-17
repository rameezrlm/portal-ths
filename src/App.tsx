import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { AttendanceTable } from './components/AttendanceTable';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Login } from './components/Login';
import { TeacherGradebook } from './components/TeacherGradebook';
import { StudentGradebook } from './components/StudentGradebook';
import { StudentProfile } from './components/StudentProfile';
import { TeacherProfile } from './components/TeacherProfile';
import { TeacherOverview } from './components/TeacherOverview';
import { TimetablePreview } from './components/TimetablePreview';
import { TeacherAssignments } from './components/TeacherAssignments';
import { StudentAssignments } from './components/StudentAssignments';
import { TeacherAnnouncements } from './components/TeacherAnnouncements';
import { StudentAnnouncements } from './components/StudentAnnouncements';
import { Timetable } from './components/Timetable';
import { RoleSidebar } from './components/RoleSidebar';
import { fetchPlatformSettings, readPlatformSettings, subscribePlatformSettings } from './services/platformSettingsService';
import { announcementsForClass, fetchAnnouncements, markAnnouncementsSeen, readAnnouncementsLocal, subscribeAnnouncementUpdates, unreadAnnouncementCount } from './services/announcementService';
import { StudentWebApps } from './components/StudentWebApps';
import { AdminWebApps } from './components/AdminWebApps';
import { StudentAttendance } from './components/StudentAttendance';
import { TeacherLeaveRequests } from './components/TeacherLeaveRequests';
import { CoursePicker, type CourseSection } from './components/CoursePicker';
import { CourseWorkspaceNav } from './components/CourseWorkspaceNav';
import { markCourseActivitySeen } from './utils/courseActivity';
import { StudentFormModal } from './components/StudentFormModal';
import { addStudent, fetchStudents } from './services/studentService';
import { fetchTeachers } from './services/teacherService';
import {
  enrollStudentInClass,
  fetchClassesForStudent,
  fetchClassesForTeacher,
  filterStudentsByClass,
  readClassesLocal,
} from './services/classService';
import {
  getAttendanceByDate,
  saveAttendanceForDate,
} from './services/attendanceService';
import { getCurrentSession, logoutUser, saveSession } from './services/teacherService';
import type {
  Student,
  AttendanceStatus,
  AttendanceSummary,
  UserSession,
  AttendanceDayEntry,
  AttendanceFilter,
  LabClass,
} from './types';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateToDisplay(isoStr: string): string {
  try {
    const [y, m, d] = isoStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export default function App() {
  const [showMobileSplash, setShowMobileSplash] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const timer = window.setTimeout(() => setShowMobileSplash(false), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  // Session State
  const [session, setSession] = useState<UserSession | null>(() => getCurrentSession());
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.innerWidth >= 1024);

  // Today's date (teacher can only mark attendance of current day)
  const todayISO = useMemo(() => formatDateToISO(new Date()), []);

  // Data states for Teacher Attendance
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceDayEntry>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasExistingRecords, setHasExistingRecords] = useState<boolean>(false);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');

  // Teacher workspace: Gradebook or existing Attendance section
  const [teacherView, setTeacherView] = useState<
    'courses' | 'timetable' | 'gradebook' | 'assignments' | 'attendance' | 'announcements' | 'apps' | 'profile'
  >('courses');
  const [studentView, setStudentView] = useState<
    | 'courses'
    | 'timetable'
    | 'gradebook'
    | 'assignments'
    | 'attendance'
    | 'apps'
    | 'announcements'
    | 'profile'
  >('courses');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [myClasses, setMyClasses] = useState<LabClass[]>(() => {
    if (session?.role !== 'student' || !session.studentId) return [];
    return readClassesLocal().filter((item) => item.studentIds.includes(session.studentId!));
  });
  const [classesLoading, setClassesLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string | undefined>(session?.teacherId);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [announcementItems, setAnnouncementItems] = useState(readAnnouncementsLocal);
  const [platformSettings, setPlatformSettings] = useState(readPlatformSettings);
  useEffect(() => { void fetchPlatformSettings().then(setPlatformSettings).catch(console.error); return subscribePlatformSettings(() => setPlatformSettings(readPlatformSettings())); }, []);
  useEffect(() => {
    void fetchAnnouncements().then(setAnnouncementItems).catch(console.error);
    return subscribeAnnouncementUpdates(() => setAnnouncementItems(readAnnouncementsLocal()));
  }, []);

  // Modals state for Teacher
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Load students for Teacher attendance roster
  const loadStudentsList = async () => {
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
      showToast('error', 'Failed to load students roster.');
    }
  };

  // Load attendance for current day (today)
  const loadAttendanceForToday = async (classId: string) => {
    setIsLoading(true);
    try {
      const attData = await getAttendanceByDate(todayISO, classId);
      setAttendanceMap(attData);
      setHasExistingRecords(Object.keys(attData).length > 0);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      showToast('error', "Failed to load today's attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session || session.role !== 'teacher') return;
    if (session.teacherId) {
      setTeacherId(session.teacherId);
      return;
    }
    void fetchTeachers().then((list) => {
      const matched = list.find((teacher) => teacher.email === session.email);
      if (matched) setTeacherId(matched.id);
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setSelectedClassId(null);
    if (session.role === 'teacher' && teacherId) {
      setMyClasses([]);
      setClassesLoading(true);
      void fetchClassesForTeacher(teacherId)
        .then(setMyClasses)
        .finally(() => setClassesLoading(false));
    }
    if (session.role === 'student' && session.studentId) {
      const studentId = session.studentId;
      setMyClasses(readClassesLocal().filter((item) => item.studentIds.includes(studentId)));
      setClassesLoading(false);
      void fetchClassesForStudent(session.studentId)
        .then(setMyClasses)
        .catch((error) => console.error('Failed to refresh student courses:', error));
    }
  }, [session, teacherId]);

  useEffect(() => {
    if (session?.role === 'teacher' && selectedClassId) {
      void loadStudentsList();
      void loadAttendanceForToday(selectedClassId);
    }
  }, [session, selectedClassId]);

  const selectedClass = useMemo(
    () => myClasses.find((item) => item.id === selectedClassId) || null,
    [myClasses, selectedClassId]
  );

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return filterStudentsByClass(students, selectedClass);
  }, [students, selectedClass]);

  // Live Summary calculation for Teacher view
  const summary: AttendanceSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let earlyLeft = 0;
    let leave = 0;

    classStudents.forEach((s) => {
      const st = attendanceMap[s.id]?.status;
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'early_left') earlyLeft++;
      else if (st === 'leave') leave++;
    });

    const totalStudents = classStudents.length;
    const marked = present + absent + late + earlyLeft + leave;
    const unmarked = Math.max(0, totalStudents - marked);

    return { totalStudents, present, absent, late, earlyLeft, leave, unmarked };
  }, [classStudents, attendanceMap]);

  // Teacher Attendance Actions
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => {
      const previous = prev[studentId];
      const joinTime =
        status === 'late'
          ? previous?.status === 'late' && previous.joinTime
            ? previous.joinTime
            : new Date().toISOString()
          : undefined;

      return {
        ...prev,
        [studentId]: { status, joinTime },
      };
    });
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceDayEntry> = {};
    classStudents.forEach((s) => {
      updated[s.id] = { status: 'present' };
    });
    setAttendanceMap(updated);
    showToast('success', 'Marked all students as Present.');
  };

  const handleClearAll = () => {
    setAttendanceMap({});
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;

    const unmarkedStudents = classStudents.filter((s) => !attendanceMap[s.id]);
    if (unmarkedStudents.length > 0) {
      showToast('error', 'Please mark attendance for all students before saving.');
      return;
    }

    try {
      setIsSaving(true);
      const recordsToSave = classStudents.map((student) => ({
        student,
        status: attendanceMap[student.id].status,
        joinTime: attendanceMap[student.id].joinTime,
      }));

      await saveAttendanceForDate(todayISO, recordsToSave, selectedClassId);
      setHasExistingRecords(true);
      showToast('success', "Today's attendance saved successfully.");
    } catch (err) {
      console.error('Failed to save attendance:', err);
      showToast('error', 'Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await logoutUser(); }
    catch (error) { showToast('error', error instanceof Error ? error.message : 'Could not sign out. Please try again.'); return; }
    setSession(null);
    setSelectedClassId(null);
    setMyClasses([]);
    setIsAddStudentOpen(false);
  };

  const handleTeacherAddStudent = async (name: string, email: string, password: string) => {
    if (!selectedClassId) {
      throw new Error('Select a course before adding a student.');
    }

    const created = await addStudent(name, email, password);
    const updatedClass = await enrollStudentInClass(selectedClassId, created.id);
    setMyClasses((prev) => prev.map((item) => (item.id === updatedClass.id ? updatedClass : item)));
    setStudents((prev) => {
      if (prev.some((item) => item.id === created.id)) return prev;
      return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
    });
    showToast('success', `"${created.name}" saved to Firebase and this class. They can now log in.`);
  };

  const handleGoHome = () => {
    setSelectedClassId(null);
    if (session?.role === 'student') {
      setStudentView('courses');
    }
    if (session?.role === 'teacher') {
      setTeacherView('courses');
    }
  };

  if (showMobileSplash) {
    return (
      <div className="mobile-splash" aria-label="Taleem-O-Hunar Society">
        <img src="/logo.png" alt="Taleem-O-Hunar Society logo" />
        <span>THS Tech labs LMS</span>
        <i aria-hidden="true" />
      </div>
    );
  }

  // 1. Not Authenticated: Show Login page
  if (!session) {
    return <Login onLoginSuccess={(sess) => setSession(sess)} />;
  }

  const todayDisplay = formatDateToDisplay(todayISO);
  const currentDateObj = new Date();
  const announcementUserKey = `${session.role}_${session.studentId || session.teacherId || session.email}`;
  const announcementBadge = unreadAnnouncementCount(announcementItems, `${announcementUserKey}_global`, []);
  const courseAnnouncementBadge = (classId: string) => unreadAnnouncementCount(announcementItems, `${announcementUserKey}_course_${classId}`, [classId]);
  const courseAnnouncementCount = (classId: string) => announcementsForClass(announcementItems, classId).length;
  const openAnnouncementView = (role: 'teacher' | 'student', classId?: string) => {
    markAnnouncementsSeen(classId ? `${announcementUserKey}_course_${classId}` : `${announcementUserKey}_global`);
    setAnnouncementItems([...readAnnouncementsLocal()]);
    if (role === 'teacher') setTeacherView('announcements'); else setStudentView('announcements');
  };
  const openCourseSection = (role: 'teacher' | 'student', classId: string, section: CourseSection) => {
    setSelectedClassId(classId);
    if (section === 'announcements') openAnnouncementView(role, classId);
    else {
      if (section === 'assignments' || section === 'gradebook') markCourseActivitySeen(announcementUserKey, classId, section);
      if (role === 'teacher') setTeacherView(section); else setStudentView(section);
    }
  };

  // 2. Admin Role: Show Admin Dashboard
  if (session.role === 'admin') {
    return (
      <AdminDashboard
        session={session}
        onLogout={handleLogout}
        todayDisplay={todayDisplay}
      />
    );
  }

  // 3. Student Role: View own marks, grouped by section
  if (session.role === 'student') {
    return (
      <div className="role-dashboard app-shell min-h-screen text-slate-800 flex flex-col antialiased">
        <Header
          session={session}
          onGoHome={handleGoHome}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarExpanded(value => !value)}
          isSidebarExpanded={sidebarExpanded}
          onOpenProfile={() => setStudentView('profile')}
          isProfileActive={studentView === 'profile'}
        />
        <RoleSidebar role="student" settings={platformSettings} active={studentView} badge={announcementBadge} expanded={sidebarExpanded} profileName={session.name} profileImageUrl={session.profileImageUrl} onClose={() => setSidebarExpanded(false)} onSelect={id => {
          if (id === 'courses') { setSelectedClassId(null); setStudentView('courses'); }
          else if (id === 'announcements') { setSelectedClassId(null); openAnnouncementView('student'); }
          else if (id === 'apps') { setSelectedClassId(null); setStudentView('apps'); }
          else if (id !== 'apps' || platformSettings.studentsCanOpenApps) setStudentView(id as typeof studentView);
        }} />
        <main className="role-dashboard-main flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
          {studentView === 'timetable' ? <Timetable role="student" classes={myClasses} /> : studentView === 'apps' && platformSettings.studentsCanOpenApps ? <StudentWebApps /> : studentView === 'announcements' && !selectedClassId ? <StudentAnnouncements classId="" /> : !selectedClassId && studentView !== 'profile' ? (
            <div className="space-y-6">
              <CoursePicker
                afterStudentInfo={<TimetablePreview role="student" compact classes={myClasses} onOpen={() => setStudentView('timetable')} />}
                classes={myClasses}
                roleLabel="student"
                studentId={session.studentId}
                isLoading={classesLoading}
                unreadCountForCourse={courseAnnouncementBadge}
                announcementCountForCourse={courseAnnouncementCount}
                activityUserKey={announcementUserKey}
                onSelect={(classId, section) => openCourseSection('student', classId, section)}
              />
            </div>
          ) : (
            <>
          {selectedClassId && studentView !== 'profile' && (
            <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId(null);
                  setStudentView('courses');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Courses
              </button>
              <span className="text-xs font-bold text-slate-800">{selectedClass?.name}</span>
            </div>
            <CourseWorkspaceNav className={selectedClass?.name || 'Course'} active={studentView as CourseSection} onSelect={section => openCourseSection('student', selectedClassId, section)} />
            </div>
          )}

          {!session.studentId ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              <p>Your student account could not be loaded. Please sign out and sign in again.</p>
              <button type="button" onClick={handleLogout} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700">Sign out</button>
            </div>
          ) : studentView === 'profile' ? (
            <StudentProfile studentId={session.studentId} session={session} onImageUpdated={imageUrl => {
              const updated = { ...session, profileImageUrl: imageUrl || undefined };
              saveSession(updated);
              setSession(updated);
            }} />
          ) : selectedClassId ? (
            <>
              <div className={studentView === 'gradebook' ? '' : 'hidden'}>
                <StudentGradebook
                  classId={selectedClassId}
                  studentId={session.studentId}
                  studentName={session.name}
                  classStudentIds={selectedClass?.studentIds || []}
                />
              </div>
              <div className={studentView === 'assignments' ? '' : 'hidden'}>
                <StudentAssignments
                  classId={selectedClassId}
                  studentId={session.studentId}
                  studentName={session.name}
                  studentEmail={session.email}
                />
              </div>
              <div className={studentView === 'attendance' ? '' : 'hidden'}>
                <StudentAttendance
                  classId={selectedClassId}
                  studentId={session.studentId}
                  studentName={session.name}
                />
              </div>
              <div className={studentView === 'announcements' ? '' : 'hidden'}>
                <StudentAnnouncements classId={selectedClassId} classNames={Object.fromEntries(myClasses.map(item => [item.id, item.name]))} />
              </div>
            </>
          ) : null}
            </>
          )}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          THS Tech labs LMS • Taleem-O-Hunar Society
        </footer>
      </div>
    );
  }

  // 4. Teacher Role: Gradebook + existing Attendance section
  return (
    <div className="role-dashboard app-shell min-h-screen text-slate-800 flex flex-col antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-red-700 text-white border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        session={session}
        onGoHome={handleGoHome}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarExpanded(value => !value)}
        isSidebarExpanded={sidebarExpanded}
        onOpenProfile={() =>
          setTeacherView((prev) => (prev === 'profile' ? 'announcements' : 'profile'))
        }
        isProfileActive={teacherView === 'profile'}
      />

      <RoleSidebar role="teacher" settings={platformSettings} active={teacherView} badge={announcementBadge} expanded={sidebarExpanded} profileName={session.name} profileImageUrl={session.profileImageUrl} onClose={() => setSidebarExpanded(false)} onSelect={id => {
        if (id === 'courses') { setSelectedClassId(null); setTeacherView('courses'); }
        else if (id === 'announcements') { setSelectedClassId(null); openAnnouncementView('teacher'); }
        else if (id === 'apps') { setSelectedClassId(null); setTeacherView('apps'); }
        else if (id !== 'apps' || platformSettings.teachersCanManageApps) setTeacherView(id as typeof teacherView);
      }} />
      {/* Main Container */}
      <main className="role-dashboard-main flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {teacherView === 'timetable' ? <Timetable role="teacher" classes={myClasses} teacherId={teacherId} /> : teacherView === 'apps' && platformSettings.teachersCanManageApps ? <AdminWebApps showToast={showToast} /> : teacherView === 'announcements' && !selectedClassId ? <StudentAnnouncements classId="" /> : teacherView === 'profile' && !teacherId ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600"><p>Your teacher account could not be loaded. Please sign out and sign in again.</p><button type="button" onClick={handleLogout} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700">Sign out</button></div> : teacherView === 'profile' && teacherId ? (
          <TeacherProfile
            teacherId={teacherId}
            session={session}
            showToast={showToast}
            onSessionUpdated={(updated) => {
              saveSession(updated);
              setSession(updated);
            }}
          />
        ) : !selectedClassId ? (
          <div className="space-y-6">
            <TeacherOverview
              session={session}
              teacherId={teacherId}
              classes={myClasses}
              isLoading={classesLoading}
              onOpenTimetable={() => setTeacherView('timetable')}
            />
            <CoursePicker
              classes={myClasses}
              roleLabel="teacher"
              isLoading={classesLoading}
              unreadCountForCourse={courseAnnouncementBadge}
              announcementCountForCourse={courseAnnouncementCount}
              activityUserKey={announcementUserKey}
              onSelect={(classId, section) => openCourseSection('teacher', classId, section)}
            />
          </div>
        ) : (
          <>
        <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedClassId(null);
              setTeacherView('courses');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Courses
          </button>
          <span className="text-xs font-bold text-slate-800">{selectedClass?.name}</span>
        </div>
        <CourseWorkspaceNav className={selectedClass?.name || 'Course'} active={teacherView as CourseSection} onSelect={section => openCourseSection('teacher', selectedClassId, section)} />
        </div>

        {teacherView === 'gradebook' && (
          <section id="section-gradebook" aria-label="Teacher Gradebook">
            <TeacherGradebook
              classId={selectedClassId}
              className={selectedClass?.name || 'Course'}
              teacherName={session.name}
              students={classStudents}
              showToast={showToast}
            />
          </section>
        )}

        {teacherView === 'assignments' && (
          <section id="section-assignments" aria-label="Teacher Submissions">
            <TeacherAssignments
              classId={selectedClassId}
              session={session}
              showToast={showToast}
            />
          </section>
        )}

        {teacherView === 'announcements' && (
          <section id="section-announcements" aria-label="Teacher Announcements">
            <TeacherAnnouncements
              classId={selectedClassId}
              session={session}
              showToast={showToast}
              canPost={platformSettings.teachersCanPostAnnouncements}
            />
          </section>
        )}

        {teacherView === 'attendance' && (
          <>
            {teacherId && <TeacherLeaveRequests classId={selectedClassId} teacherId={teacherId} />}
            <section id="section-summary-cards" aria-label="Attendance Summary">
              <SummaryCards
                summary={summary}
                activeFilter={attendanceFilter}
                onFilterChange={setAttendanceFilter}
              />
            </section>

            <section id="section-attendance-table" aria-label="Daily Attendance Table">
              <AttendanceTable
                students={classStudents}
                attendanceMap={attendanceMap}
                todayDisplay={todayDisplay}
                isLoading={isLoading}
                isSaving={isSaving}
                hasExistingRecords={hasExistingRecords}
                statusFilter={attendanceFilter}
                onStatusFilterChange={setAttendanceFilter}
                onStatusChange={handleStatusChange}
                onMarkAllPresent={handleMarkAllPresent}
                onClearAll={handleClearAll}
                onSaveAttendance={handleSaveAttendance}
                onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
                onAddStudent={() => setIsAddStudentOpen(true)}
              />
            </section>
          </>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        THS Tech labs LMS • Taleem-O-Hunar Society
      </footer>

      {/* Monthly Report Register Modal */}
      <MonthlyReportModal
        isOpen={isMonthlyReportOpen}
        onClose={() => setIsMonthlyReportOpen(false)}
        students={classStudents}
        currentYear={currentDateObj.getFullYear()}
        currentMonth={currentDateObj.getMonth() + 1}
      />

      <StudentFormModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAddStudent={handleTeacherAddStudent}
      />
    </div>
  );
}
