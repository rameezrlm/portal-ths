import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import type { LabClass, Student, Teacher } from '../types';
import {
  createClass,
  deleteClass,
  fetchClasses,
  updateClass,
} from '../services/classService';

interface AdminClassesProps {
  students: Student[];
  teachers: Teacher[];
  showToast: (type: 'success' | 'error', message: string) => void;
  onClassesChanged?: (count: number) => void;
}

export const AdminClasses: React.FC<AdminClassesProps> = ({
  students,
  teachers,
  showToast,
  onClassesChanged,
}) => {
  const [classes, setClasses] = useState<LabClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabClass | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LabClass | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setClasses(await fetchClasses());
    } catch (err) {
      console.error('Failed to load classes:', err);
      showToast('error', 'Failed to load classes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    onClassesChanged?.(classes.length);
  }, [classes.length, onClassesChanged]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setSelectedTeachers([]);
    setSelectedStudents([]);
    setStudentSearch('');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: LabClass) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || '');
    setSelectedTeachers([...item.teacherIds]);
    setSelectedStudents([...item.studentIds]);
    setStudentSearch('');
    setError(null);
    setModalOpen(true);
  };

  const toggleTeacher = (id: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSaving(true);
      if (editing) {
        const updated = await updateClass(editing.id, {
          name,
          description,
          teacherIds: selectedTeachers,
          studentIds: selectedStudents,
        });
        setClasses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('success', `"${updated.name}" updated.`);
      } else {
        const created = await createClass({
          name,
          description,
          teacherIds: selectedTeachers,
          studentIds: selectedStudents,
        });
        setClasses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('success', `"${created.name}" created.`);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteClass(toDelete.id);
      setClasses((prev) => prev.filter((item) => item.id !== toDelete.id));
      showToast('success', `"${toDelete.name}" deleted.`);
      setToDelete(null);
    } catch (err) {
      showToast('error', 'Failed to delete class.');
    }
  };

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.email} ${student.contact || ''}`.toLowerCase().includes(normalizedStudentSearch)
  );

  return (
    <div id="admin-classes" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Class Sections</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Create a section, then assign teachers and students to that class.
          </p>
        </div>
        <button
          id="btn-create-class"
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Section
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No classes yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first section to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                    title="Edit class"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Delete class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                  {item.teacherIds.length} teacher{item.teacherIds.length === 1 ? '' : 's'}
                </span>
                <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                  {item.studentIds.length} student{item.studentIds.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
          <div className="flex h-[min(92vh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editing ? 'Edit Section' : 'New Section'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">Set up the course and enroll its teachers and students.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BS-CS Section A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Assign Teachers</label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1">
                  {teachers.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">No teachers registered.</p>
                  ) : (
                    teachers.map((teacher) => (
                      <label
                        key={teacher.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={() => toggleTeacher(teacher.id)}
                        />
                        <span className="font-medium text-slate-800">{teacher.name}</span>
                        <span className="text-slate-400">{teacher.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <label htmlFor="student-enrollment-search" className="block text-xs font-semibold text-slate-700">Assign Students</label>
                  <span className="text-[11px] font-medium text-slate-500">{selectedStudents.length} selected</span>
                </div>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="student-enrollment-search"
                    type="search"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search by student name, email, or contact…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {students.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400">No students registered yet.</p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">No students match “{studentSearch}”.</p>
                  ) : (
                    <div className="grid gap-1 md:grid-cols-2">
                      {filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className={`flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-xs cursor-pointer ${selectedStudents.includes(student.id) ? 'border-emerald-200 bg-emerald-50/70' : 'border-transparent hover:bg-slate-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">{student.name}</span>
                            <span className="mt-0.5 block truncate text-slate-500">{student.email}</span>
                            {student.contact && <span className="mt-0.5 block truncate text-slate-400">{student.contact}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editing ? 'Update Section' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Section?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Remove <strong>{toDelete.name}</strong>? Course data stays saved but the class link is removed.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
