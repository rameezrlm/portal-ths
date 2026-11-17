import React, { useEffect, useState } from 'react';
import { fetchPlatformSettings, readPlatformSettings, savePlatformSettings, subscribePlatformSettings, type PlatformSettings } from '../services/platformSettingsService';
const options: { key: keyof PlatformSettings; label: string; description: string }[] = [
  { key: 'teachersCanPostAnnouncements', label: 'Teacher announcements', description: 'Allow teachers to post and remove notices for their assigned courses.' },
  { key: 'teachersCanManageApps', label: 'Teacher app management', description: 'Allow teachers to manage student web apps.' },
  { key: 'studentsCanOpenApps', label: 'Student apps', description: 'Show the Apps section to students.' },
];
export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState(readPlatformSettings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void fetchPlatformSettings().then(setSettings).catch(() => setError('Could not load settings.')); return subscribePlatformSettings(() => setSettings(readPlatformSettings())); }, []);
  const change = async (key: keyof PlatformSettings, checked: boolean) => { setBusy(true); setError(''); try { await savePlatformSettings({ ...settings, [key]: checked }); setSettings(readPlatformSettings()); } catch { setError('Could not save settings.'); } finally { setBusy(false); } };
  return <section className="space-y-5"><div><h2 className="text-lg font-bold text-slate-900">Platform settings</h2><p className="text-xs text-slate-500 mt-1">Choose which workspace actions teachers and students can use.</p></div>{error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</p>}<div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">{options.map(option => <label key={option.key} className="flex items-center justify-between gap-5 p-5 cursor-pointer"><span><strong className="block text-sm text-slate-900">{option.label}</strong><small className="block text-xs text-slate-500 mt-1">{option.description}</small></span><input type="checkbox" checked={settings[option.key]} disabled={busy} onChange={event => void change(option.key, event.target.checked)} className="h-4 w-4 accent-emerald-700" /></label>)}</div></section>;
};
