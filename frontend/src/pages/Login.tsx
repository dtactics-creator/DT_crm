import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck, TrendingUp, Users, Loader2 } from 'lucide-react';
import supabase from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      // 1. Verify password hash and active status via custom backend
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed. Please check your credentials.');
      }

      // 2. If backend verification passes, authenticate with Supabase Auth to get the session token
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-app">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] relative overflow-hidden bg-brand-700 p-12 xl:p-16">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-brand-700 font-black text-xl">D</div>
          <div className="leading-tight text-white">
            <p className="text-lg font-extrabold tracking-tight">DTactics IT Solutions</p>
            <p className="text-[12px] font-semibold text-brand-200 tracking-wider">ENTERPRISE CRM</p>
          </div>
        </div>

        <div className="relative text-white max-w-md">
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.15]">
            Turn every lead into a<br />delivered project.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-4 text-[15px] text-brand-100/90 leading-relaxed">
            A premium command center for lead management and project delivery — built for teams that move fast and close bigger.
          </motion.p>

          <div className="mt-10 space-y-4">
            {[
              { icon: TrendingUp, title: 'Pipeline intelligence', desc: 'Track value, conversion and momentum in real time.' },
              { icon: Users, title: 'Lead-to-project flow', desc: 'Convert won deals into scoped projects instantly.' },
              { icon: ShieldCheck, title: 'Enterprise-grade', desc: 'Secure, auditable and built to scale with you.' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white/12 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">{f.title}</p>
                  <p className="text-[13px] text-brand-100/80">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative text-[12px] text-brand-200/80">© {new Date().getFullYear()} DTactics IT Solutions. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-lg">D</div>
            <p className="text-lg font-extrabold text-base-fg tracking-tight">DTactics CRM</p>
          </div>

          <h1 className="text-2xl font-extrabold text-base-fg tracking-tight">Welcome back</h1>
          <p className="text-[14px] text-muted-fg mt-1.5">Sign in to your DTactics workspace.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-base-fg">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface border border-app text-sm text-base-fg outline-none focus:ring-2 ring-brand focus:border-brand-500 transition-all"
                  placeholder="you@company.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-base-fg">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface border border-app text-sm text-base-fg outline-none focus:ring-2 ring-brand focus:border-brand-500 transition-all"
                  placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-medium text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-brand-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-60 shadow-sm shadow-brand-600/25">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
