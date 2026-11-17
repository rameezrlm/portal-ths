import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Lock,
  Mail,
  Microscope,
  Pencil,
  School,
} from 'lucide-react';
import { loginUser } from '../services/teacherService';
import type { UserSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

const FLOATING_ICONS = [
  { Icon: BookOpen, className: 'login-float-icon login-float-1', size: 28 },
  { Icon: GraduationCap, className: 'login-float-icon login-float-2', size: 32 },
  { Icon: Pencil, className: 'login-float-icon login-float-3', size: 24 },
  { Icon: Award, className: 'login-float-icon login-float-4', size: 26 },
  { Icon: Microscope, className: 'login-float-icon login-float-5', size: 30 },
  { Icon: Lightbulb, className: 'login-float-icon login-float-6', size: 24 },
  { Icon: Calculator, className: 'login-float-icon login-float-7', size: 26 },
  { Icon: School, className: 'login-float-icon login-float-8', size: 28 },
  { Icon: BookOpen, className: 'login-float-icon login-float-9', size: 22 },
  { Icon: GraduationCap, className: 'login-float-icon login-float-10', size: 34 },
  { Icon: Pencil, className: 'login-float-icon login-float-11', size: 20 },
  { Icon: Lightbulb, className: 'login-float-icon login-float-12', size: 28 },
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanId = identifier.trim();
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setIsLoading(true);
      const session = await loginUser(cleanId, cleanPass);
      onLoginSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return <main id="login-page-container" className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {FLOATING_ICONS.map(({ Icon, className, size }, index) => <span key={index} className={className}><Icon style={{ width: size, height: size }} strokeWidth={1.5} /></span>)}
    </div>
    <div className="login-layout relative z-10 mx-auto w-full max-w-[420px]">
      <section className="login-panel mx-auto w-full max-w-[420px]" aria-label="Sign in">
        <div className="login-glass-card relative overflow-hidden rounded-md border border-slate-200 bg-white p-7 sm:p-9">
          <div className="login-brand relative mb-7 text-center">
            <div className="login-logo-wrap mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-md border border-emerald-100 bg-white p-2 shadow-sm">
              <img src="/ths-logo.png" alt="Taleem-O-Hunar Society" className="h-full w-full object-contain" referrerPolicy="no-referrer" onError={event => { const image = event.currentTarget; if (image.src.includes('ths-logo')) image.src = '/logo.png'; else image.style.display = 'none'; }} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">THS Tech labs LMS</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Sign in to continue to your workspace.</p>
          </div>

          {error && <div id="login-error-alert" role="alert" className="login-alert relative mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="login-form relative space-y-4">
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-bold text-slate-700">Email or username</label>
              <div className="login-input-wrap relative">
                <Mail className="login-input-icon absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="login-identifier" type="text" autoComplete="username" required placeholder="Enter your email or username" value={identifier} onChange={event => setIdentifier(event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-slate-700">Password</label>
              <div className="login-input-wrap relative">
                <Lock className="login-input-icon absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <button id="btn-login-submit" type="submit" disabled={isLoading} className="login-submit group mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-900 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70">
              {isLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Signing in...</> : <>Sign in <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></>}
            </button>
          </form>

          <p className="relative mt-6 border-t border-slate-100 pt-5 text-center text-[11px] leading-relaxed text-slate-500">For administrators, teachers, and students.</p>
        </div>
      </section>
    </div>
  </main>;
};
