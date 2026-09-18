import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Users, Check, Save, Sliders, Shield, Blocks, ChevronLeft, Trash2, Plus, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useCrumbs, useSidebar } from '../components/layout/AppLayout';
import { cn } from '../lib/utils';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';

const TABS = [
  { id: 'general', label: 'General', icon: Sliders, description: 'Basic application settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Manage alert preferences' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Authentication and access' },
  { id: 'integrations', label: 'Integrations', icon: Blocks, description: 'Connected services' },
];

export interface IpMapping {
  ip: string;
  name: string;
}

export default function Settings() {
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { toast } = useToast();
  const { session } = useAuth();
  const setCrumbs = useCrumbs();
  const { setCollapsed: setMainSidebarCollapsed } = useSidebar();

  const [activeTab, setActiveTab] = useState('notifications');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [ipMappings, setIpMappings] = useState<IpMapping[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newIpName, setNewIpName] = useState('');
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [editingIp, setEditingIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCrumbs([{ label: 'Settings' }]);
    setMainSidebarCollapsed(true);
  }, [setCrumbs, setMainSidebarCollapsed]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();

        if (data.quotation_notification_users && Array.isArray(data.quotation_notification_users)) {
          setSelectedUsers(data.quotation_notification_users);
        }
        if (data.ip_name_mapping && Array.isArray(data.ip_name_mapping)) {
          setIpMappings(data.ip_name_mapping);
        }
      } catch (err) {
        console.error(err);
        toast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (session) fetchSettings();
  }, [session, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          key: 'quotation_notification_users',
          value: selectedUsers
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      toast('Settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const saveIpMappingsToApi = async (updatedList: IpMapping[]) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          key: 'ip_name_mapping',
          value: updatedList
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save (Status ${res.status})`);
      }
      toast('IP mappings saved successfully', 'success');
      return true;
    } catch (err: any) {
      console.error('Save API Error:', err);
      toast(err.message || 'Failed to save IP settings', 'error');
      return false;
    }
  };

  const submitIpModal = async () => {
    if (!newIp.trim() || !newIpName.trim()) return toast('Please enter both IP and Name', 'error');

    let updated: IpMapping[];
    if (editingIp) {
      if (editingIp !== newIp.trim() && ipMappings.some(m => m.ip === newIp.trim())) return toast('IP already mapped', 'error');
      updated = ipMappings.map(m => m.ip === editingIp ? { ip: newIp.trim(), name: newIpName.trim() } : m);
    } else {
      if (ipMappings.some(m => m.ip === newIp.trim())) return toast('IP already mapped', 'error');
      updated = [...ipMappings, { ip: newIp.trim(), name: newIpName.trim() }];
    }

    setSaving(true);
    const success = await saveIpMappingsToApi(updated);
    setSaving(false);

    if (success) {
      setIpMappings(updated);
      setIsIpModalOpen(false);
    }
  };

  const removeIpMapping = async (ip: string) => {
    const updated = ipMappings.filter(m => m.ip !== ip);
    const success = await saveIpMappingsToApi(updated);
    if (success) setIpMappings(updated);
  };

  if (loading || employeesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app">
      {/* Header */}
      <header className="shrink-0 h-20 px-6 sm:px-8 border-b border-app flex items-center justify-between bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {/* <div className="h-10 w-10 rounded-xl bg-surface-2 border border-app flex items-center justify-center text-muted-fg shadow-sm">
            <SettingsIcon className="h-5 w-5" />
          </div> */}
          <div>
            <h1 className="text-xl font-bold text-base-fg tracking-tight">Settings</h1>
            <p className="text-[13px] font-medium text-muted-fg">Manage application preferences</p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Settings Sidebar Navigation */}
        <div
          className={cn(
            "shrink-0 border-b md:border-b-0 md:border-r border-app bg-sidebar flex flex-col overflow-hidden transition-all duration-300",
            collapsed ? "w-full md:w-[76px]" : "w-full md:w-[248px]"
          )}
        >
          <div className="flex-1 py-4 px-3 overflow-x-auto md:overflow-y-auto no-scrollbar">
            <nav className="flex md:flex-col gap-1 min-w-max md:min-w-0">
              {!collapsed && <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">Preferences</p>}
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={collapsed ? tab.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 h-10 rounded-xl text-left transition-all shrink-0 md:shrink",
                      collapsed && "md:justify-center md:px-0",
                      isActive
                        ? "text-brand-700 bg-brand-50 dark:bg-brand-600/12 dark:text-brand-300"
                        : "text-[color:var(--sidebar-text)] hover:bg-surface-2 hover:text-base-fg"
                    )}
                  >
                    {isActive && (
                      <motion.span layoutId="settings-sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand-600" />
                    )}
                    <tab.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                    {!collapsed && <span className="truncate text-[13.5px] font-semibold">{tab.label}</span>}
                    <span className={cn("text-[13.5px] font-semibold", collapsed ? "hidden" : "md:hidden")}>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Collapse toggle (Desktop only) */}
          <div className="p-3 border-t border-app shrink-0 hidden md:block">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl px-3 h-9 text-[13px] font-semibold text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors',
                collapsed && 'justify-center px-0',
              )}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
              {!collapsed && 'Collapse'}
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface/10">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-10"
                >
                  <section className="space-y-4">
                    <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-widest text-subtle-fg">Application Alerts</h3>
                    <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden">
                    <div className="p-5 border-b border-app flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                          <Bell className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-bold text-base-fg">Quotation Notifications</h2>
                          <p className="text-[13px] text-muted-fg">Select users who should be notified when a new quotation is created.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="shrink-0 flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {saving ? (
                          <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Preferences
                      </button>
                    </div>

                    <div className="p-5">
                      {employees && employees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {employees.filter(e => e.status === 'active').map((emp) => {
                            const isSelected = selectedUsers.includes(emp.id);
                            return (
                              <button
                                key={emp.id}
                                onClick={() => toggleUser(emp.id)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                  isSelected
                                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-500"
                                    : "border-app bg-surface hover:bg-surface-2 hover:border-strong"
                                )}
                              >
                                <Avatar name={emp.employee_name} size={36} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-base-fg truncate">{emp.employee_name}</p>
                                  <p className="text-[11px] font-medium text-muted-fg truncate">{emp.role}</p>
                                </div>
                                <div className={cn(
                                  "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                  isSelected ? "bg-brand-500 border-brand-500 text-white" : "border-app bg-surface"
                                )}>
                                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-muted-fg flex flex-col items-center">
                          <Users className="h-8 w-8 mb-3 opacity-20" />
                          <p className="text-[14px] font-medium">No active employees found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'general' && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-10"
                >
                  <section className="space-y-4">
                    <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-widest text-subtle-fg">Tracking & Analytics</h3>
                    <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden">
                    <div className="p-5 border-b border-app flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Shield className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-bold text-base-fg">IP List</h2>
                          <p className="text-[13px] text-muted-fg">Map IP addresses to recognizable names in Analytics.</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingIp(null);
                          setNewIp('');
                          setNewIpName('');
                          setIsIpModalOpen(true);
                        }}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        Add IP
                      </Button>
                    </div>

                    <div className="p-5">
                      {ipMappings.length > 0 ? (
                        <div className="rounded-xl border border-app overflow-hidden">
                          <table className="w-full text-left text-[13px]">
                            <thead className="bg-surface-2 text-subtle-fg font-bold uppercase tracking-wider text-[11px]">
                              <tr>
                                <th className="px-4 py-2.5">IP Address</th>
                                <th className="px-4 py-2.5">Mapped Name</th>
                                <th className="px-4 py-2.5 w-24"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:var(--border)]">
                              {ipMappings.map((m, idx) => (
                                <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                                  <td className="px-4 py-2.5 font-mono text-muted-fg">{m.ip}</td>
                                  <td className="px-4 py-2.5 font-semibold text-base-fg">{m.name}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingIp(m.ip);
                                          setNewIp(m.ip);
                                          setNewIpName(m.name);
                                          setIsIpModalOpen(true);
                                        }}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => removeIpMapping(m.ip)}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-muted-fg flex flex-col items-center">
                          <Shield className="h-8 w-8 mb-3 opacity-20" />
                          <p className="text-[14px] font-medium">No IP mappings configured.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </section>
                </motion.div>
              )}

              {activeTab !== 'notifications' && activeTab !== 'general' && (
                <motion.div
                  key="coming-soon"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-24 text-center text-muted-fg"
                >
                  <SettingsIcon className="h-16 w-16 opacity-10 mb-6" />
                  <h3 className="text-xl font-bold text-base-fg tracking-tight mb-2">Coming Soon</h3>
                  <p className="text-[14px] max-w-sm">This section is currently under construction and will be available in a future update.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      <Modal
        open={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        title={editingIp ? 'Edit IP Mapping' : 'Add IP Mapping'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsIpModalOpen(false)}>Cancel</Button>
            <Button onClick={submitIpModal} loading={saving}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="IP Address" required>
            <Input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="e.g. 49.204.115.155"
            />
          </Field>
          <Field label="Assign Name" required>
            <Input
              value={newIpName}
              onChange={(e) => setNewIpName(e.target.value)}
              placeholder="e.g. Pravin (Internal)"
              onKeyDown={(e) => e.key === 'Enter' && submitIpModal()}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
