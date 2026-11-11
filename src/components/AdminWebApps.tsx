import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe2, Plus, Trash2 } from 'lucide-react';
import { addStudentWebApp, fetchStudentWebApps, removeStudentWebApp, type StudentWebApp } from '../services/studentWebAppService';

interface AdminWebAppsProps {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const AdminWebApps: React.FC<AdminWebAppsProps> = ({ showToast }) => {
  const [apps, setApps] = useState<StudentWebApp[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => setApps(await fetchStudentWebApps());
  useEffect(() => { void refresh(); }, []);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await addStudentWebApp(name, url);
      setApps((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setUrl('');
      showToast('success', `${created.name} is now available to students.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Could not add app.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (app: StudentWebApp) => {
    try {
      await removeStudentWebApp(app.id);
      setApps((current) => current.filter((item) => item.id !== app.id));
      showToast('success', `${app.name} was removed.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Could not remove app.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Student Web Apps</h2>
        <p className="mt-1 text-xs text-slate-500">Register trusted websites and make them available in the student portal.</p>
      </div>

      <form onSubmit={handleAdd} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
        <label className="block text-xs font-semibold text-slate-700">
          App name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Exam Portal" required maxLength={60} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Website URL
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="examportal.vercel.app" required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          <Plus className="h-4 w-4" /> Add App
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">Registered apps <span className="ml-1 text-xs font-medium text-slate-400">{apps.length}</span></div>
        {apps.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No web apps registered.</p> : (
          <ul className="divide-y divide-slate-100">
            {apps.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Globe2 className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{app.name}</p><a href={app.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-emerald-700 hover:underline">{app.url}<ExternalLink className="h-3 w-3 shrink-0" /></a></div>
                </div>
                <button type="button" onClick={() => void handleRemove(app)} aria-label={`Remove ${app.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
