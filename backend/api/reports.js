import { supabase, preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, 'reports.view');
  if (!user) return;

  try {
    const [leadsRes, projectsRes, mastersRes, empRes] = await Promise.all([
      supabase.from('dt_leads3').select('*').is('deleted_at', null),
      supabase.from('dt_projects').select('*').is('deleted_at', null),
      supabase.from('masters').select('*').is('deleted_at', null),
      supabase.from('crm_employees').select('id, employee_name').is('deleted_at', null),
    ]);
    if (leadsRes.error) throw leadsRes.error;
    if (projectsRes.error) throw projectsRes.error;

    const leads = leadsRes.data || [];
    const projects = projectsRes.data || [];
    const masters = mastersRes.data || [];
    const employees = empRes.data || [];

    const master = (cat, val) => masters.find((m) => m.category === cat && m.value === val);
    const label = (cat, val) => master(cat, val)?.label || val;
    const color = (cat, val) => master(cat, val)?.color || '#64748b';

    // Summary counts
    const summary = {
      leadCount: leads.length,
      wonLeads: leads.filter((l) => l.status === 'won').length,
      lostLeads: leads.filter((l) => l.status === 'lost').length,
      projectCount: projects.length,
      activeProjects: projects.filter((p) => p.status === 'active').length,
      completedProjects: projects.filter((p) => p.status === 'completed').length,
    };

    const statusOrder = masters.filter((m) => m.category === 'lead_status').sort((a, b) => a.sort_order - b.sort_order);
    const conversionFunnel = statusOrder.map((s) => ({ stage: s.label, count: leads.filter((l) => l.status === s.value).length, color: s.color || '#3366ff' }));

    const sourceMap = {};
    for (const l of leads) {
      const key = l.source || 'unknown';
      if (!sourceMap[key]) sourceMap[key] = { total: 0, won: 0, value: 0 };
      sourceMap[key].total += 1;
      if (l.status === 'won') sourceMap[key].won += 1;
      sourceMap[key].value += Number(l.budget || 0);
    }
    const sourcePerformance = Object.entries(sourceMap).map(([source, v]) => ({
      source: label('lead_source', source), total: v.total, won: v.won, value: Math.round(v.value),
    })).sort((a, b) => b.total - a.total);

    const typeMap = {};
    for (const p of projects) {
      const key = p.project_type || 'other';
      if (!typeMap[key]) typeMap[key] = { budget: 0, count: 0 };
      typeMap[key].budget += Number(p.project_cost || 0);
      typeMap[key].count += 1;
    }
    const revenueByType = Object.entries(typeMap).map(([type, v]) => ({
      type: label('project_type', type), budget: Math.round(v.budget), count: v.count,
    })).sort((a, b) => b.budget - a.budget).slice(0, 8);

    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nx = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const inMonth = projects.filter((p) => { const c = new Date(p.start_date || p.created_at); return c >= d && c < nx; });
      monthlyRevenue.push({ month: MONTHS[d.getMonth()], revenue: Math.round(inMonth.reduce((s, p) => s + Number(p.project_cost || 0), 0)), projects: inMonth.length });
    }

    const valueStatusMap = {};
    for (const l of leads) valueStatusMap[l.status] = (valueStatusMap[l.status] || 0) + Number(l.budget || 0);
    const leadValueByStatus = Object.entries(valueStatusMap).map(([status, value]) => ({ status: label('lead_status', status), value: Math.round(value), color: color('lead_status', status) }));

    const employeeLoad = employees.map((e) => ({
      name: e.employee_name,
      leads: leads.filter((l) => l.sales_manager_id === e.id || l.assigned_employee_id === e.id).length,
      projects: projects.filter((p) => p.project_manager_id === e.id || p.assigned_employee_id === e.id).length,
    })).filter((e) => e.leads > 0 || e.projects > 0).sort((a, b) => (b.leads + b.projects) - (a.leads + a.projects)).slice(0, 8);

    return res.status(200).json({
      summary, conversionFunnel, sourcePerformance, revenueByType, monthlyRevenue, leadValueByStatus, employeeLoad,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
