import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe2, LoaderCircle } from 'lucide-react';
import { fetchStudentWebApps, type StudentWebApp } from '../services/studentWebAppService';

export const StudentWebApps: React.FC = () => {
  const [apps, setApps] = useState<StudentWebApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchStudentWebApps()
      .then((items) => { if (active) setApps(items); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section id="student-web-apps" className="space-y-5">
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading apps…
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Globe2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No apps available yet</p>
          <p className="mt-1 text-xs text-slate-500">Apps added by your administrator will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {apps.map((app, index) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="student-app-launch group relative flex min-h-28 items-center justify-between gap-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-300 hover:shadow-xl hover:shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 transition-all group-hover:w-2" />
              <span className="flex min-w-0 items-center gap-4 pl-1">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
                  <Globe2 className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-normal break-words text-sm font-bold text-slate-900">{app.name}</span>
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all group-hover:bg-emerald-600 group-hover:text-white">
                <ExternalLink className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};
