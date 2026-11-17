import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import type { Announcement } from '../types';
import {
  announcementsForClass,
  fetchAnnouncements,
  formatAnnouncementTime,
  readAnnouncementsLocal,
  subscribeAnnouncementUpdates,
} from '../services/announcementService';

interface StudentAnnouncementsProps {
  classId: string;
  classNames?: Record<string, string>;
}

export const StudentAnnouncements: React.FC<StudentAnnouncementsProps> = ({ classId, classNames = {} }) => {
  const visible = (list: Announcement[]) => classId
    ? announcementsForClass(list, classId)
    : list.filter(item => item.published !== false && !item.classId);
  const [announcements, setAnnouncements] = useState(() =>
    visible(readAnnouncementsLocal())
  );
  const [isLoading, setIsLoading] = useState(() => readAnnouncementsLocal().length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const list = await fetchAnnouncements();
      setAnnouncements(visible(list));
      setError(null);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      if (!silent) setError('Failed to load announcements.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    setAnnouncements(visible(readAnnouncementsLocal()));
    void loadAnnouncements(readAnnouncementsLocal().length > 0);
    return subscribeAnnouncementUpdates(() => {
      setAnnouncements(visible(readAnnouncementsLocal()));
      void loadAnnouncements(true);
    });
  }, [classId]);

  return (
    <div id="student-announcements" className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Announcements</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {classId ? 'Notices for this course appear here.' : 'Platform announcements from administrators appear here.'}
        </p>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No announcements yet</p>
            <p className="text-xs text-slate-400 mt-1">{classId ? 'Course notices will appear here.' : 'Administrator announcements will appear here.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">{announcement.title}</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{announcement.classId ? classNames[announcement.classId] || 'Course' : 'Platform'}</span></div>
                <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  {announcement.message}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {announcement.createdBy} · {formatAnnouncementTime(announcement.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
