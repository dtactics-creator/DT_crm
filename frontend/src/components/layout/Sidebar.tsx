import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, FolderKanban, Database, UserCog,
  BarChart3, ChevronLeft, Sparkles, PanelLeftClose, ShieldCheck, MessageSquareText, FileText, Receipt
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePermissions } from '../../contexts/PermissionContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: null },
  { to: '/leads', label: 'Leads', icon: Users, perm: 'leads.view' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, perm: 'projects.view' },
  { to: '/masters', label: 'Masters', icon: Database, perm: 'masters.view' },
  { to: '/employees', label: 'Employees', icon: UserCog, perm: 'employees.view' },
  { to: '/roles', label: 'Roles', icon: ShieldCheck, perm: 'roles.view' },
  { to: '/templates', label: 'Templates', icon: MessageSquareText, perm: 'templates.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
  { to: '/audit-logs', label: 'Audit Logs', icon: FileText, perm: 'audit_logs.view' },
  { to: '/quotations', label: 'Quotations', icon: Receipt, perm: 'quotations.view' },
];

const FUTURE = ['Clients', 'Invoices', 'Documents', 'Support'];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { can } = usePermissions();
  const navItems = NAV.filter((item) => !item.perm || can(item.perm));
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={onMobileClose} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" />
      )}
      <aside
        className={cn(
          'bg-sidebar border-r border-app flex flex-col shrink-0 z-50 transition-all duration-300',
          'fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[248px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-3 h-16 px-4 border-b border-app shrink-0', collapsed && 'justify-center px-0')}>
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-600/30 shrink-0">
            D
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-extrabold text-base-fg tracking-tight truncate">DTactics</p>
              <p className="text-[11px] font-semibold text-subtle-fg tracking-wide truncate">IT SOLUTIONS · CRM</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {!collapsed && <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">Workspace</p>}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onMobileClose}
              className={({ isActive }) => cn(
                'group relative flex items-center gap-3 rounded-xl px-3 h-10 text-[13.5px] font-semibold transition-all',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'text-brand-700 bg-brand-50 dark:bg-brand-600/12 dark:text-brand-300'
                  : 'text-[color:var(--sidebar-text)] hover:bg-surface-2 hover:text-base-fg',
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand-600" />
                  )}
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}

          {!collapsed && (
            <div className="pt-5">
              <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">Coming soon</p>
              {FUTURE.map((label) => (
                <div key={label} className="flex items-center gap-3 rounded-xl px-3 h-9 text-[13px] font-medium text-subtle-fg/70 cursor-not-allowed">
                  <Sparkles className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-app shrink-0 hidden lg:block">
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl px-3 h-9 text-[13px] font-semibold text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
        <button onClick={onMobileClose} className="lg:hidden absolute top-4 right-3 h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2">
          <PanelLeftClose className="h-4.5 w-4.5" />
        </button>
      </aside>
    </>
  );
}
