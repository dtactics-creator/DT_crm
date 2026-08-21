import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Shield, Calendar, KeyRound, Save, LogOut, Sun, Moon, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import supabase from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import { useEmployees } from '../hooks/useEmployees';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const { data: allEmployees } = useEmployees();

  const email = user?.email ?? '—';
  const actualEmployee = (allEmployees || []).find((e) => e.email === email);
  const metaName = (actualEmployee?.employee_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string;
  const provider = (user?.app_metadata?.provider ?? 'email') as string;

  const [fullName, setFullName] = useState(metaName);
  const [savingName, setSavingName] = useState(false);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { setFullName(metaName); }, [metaName]);

  const displayName = fullName || email.split('@')[0];

  // Name is managed via crm_employees by admins.

  const savePassword = async () => {
    const er: Record<string, string> = {};
    if (pw.length < 6) er.pw = 'Password must be at least 6 characters.';
    if (pw !== pw2) er.pw2 = 'Passwords do not match.';
    setPwErrors(er);
    if (Object.keys(er).length) return;
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast('Password changed successfully', 'success');
      setPw(''); setPw2('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const infoRows = [
    { icon: Mail, label: 'Email', value: email },
    { icon: Shield, label: 'Sign-in method', value: provider === 'google' ? 'Google' : 'Email & Password' },
    { icon: Calendar, label: 'Member since', value: formatDate(user?.created_at) },
    { icon: CheckCircle2, label: 'Email verified', value: user?.email_confirmed_at || provider === 'google' ? 'Verified' : 'Pending' },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1000px] mx-auto">
      <PageHeader title="Profile" subtitle="Manage your account details and preferences."
        crumbs={[{ label: 'Account' }, { label: 'Profile' }]} />

      {/* Identity banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-app card-shadow mb-6">
        <div className="absolute inset-0 bg-brand-700" />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4 p-6">
          <div className="ring-4 ring-white/20 rounded-full">
            <Avatar name={displayName} size={72} />
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-extrabold text-white truncate capitalize">{displayName}</p>
            <p className="text-[13px] text-brand-100/90 truncate">{email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] font-semibold text-white bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
              <Shield className="h-3 w-3" /> {provider === 'google' ? 'Google account' : 'Standard account'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center"><UserIcon className="h-4.5 w-4.5 text-brand-600 dark:text-brand-300" /></div>
            <h3 className="text-[15px] font-bold text-base-fg">Personal information</h3>
          </div>
          <div className="space-y-4">
            <Field label="Display name" hint="Your name is managed by administrators">
              <Input value={fullName} disabled className="opacity-70 cursor-not-allowed" />
            </Field>
            <Field label="Email" hint="Email cannot be changed">
              <Input value={email} disabled className="opacity-70 cursor-not-allowed" />
            </Field>
          </div>
        </div>

        {/* Account details */}
        <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-lg bg-violet-500/12 flex items-center justify-center"><Shield className="h-4.5 w-4.5 text-violet-500" /></div>
            <h3 className="text-[15px] font-bold text-base-fg">Account details</h3>
          </div>
          <div className="rounded-xl border border-app divide-y divide-[color:var(--border)]">
            {infoRows.map((r) => (
              <div key={r.label} className="flex items-center gap-3 px-4 py-3">
                <r.icon className="h-4 w-4 text-subtle-fg shrink-0" />
                <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">{r.label}</span>
                <span className="text-[13px] font-semibold text-base-fg truncate">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change password */}
        {provider !== 'google' && (
          <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-9 w-9 rounded-lg bg-amber-500/12 flex items-center justify-center"><KeyRound className="h-4.5 w-4.5 text-amber-500" /></div>
              <h3 className="text-[15px] font-bold text-base-fg">Change password</h3>
            </div>
            <div className="space-y-4">
              <Field label="New password" error={pwErrors.pw}>
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!pwErrors.pw} placeholder="••••••••" />
              </Field>
              <Field label="Confirm new password" error={pwErrors.pw2}>
                <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} invalid={!!pwErrors.pw2} placeholder="••••••••" />
              </Field>
              <div className="flex justify-end">
                <Button icon={<KeyRound className="h-4 w-4" />} onClick={savePassword} loading={savingPw} disabled={!pw && !pw2}>Update password</Button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/12 flex items-center justify-center"><Sun className="h-4.5 w-4.5 text-emerald-500" /></div>
            <h3 className="text-[15px] font-bold text-base-fg">Preferences</h3>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-app px-4 py-3.5">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-4.5 w-4.5 text-brand-500" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
              <div>
                <p className="text-[13.5px] font-semibold text-base-fg">Appearance</p>
                <p className="text-[12px] text-muted-fg">Currently using {theme} mode</p>
              </div>
            </div>
            <button onClick={toggle}
              className={cn('relative h-7 w-12 rounded-full transition-colors', theme === 'dark' ? 'bg-brand-600' : 'bg-slate-300')}>
              <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', theme === 'dark' ? 'left-6' : 'left-1')} />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-app">
            <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={() => signOut()} className="w-full">Sign out of your account</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
