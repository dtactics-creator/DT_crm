import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Sun, Moon, ChevronRight, LogOut, Settings, User as UserIcon, Command } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';
import type { Crumb } from './crumbs';
import CommandMenu from './CommandMenu';

export default function Topbar({ crumbs, onMobileMenu }: { crumbs: Crumb[]; onMobileMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const { data: allEmployees } = useEmployees();
  const email = user?.email ?? 'user@dtactics.io';
  const fallbackName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];
  const actualEmployee = (allEmployees || []).find((e) => e.email === email);
  const name = actualEmployee?.employee_name || fallbackName;

  const notifications = [
    { title: 'New lead assigned', desc: 'Marcus Thompson · Northwind Analytics', color: '#3366ff', time: '2h' },
    { title: 'Proposal follow-up due', desc: 'Meridian Finance · $210K', color: '#f59e0b', time: '5h' },
    { title: 'Project completed', desc: 'GreenGrid Analytics Dashboard', color: '#10b981', time: '1d' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/80 backdrop-blur-xl border-b border-app flex items-center gap-3 px-4 sm:px-6 shrink-0">
      <button onClick={onMobileMenu} className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2">
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1.5 text-[13px] min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-subtle-fg shrink-0" />}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={c.to} className="font-medium text-muted-fg hover:text-base-fg truncate">{c.label}</Link>
            ) : (
              <span className={cn('truncate', i === crumbs.length - 1 ? 'font-bold text-base-fg' : 'font-medium text-muted-fg')}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={() => setCmdOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg bg-surface-2 border border-app text-muted-fg hover:border-strong transition-colors w-56"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="text-[13px] flex-1 text-left">Search…</span>
        <kbd className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 h-5 rounded bg-surface border border-app text-subtle-fg">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>
      <button onClick={() => setCmdOpen(true)} className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2">
        <Search className="h-4.5 w-4.5" />
      </button>

      {/* Theme */}
      <button onClick={toggle} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button onClick={() => setNotifOpen((v) => !v)} className="relative h-9 w-9 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[color:var(--surface)]" />
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-app flex items-center justify-between">
                <p className="text-[13px] font-bold text-base-fg">Notifications</p>
                <span className="text-[11px] font-semibold text-brand-600">3 new</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer">
                    <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-base-fg">{n.title}</p>
                      <p className="text-[12px] text-muted-fg truncate">{n.desc}</p>
                    </div>
                    <span className="text-[11px] text-subtle-fg shrink-0">{n.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-lg hover:bg-surface-2 transition-colors">
          <Avatar name={name} size={30} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-60 bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden"
            >
              <div className="px-4 py-3.5 border-b border-app flex items-center gap-3">
                <Avatar name={name} size={38} />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-base-fg truncate capitalize">{name}</p>
                  <p className="text-[12px] text-muted-fg truncate">{email}</p>
                </div>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setMenuOpen(false); navigate('/profile'); }} className="flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-[13px] font-medium text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
                  <UserIcon className="h-4 w-4" /> Profile
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/masters'); }} className="flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-[13px] font-medium text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
                  <Settings className="h-4 w-4" /> Settings
                </button>
              </div>
              <div className="p-1.5 border-t border-app">
                <button onClick={() => signOut()} className="flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </header>
  );
}
