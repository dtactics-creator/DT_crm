import { supabase, preflight, fail, requireAuth } from './_lib.js';
import { employeeMap } from './_join.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const [
      leadsRes, projectsRes, mastersRes, clientsRes, amcRes, quotesRes, quoteVRes, visitsRes, auditRes, emps
    ] = await Promise.all([
      supabase.from('dt_leads3').select('*').is('deleted_at', null),
      supabase.from('dt_projects').select('*').is('deleted_at', null),
      supabase.from('masters').select('*').is('deleted_at', null),
      supabase.from('dt_clients').select('*').is('deleted_at', null),
      supabase.from('dt_client_amc').select('*').is('deleted_at', null),
      supabase.from('dt_quotations').select('*').is('deleted_at', null),
      supabase.from('dt_quotation_versions').select('*').is('deleted_at', null),
      supabase.from('dt_lead_url_visits').select('*'),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
      employeeMap(),
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (projectsRes.error) throw projectsRes.error;

    const leads = (leadsRes.data || []).map((l) => ({ ...l, sales_manager: l.sales_manager_id ? emps[l.sales_manager_id] || null : null, assigned_employee: l.assigned_employee_id ? emps[l.assigned_employee_id] || null : null }));
    const projects = (projectsRes.data || []).map((p) => ({ ...p, manager: p.project_manager_id ? emps[p.project_manager_id] || null : null }));
    const masters = mastersRes.data || [];
    const clients = clientsRes.data || [];
    const amcs = amcRes.data || [];
    const quotes = quotesRes.data || [];
    const quoteV = quoteVRes.data || [];
    const visits = visitsRes.data || [];
    const audit = auditRes.data || [];
    
    // Masters helper
    const colorFor = (cat, val) => masters.find((x) => x.category === cat && x.value === val)?.color || '#64748b';
    const labelFor = (cat, val) => masters.find((x) => x.category === cat && x.value === val)?.label || val;
    const masterOptions = masters.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push({ label: m.label, value: m.value, color: m.color });
      return acc;
    }, {});

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // KPIs
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === 'new').length;
    const newLeadsThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
    const wonLeads = leads.filter((l) => l.status === 'won').length;
    const lostLeads = leads.filter((l) => l.status === 'lost').length;
    const openLeads = leads.filter((l) => !['won', 'lost'].includes(l.status)).length;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const pipelineValue = leads.filter((l) => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + Number(l.budget || 0), 0);
    
    const kpis = {
      totalLeads, newLeads, contactedLeads: leads.filter(l => l.status === 'contacted').length, 
      proposalSentLeads: leads.filter(l => l.status === 'proposal_sent').length,
      negotiationLeads: leads.filter(l => l.status === 'negotiation').length,
      wonLeads, lostLeads, openLeads, unassignedLeads: leads.filter(l => !l.assigned_employee_id).length,
      newThisMonth: newLeadsThisMonth, openPipelineValue: pipelineValue, wonValue: leads.filter(l => l.status === 'won').reduce((s, l) => s + Number(l.budget || 0), 0),
      lostValue: leads.filter(l => l.status === 'lost').reduce((s, l) => s + Number(l.budget || 0), 0),
      avgWonValue: wonLeads ? Math.round(leads.filter(l => l.status === 'won').reduce((s, l) => s + Number(l.budget || 0), 0) / wonLeads) : 0,
      conversionRate, winRate: (wonLeads + lostLeads) > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0
    };

    // Projects
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const onHoldProjects = projects.filter((p) => p.status === 'on_hold').length;
    const totalProjectBudget = projects.reduce((s, p) => s + Number(p.project_cost || 0), 0);
    const avgProjectProgress = projects.length ? Math.round(projects.reduce((s, p) => s + Number(p.progress || 0), 0) / projects.length) : 0;
    
    const projectSummary = {
      total: totalProjects, active: activeProjects, completed: completedProjects, onHold: onHoldProjects, cancelled: projects.filter(p => p.status === 'cancelled').length,
      totalValue: totalProjectBudget, activeValue: projects.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.project_cost || 0), 0),
      completedValue: projects.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.project_cost || 0), 0),
      avgProgress: avgProjectProgress, delayed: 0, due30d: 0
    };

    const groupCount = (items, key, cat) => {
      const map = {};
      for (const it of items) { const v = it[key]; if (v) map[v] = (map[v] || 0) + 1; }
      return Object.entries(map).map(([value, count]) => ({ label: labelFor(cat, value), count, color: colorFor(cat, value), status: value, value: 0 }));
    };

    const leadStatus = groupCount(leads, 'status', 'lead_status');
    const projectStatus = groupCount(projects, 'status', 'project_status');
    
    // Opportunities
    const opportunities = leads.filter(l => !['won', 'lost'].includes(l.status) && Number(l.budget) > 0)
      .sort((a,b) => Number(b.budget) - Number(a.budget)).slice(0, 8).map(l => ({
        id: l.id, leadNo: l.lead_no, customerName: l.customer_name, company: l.company, budget: Number(l.budget || 0),
        status: l.status, statusLabel: labelFor('lead_status', l.status), statusColor: colorFor('lead_status', l.status),
        priority: l.priority, priorityLabel: labelFor('priority', l.priority), priorityColor: colorFor('priority', l.priority),
        source: l.source, sourceLabel: labelFor('lead_source', l.source), nextFollowUp: l.next_follow_up, owner: l.assigned_employee?.employee_name || null
      }));

    // Sources
    const sourcesMap = {};
    leads.forEach(l => {
      if (!sourcesMap[l.source]) sourcesMap[l.source] = { totalLeads: 0, wonLeads: 0, lostLeads: 0, openLeads: 0, totalValue: 0, wonValue: 0, pipelineValue: 0 };
      const s = sourcesMap[l.source];
      s.totalLeads++;
      s.totalValue += Number(l.budget || 0);
      if (l.status === 'won') { s.wonLeads++; s.wonValue += Number(l.budget || 0); }
      else if (l.status === 'lost') { s.lostLeads++; }
      else { s.openLeads++; s.pipelineValue += Number(l.budget || 0); }
    });
    const sources = Object.entries(sourcesMap).map(([src, d]) => ({
      source: src, label: labelFor('lead_source', src), color: colorFor('lead_source', src),
      ...d, conversionRate: d.totalLeads ? (d.wonLeads / d.totalLeads) * 100 : 0
    })).sort((a,b) => b.totalLeads - a.totalLeads);

    // Employees
    const empMap = {};
    Object.values(emps).forEach(e => {
      empMap[e.id] = { id: e.id, name: e.employee_name, role: e.role, assignedLeads: 0, managedLeads: 0, wonLeads: 0, lostLeads: 0, openLeads: 0, pipelineValue: 0, wonValue: 0, managedWon: 0, managedWonValue: 0, conversionRate: 0 };
    });
    leads.forEach(l => {
      if (l.assigned_employee_id && empMap[l.assigned_employee_id]) {
        const e = empMap[l.assigned_employee_id];
        e.assignedLeads++;
        if (l.status === 'won') { e.wonLeads++; e.wonValue += Number(l.budget || 0); }
        else if (l.status === 'lost') { e.lostLeads++; }
        else { e.openLeads++; e.pipelineValue += Number(l.budget || 0); }
      }
      if (l.sales_manager_id && empMap[l.sales_manager_id]) {
        const e = empMap[l.sales_manager_id];
        e.managedLeads++;
        if (l.status === 'won') { e.managedWon++; e.managedWonValue += Number(l.budget || 0); }
      }
    });
    const employees = Object.values(empMap).filter(e => e.assignedLeads > 0 || e.managedLeads > 0)
      .map(e => ({ ...e, conversionRate: e.assignedLeads ? (e.wonLeads / e.assignedLeads) * 100 : 0 }))
      .sort((a,b) => b.wonValue - a.wonValue);

    // Attention
    const attentionItems = [];
    let rank = 1;
    const addAtt = (entity, id, ref, name, dueDate, st, stL, stC, prio, prL, prC, val, urgency, kind, sub) => {
      attentionItems.push({ entity, kind, id, reference: ref, name, subtitle: sub, dueDate, status: st, statusLabel: stL, statusColor: stC, priority: prio, priorityLabel: prL, priorityColor: prC, value: val, rank: rank++, urgency });
    };
    leads.filter(l => !['won', 'lost'].includes(l.status) && l.next_follow_up).forEach(l => {
      const d = new Date(l.next_follow_up);
      if (d < now) {
        addAtt('lead', l.id, l.lead_no, l.customer_name, l.next_follow_up, l.status, labelFor('lead_status', l.status), colorFor('lead_status', l.status), l.priority, labelFor('priority', l.priority), colorFor('priority', l.priority), Number(l.budget), 'overdue', 'Overdue Follow-up', l.company);
      }
    });
    
    // Project Health
    const phRows = projects.map(p => {
      let health = 'on_track';
      let expected = 0;
      if (p.start_date && p.expected_delivery) {
        const sd = new Date(p.start_date).getTime();
        const ed = new Date(p.expected_delivery).getTime();
        const n = now.getTime();
        if (ed > sd) {
          expected = Math.min(100, Math.max(0, ((n - sd) / (ed - sd)) * 100));
        }
      }
      if (p.status === 'completed') health = 'completed';
      else if (p.status === 'cancelled') health = 'cancelled';
      else if (p.status === 'on_hold') health = 'on_hold';
      else if (p.progress < expected - 20) health = 'delayed';
      else if (p.progress < expected - 10) health = 'at_risk';

      if (health === 'delayed') {
        addAtt('project', p.id, p.project_no, p.project_name, p.expected_delivery, p.status, labelFor('project_status', p.status), colorFor('project_status', p.status), p.priority, labelFor('priority', p.priority), colorFor('priority', p.priority), Number(p.project_cost), 'overdue', 'Delayed Delivery', p.client);
      }
      return {
        id: p.id, projectNo: p.project_no, projectName: p.project_name, client: p.client, status: p.status, statusLabel: labelFor('project_status', p.status), statusColor: colorFor('project_status', p.status),
        priority: p.priority, progress: p.progress, expectedProgress: expected, projectCost: Number(p.project_cost), startDate: p.start_date, expectedDelivery: p.expected_delivery,
        nextFollowUp: p.next_follow_up, daysToDelivery: null, manager: p.manager?.employee_name || null, health, healthLabel: health.replace('_', ' ').toUpperCase(), healthColor: health === 'delayed' ? '#ef4444' : health === 'at_risk' ? '#f59e0b' : '#10b981'
      };
    });
    const healthSlices = [{health: 'on_track', label: 'On Track', color: '#10b981', count: phRows.filter(r => r.health === 'on_track').length, value: 0},
      {health: 'at_risk', label: 'At Risk', color: '#f59e0b', count: phRows.filter(r => r.health === 'at_risk').length, value: 0},
      {health: 'delayed', label: 'Delayed', color: '#ef4444', count: phRows.filter(r => r.health === 'delayed').length, value: 0}];
    const projectHealth = { slices: healthSlices, rows: phRows };

    // Quotations
    const qvMap = {};
    quoteV.forEach(v => { if (!qvMap[v.quotation_id]) qvMap[v.quotation_id] = []; qvMap[v.quotation_id].push(v); });
    const quotationsObj = { total: quotes.length, draft: 0, sent: 0, accepted: 0, rejected: 0, totalValue: 0, acceptedValue: 0, sentValue: 0, avgValue: 0, avgVersions: quotes.length ? quoteV.length / quotes.length : 0, expiring7d: 0, expired: 0, acceptanceRate: 0 };
    quotes.forEach(q => {
      quotationsObj[q.status.toLowerCase()]++;
      const versions = qvMap[q.id] || [];
      const latest = versions.sort((a,b) => b.version_number - a.version_number)[0];
      if (latest) {
        quotationsObj.totalValue += Number(latest.grand_total || 0);
        if (q.status === 'Accepted') quotationsObj.acceptedValue += Number(latest.grand_total || 0);
        if (q.status === 'Sent') quotationsObj.sentValue += Number(latest.grand_total || 0);
      }
    });
    quotationsObj.avgValue = quotationsObj.total ? quotationsObj.totalValue / quotationsObj.total : 0;
    quotationsObj.acceptanceRate = quotationsObj.total ? (quotationsObj.accepted / quotationsObj.total) * 100 : 0;

    // Clients
    const clientSummary = { total: clients.length, active: clients.filter(c => c.status === 'active').length, withProjects: 0, withActiveProjects: 0, repeatClients: 0, repeatValue: 0, totalProjectValue: totalProjectBudget, repeatRate: 0, repeatValueShare: 0, newThisMonth: clients.filter(c => new Date(c.created_at) >= monthStart).length, topClients: [] };
    const pByClient = {};
    projects.forEach(p => {
      if (p.client_id) {
        if (!pByClient[p.client_id]) pByClient[p.client_id] = { count: 0, active: 0, value: 0, id: p.client_id };
        pByClient[p.client_id].count++;
        if (p.status === 'active') pByClient[p.client_id].active++;
        pByClient[p.client_id].value += Number(p.project_cost || 0);
      }
    });
    Object.values(pByClient).forEach(c => {
      clientSummary.withProjects++;
      if (c.active > 0) clientSummary.withActiveProjects++;
      if (c.count > 1) { clientSummary.repeatClients++; clientSummary.repeatValue += c.value; }
    });
    clientSummary.repeatRate = clientSummary.withProjects ? (clientSummary.repeatClients / clientSummary.withProjects) * 100 : 0;
    clientSummary.repeatValueShare = clientSummary.totalProjectValue ? (clientSummary.repeatValue / clientSummary.totalProjectValue) * 100 : 0;
    clientSummary.topClients = Object.values(pByClient).sort((a,b) => b.value - a.value).slice(0, 5).map(c => ({ id: c.id, name: clients.find(x => x.id === c.id)?.company_name || 'Unknown', projectCount: c.count, activeProjects: c.active, totalValue: c.value }));

    // AMC
    const amcObj = { total: amcs.length, active: amcs.filter(a => a.status === 'active').length, annualValue: amcs.filter(a => a.status === 'active').reduce((s,a) => s + Number(a.amc_amount || 0), 0), renew30: 0, renew60: 0, renew90: 0, renew90Value: 0, expired: 0, upcoming: [] };
    amcs.forEach(a => {
      if (a.renewal_date) {
        const rd = new Date(a.renewal_date).getTime();
        const days = Math.round((rd - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0 && a.status === 'active') { amcObj.expired++; addAtt('amc', a.id, null, a.amc_name, a.renewal_date, a.status, 'Active', '#10b981', null, null, null, Number(a.amc_amount), 'overdue', 'Expired AMC', null); }
        else if (days <= 30) amcObj.renew30++;
        else if (days <= 60) amcObj.renew60++;
        else if (days <= 90) { amcObj.renew90++; amcObj.renew90Value += Number(a.amc_amount); }
        if (days >= 0 && days <= 90) amcObj.upcoming.push({ id: a.id, name: a.amc_name, client: clients.find(c => c.id === a.client_id)?.company_name, amount: Number(a.amc_amount), renewalDate: a.renewal_date, daysLeft: days, status: a.status });
      }
    });

    // Website
    const website = { totalVisits: visits.length, uniqueSessions: new Set(visits.map(v => v.session_id)).size, leadsEngaged: new Set(visits.map(v => v.lead_id)).size, pageViews: 0, avgDuration: 0, visits7d: 0, returningLeads: 0, topPages: [], referrers: [], devices: [], browsers: [], os: [], countries: [], recentLeads: [] };

    // Trends
    const monthlyTrend = [];
    const trendRange = '12m';
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nx = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const inMonth = leads.filter((l) => { const c = new Date(l.created_at); return c >= d && c < nx; });
      monthlyTrend.push({ bucket: MONTHS[d.getMonth()], label: MONTHS[d.getMonth()], leads: inMonth.length, won: inMonth.filter((l) => l.status === 'won').length, lost: inMonth.filter(l => l.status === 'lost').length, wonValue: inMonth.filter(l => l.status === 'won').reduce((s,l) => s + Number(l.budget || 0), 0) });
    }
    const trendTotals = { leads: totalLeads, won: wonLeads, lost: lostLeads, wonValue: kpis.wonValue };

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      errors: {},
      kpis,
      projects: projectSummary,
      leadStatus,
      projectStatus,
      priorityPipeline: [],
      opportunities,
      sources,
      employees,
      attention: { items: attentionItems, counts: {}, total: attentionItems.length },
      quotations: quotationsObj,
      clients: clientSummary,
      amc: amcObj,
      website,
      projectHealth,
      recentLeads: [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6).map(l => ({ id: l.id, leadNo: l.lead_no, customerName: l.customer_name, company: l.company, source: l.source, sourceLabel: labelFor('lead_source', l.source), budget: Number(l.budget || 0), status: l.status, statusLabel: labelFor('lead_status', l.status), statusColor: colorFor('lead_status', l.status), priority: l.priority, nextFollowUp: l.next_follow_up, createdAt: l.created_at, owner: l.assigned_employee?.employee_name || null })),
      recentProjects: [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6).map(p => ({ id: p.id, projectNo: p.project_no, projectName: p.project_name, client: p.client, status: p.status, statusLabel: labelFor('project_status', p.status), statusColor: colorFor('project_status', p.status), progress: p.progress, projectCost: Number(p.project_cost || 0), expectedDelivery: p.expected_delivery, updatedAt: p.updated_at, manager: p.manager?.employee_name || null })),
      activity: audit.map(a => ({ source: 'audit', id: a.id, title: `${a.username} ${a.action} ${a.entity}`, description: a.description, color: '#3366ff', isRead: true, createdAt: a.created_at, actor: a.username, module: a.module })),
      trend: { range: trendRange, points: monthlyTrend, totals: trendTotals, previous: trendTotals, hasPrevious: false },
      masters: masterOptions,
      employeeOptions: Object.values(emps).map(e => ({ id: e.id, name: e.employee_name, role: e.role })),
      // Keep old root properties for backwards compatibility with other pages calling useDashboard if any
      totalLeads, newLeads, newLeadsThisMonth, wonLeads, lostLeads, conversionRate, pipelineValue,
      totalProjects, activeProjects, completedProjects, onHoldProjects, totalProjectBudget, avgProjectProgress,
      leadsByStatus: leadStatus, leadsBySource: sources, projectsByStatus: projectStatus, monthlyTrend,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
