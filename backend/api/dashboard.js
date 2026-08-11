import { supabase, preflight, fail, requireAuth } from './_lib.js';
import { employeeMap } from './_join.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  // Dashboard is accessible to any authenticated user (no permission needed).
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const [leadsRes, projectsRes, mastersRes, emps] = await Promise.all([
      supabase.from('dt_leads3').select('*').is('deleted_at', null),
      supabase.from('dt_projects').select('*').is('deleted_at', null),
      supabase.from('masters').select('*').is('deleted_at', null),
      employeeMap(),
    ]);
    if (leadsRes.error) throw leadsRes.error;
    if (projectsRes.error) throw projectsRes.error;

    const leads = (leadsRes.data || []).map((l) => ({ ...l, sales_manager: l.sales_manager_id ? emps[l.sales_manager_id] || null : null }));
    const projects = (projectsRes.data || []).map((p) => ({ ...p, manager: p.project_manager_id ? emps[p.project_manager_id] || null : null }));
    const masters = mastersRes.data || [];

    const colorFor = (cat, val) => masters.find((x) => x.category === cat && x.value === val)?.color || '#64748b';
    const labelFor = (cat, val) => masters.find((x) => x.category === cat && x.value === val)?.label || val;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === 'new').length;
    const newLeadsThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
    const wonLeads = leads.filter((l) => l.status === 'won').length;
    const lostLeads = leads.filter((l) => l.status === 'lost').length;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const pipelineValue = leads.filter((l) => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + Number(l.budget || 0), 0);

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const onHoldProjects = projects.filter((p) => p.status === 'on_hold').length;
    const totalProjectBudget = projects.reduce((s, p) => s + Number(p.project_cost || 0), 0);
    const avgProjectProgress = projects.length ? Math.round(projects.reduce((s, p) => s + Number(p.progress || 0), 0) / projects.length) : 0;

    const groupCount = (items, key, cat) => {
      const map = {};
      for (const it of items) { const v = it[key]; map[v] = (map[v] || 0) + 1; }
      return Object.entries(map).map(([value, count]) => ({ label: labelFor(cat, value), count, color: colorFor(cat, value) }));
    };

    const leadsByStatus = groupCount(leads, 'status', 'lead_status').map((x) => ({ status: x.label, count: x.count, color: x.color }));
    const projectsByStatus = groupCount(projects, 'status', 'project_status').map((x) => ({ status: x.label, count: x.count, color: x.color }));
    const leadsBySource = groupCount(leads, 'source', 'lead_source').map((x) => ({ source: x.label, count: x.count, color: x.color }));

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nx = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const inMonth = leads.filter((l) => { const c = new Date(l.created_at); return c >= d && c < nx; });
      monthlyTrend.push({ month: MONTHS[d.getMonth()], leads: inMonth.length, won: inMonth.filter((l) => l.status === 'won').length });
    }

    const recentLeads = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    const recentProjects = [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

    return res.status(200).json({
      totalLeads, newLeads, newLeadsThisMonth, wonLeads, lostLeads, conversionRate, pipelineValue,
      totalProjects, activeProjects, completedProjects, onHoldProjects, totalProjectBudget, avgProjectProgress,
      leadsByStatus, leadsBySource, projectsByStatus, monthlyTrend, recentLeads, recentProjects,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
