import { supabase } from './_lib.js';

// Fetch a lightweight map of employees keyed by id (non-deleted).
export async function employeeMap() {
  const { data, error } = await supabase
    .from('crm_employees')
    .select('id, employee_name, email, role, status')
    .is('deleted_at', null);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

export async function leadMap() {
  const { data, error } = await supabase
    .from('dt_leads3')
    .select('id, lead_no, customer_name, company, sales_manager_id')
    .is('deleted_at', null);
  if (error) throw error;
  const map = {};
  for (const l of data || []) map[l.id] = l;
  return map;
}

// Generate the next lead number in the format YY-LD-001.
// The sequence resets each calendar year (based on lead_no prefix).
export async function nextLeadNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yymm = `${yy}${mm}`;
  const { data, error } = await supabase
    .from('dt_leads3')
    .select('lead_no')
    .like('lead_no', `${yymm}%`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  let max = 0;
  for (const row of data || []) {
    const m = String(row.lead_no || '').match(new RegExp(`^${yymm}(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${yymm}${String(max + 1).padStart(3, '0')}`;
}

// Generate the next project number in the format YY-PRJ-001.
// The sequence resets each calendar year (based on project_no prefix).
export async function nextProjectNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yymm = `${yy}${mm}`;
  const { data, error } = await supabase
    .from('dt_projects')
    .select('project_no')
    .like('project_no', `${yymm}PJ%`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  let max = 0;
  for (const row of data || []) {
    const m = String(row.project_no || '').match(new RegExp(`^${yymm}PJ(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${yymm}PJ${String(max + 1).padStart(3, '0')}`;
}

export async function nextQuotationNo() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const { data, error } = await supabase
    .from('dt_quotations')
    .select('quotation_no')
    .like('quotation_no', `QT-${yyyy}-%`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  let max = 0;
  for (const row of data || []) {
    const m = String(row.quotation_no || '').match(new RegExp(`^QT-${yyyy}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `QT-${yyyy}-${String(max + 1).padStart(4, '0')}`;
}

// Generate the next sequential document number, e.g. LD-1001 or PRJ-2001.
export async function nextNumber(table, column, prefix, start) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  let max = start - 1;
  for (const row of data || []) {
    const v = row[column];
    if (!v) continue;
    const m = String(v).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${max + 1}`;
}
