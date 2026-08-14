import type { ImportColumn, MappedRow } from '../components/ImportDialog';
import type { Lead, Project, Employee, MasterItem } from '../types';
import { toCsv } from './csv';
import { formatDMY, parseDMY } from './date';

// ---------------------------------------------------------------------------
// CENTRALIZED IMPORT / EXPORT SCHEMA
//
// A single ordered list of FieldSpecs per module drives EVERYTHING:
//   • export column names + order       (field.header)
//   • the downloadable reference template
//   • import column matching + parsing  (field.key / aliases / parse)
//   • date formatting (DD/MM/YY) on both sides
//
// Guarantee: Export file === Reference template === Import format.
// ---------------------------------------------------------------------------

type Resolver = (category: string, input: string | null | undefined) => string | undefined;
type Labeler = (category: string, value: string | null | undefined) => string;
type EmpResolver = (input: string | null | undefined) => string | undefined;

export interface IOContext {
  label: Labeler;         // value -> display label (export)
  resolve: Resolver;      // label/value -> canonical value (import)
  resolveEmp: EmpResolver; // employee name/email -> id (import)
}

interface FieldSpec<T> {
  key: string;            // canonical key used in the parsed row + preview
  header: string;         // exact column name in export/template/import
  required?: boolean;
  hint?: string;
  example?: string;
  aliases?: string[];     // extra accepted header names
  payloadKey?: string;    // payload field if different from `key`
  exportValue: (row: T, ctx: IOContext) => string;
  parse: (raw: string, ctx: IOContext) => { value: unknown; error?: string; display?: string };
}

// Treat common "empty" placeholders as blank.
const PLACEHOLDER = /^(—|–|-{1,2}|n\/?a|null|none)$/i;
const clean = (v: string | null | undefined) => {
  const s = (v ?? '').trim();
  return PLACEHOLDER.test(s) ? '' : s;
};
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ------------------------------ generic field parsers ----------------------

const textField = <T,>(key: string, header: string, get: (r: T) => string, opts: { required?: boolean; min?: number; max?: number; hint?: string; example?: string; aliases?: string[]; payloadKey?: string } = {}): FieldSpec<T> => ({
  key, header, required: opts.required, hint: opts.hint, example: opts.example, aliases: opts.aliases, payloadKey: opts.payloadKey,
  exportValue: (r) => get(r) ?? '',
  parse: (raw) => {
    const s = clean(raw);
    if (opts.required && s.length < (opts.min ?? 1)) return { value: null, error: `${header} is required${opts.min ? ` (min ${opts.min} chars)` : ''}` };
    if (opts.min && s && s.length < opts.min) return { value: s, error: `${header} must be at least ${opts.min} characters` };
    if (opts.max && s.length > opts.max) return { value: s.slice(0, opts.max), error: `${header} is too long (max ${opts.max})` };
    return { value: s || null };
  },
});

const emailField = <T,>(key: string, header: string, get: (r: T) => string, opts: { required?: boolean; aliases?: string[]; payloadKey?: string } = {}): FieldSpec<T> => ({
  key, header, required: opts.required, hint: 'Email address', aliases: opts.aliases, payloadKey: opts.payloadKey,
  exportValue: (r) => get(r) ?? '',
  parse: (raw) => {
    const s = clean(raw).toLowerCase();
    if (!s) return opts.required ? { value: null, error: `${header} is required` } : { value: null };
    if (!emailOk(s)) return { value: null, error: `Invalid ${header.toLowerCase()}` };
    return { value: s };
  },
});

const numberField = <T,>(key: string, header: string, get: (r: T) => number, opts: { min?: number; max?: number; int?: boolean; hint?: string; example?: string; aliases?: string[] } = {}): FieldSpec<T> => ({
  key, header, hint: opts.hint, example: opts.example, aliases: opts.aliases,
  exportValue: (r) => String(get(r) ?? 0),
  parse: (raw) => {
    const s = clean(raw);
    if (!s) return { value: opts.int ? 0 : 0 };
    const n = Number(s.replace(/[,\s₹]/g, ''));
    if (Number.isNaN(n)) return { value: 0, error: `${header} must be a number` };
    if (opts.min !== undefined && n < opts.min) return { value: n, error: `${header} must be ≥ ${opts.min}` };
    if (opts.max !== undefined && n > opts.max) return { value: n, error: `${header} must be ≤ ${opts.max}` };
    return { value: opts.int ? Math.round(n) : n };
  },
});

const dateField = <T,>(key: string, header: string, get: (r: T) => string | null | undefined, opts: { aliases?: string[]; example?: string } = {}): FieldSpec<T> => ({
  key, header, hint: 'Date in DD/MM/YY', example: opts.example ?? '10/08/26', aliases: opts.aliases,
  exportValue: (r) => formatDMY(get(r)),
  parse: (raw) => {
    const iso = parseDMY(clean(raw));
    if (iso === 'INVALID') return { value: null, error: `${header} must be a valid date (DD/MM/YY)` };
    return { value: iso, display: iso ? formatDMY(iso) : '' };
  },
});

// Master-backed field: exports the label, imports a label/value -> canonical value.
const masterField = <T,>(key: string, header: string, category: string, get: (r: T) => string | null | undefined, opts: { required?: boolean; defaultValue?: string; hint?: string; example?: string; aliases?: string[] } = {}): FieldSpec<T> => ({
  key, header, required: opts.required, hint: opts.hint, example: opts.example, aliases: opts.aliases,
  exportValue: (r, ctx) => ctx.label(category, get(r)),
  parse: (raw, ctx) => {
    const s = clean(raw);
    if (!s) {
      if (opts.required) return { value: null, error: `${header} is required` };
      return { value: opts.defaultValue ?? null };
    }
    const v = ctx.resolve(category, s);
    if (!v) return { value: null, error: `Unknown ${header.toLowerCase()} "${s}"`, display: s };
    return { value: v, display: s };
  },
});

// Employee reference: exports the name, imports name/email -> id.
const employeeField = <T,>(key: string, header: string, get: (r: T) => string, opts: { aliases?: string[] } = {}): FieldSpec<T> => ({
  key, header, hint: 'Employee name or email', aliases: opts.aliases,
  exportValue: (r) => get(r) ?? '',
  parse: (raw, ctx) => {
    const s = clean(raw);
    if (!s) return { value: null };
    const id = ctx.resolveEmp(s);
    if (!id) return { value: null, error: `Employee "${s}" not found`, display: s };
    return { value: id, display: s };
  },
});

// ------------------------------ schema -> IO helpers -----------------------

function buildModuleIO<T>(fields: FieldSpec<T>[]) {
  const columns: ImportColumn[] = fields.map((f) => ({
    key: f.key,
    label: f.header,          // header == label so template/export/import all align
    required: f.required,
    hint: f.hint,
    example: f.example,
    aliases: f.aliases,
  }));

  const makeMapper = (ctx: IOContext) => (raw: Record<string, string>): MappedRow => {
    const errors: string[] = [];
    const values: Record<string, unknown> = {};
    const display: Record<string, string> = {};
    for (const f of fields) {
      const res = f.parse(raw[f.key] ?? '', ctx);
      if (res.error) errors.push(res.error);
      values[f.payloadKey ?? f.key] = res.value;
      display[f.key] = res.display ?? clean(raw[f.key] ?? '');
    }
    return { errors, values, display };
  };

  const buildCsv = (rows: T[], ctx: IOContext): string => {
    const headers = fields.map((f) => f.header);
    const data = rows.map((r) => fields.map((f) => f.exportValue(r, ctx)));
    return toCsv(headers, data);
  };

  return { columns, makeMapper, buildCsv };
}

// Build a name/email -> id resolver for employee reference fields.
export function employeeIndex(employees: Employee[] | undefined): EmpResolver {
  const map: Record<string, string> = {};
  for (const e of employees || []) {
    map[e.employee_name.trim().toLowerCase()] = e.id;
    if (e.email) map[e.email.trim().toLowerCase()] = e.id;
  }
  return (input) => (input ? map[String(input).trim().toLowerCase()] : undefined);
}

/* ============================== LEADS SCHEMA ============================== */

function getLeadFields(urlTypes: string[]): FieldSpec<Lead>[] {
  const fields: FieldSpec<Lead>[] = [
    textField('customer_name', 'Customer', (r) => r.customer_name, { required: true, min: 2, max: 120, hint: 'Customer / contact name (required)', example: 'Jane Cooper', aliases: ['customer name', 'name', 'contact'] }),
    textField('company', 'Company', (r) => r.company ?? '', { max: 200, example: 'Acme Inc.' }),
    emailField('primary_email', 'Email', (r) => r.primary_email ?? '', { aliases: ['primary email', 'email address'], payloadKey: 'primary_email' }),
    emailField('secondary_email', 'Secondary Email', (r) => r.secondary_email ?? '', { payloadKey: 'secondary_email' }),
    textField('primary_phone', 'Phone', (r) => r.primary_phone ?? '', { max: 40, example: '+91 98765 43210', aliases: ['primary phone', 'phone number', 'mobile'] }),
    textField('secondary_phone', 'Telephone', (r) => r.secondary_phone ?? '', { max: 40, aliases: ['telephone', 'telephone number', 'secondary phone'] }),
    textField('tertiary_phone', 'Alt Phone', (r) => r.tertiary_phone ?? '', { max: 40, aliases: ['alt phone', 'alternate phone', 'tertiary phone'] }),
    masterField('source', 'Source', 'lead_source', (r) => r.source, { required: true, hint: 'Lead source (required)', example: 'Website', aliases: ['lead source'] }),
    masterField('status', 'Status', 'lead_status', (r) => r.status, { required: true, hint: 'Lead status (required)', example: 'New', aliases: ['lead status'] }),
    masterField('priority', 'Priority', 'priority', (r) => r.priority, { defaultValue: 'medium', hint: 'Low / Medium / High / Critical', example: 'Medium' }),
    masterField('project_type', 'Project Type', 'project_type', (r) => r.project_type, { hint: 'Project type', example: 'CRM', aliases: ['project type', 'type'] }),
    numberField('budget', 'Budget', (r) => Number(r.budget || 0), { min: 0, hint: 'Numeric budget (INR)', example: '50000', aliases: ['estimated value', 'value'] }),
    textField('source_person', 'Source Person', (r) => r.source_person ?? '', { max: 200, aliases: ['source person', 'referred by'] }),
    employeeField('sales_manager', 'Sales Manager', (r) => r.sales_manager?.employee_name ?? '', { aliases: ['sales manager', 'manager'] }),
    employeeField('assigned_employee', 'Assigned Employee', (r) => r.assigned_employee?.employee_name ?? '', { aliases: ['assigned employee', 'assignee', 'owner'] }),
    dateField('lead_received_date', 'Received Date', (r) => r.lead_received_date, { aliases: ['received date', 'lead received date'] }),
    dateField('next_follow_up', 'Follow-up Date', (r) => r.next_follow_up, { aliases: ['follow-up date', 'follow up date'], example: '' }),
    textField('remarks', 'Remarks', (r) => r.remarks ?? '', { max: 4000, aliases: ['notes'] }),
  ];

  for (const t of urlTypes) {
    fields.push(textField(`url_${t}`, `${t} URL`, (r) => r.urls?.find((u) => u.type === t)?.url ?? '', { hint: `URL for ${t}`, aliases: [`${t} url`, t] }));
  }

  fields.find((f) => f.key === 'sales_manager')!.payloadKey = 'sales_manager_id';
  fields.find((f) => f.key === 'assigned_employee')!.payloadKey = 'assigned_employee_id';
  return fields;
}

export function getLeadImportColumns(urlTypes: string[]): ImportColumn[] {
  return buildModuleIO(getLeadFields(urlTypes)).columns;
}

export function makeLeadRowMapper(resolve: Resolver, resolveEmp: EmpResolver, label: Labeler, urlTypes: string[]) {
  const mapper = buildModuleIO(getLeadFields(urlTypes)).makeMapper({ resolve, resolveEmp, label });
  return (raw: Record<string, string>): MappedRow => {
    const res = mapper(raw);
    const urls: { type: string; url: string }[] = [];
    for (const t of urlTypes) {
      const val = res.values[`url_${t}`];
      if (val && typeof val === 'string' && val.trim()) {
        urls.push({ type: t, url: val.trim() });
      }
      delete res.values[`url_${t}`];
    }
    res.values.urls = urls;
    return res;
  };
}

export function buildLeadsCsv(leads: Lead[], label: Labeler, resolve: Resolver, resolveEmp: EmpResolver, urlTypes: string[]): string {
  return buildModuleIO(getLeadFields(urlTypes)).buildCsv(leads, { label, resolve, resolveEmp });
}

/* ============================= PROJECTS SCHEMA =========================== */

// Technology stack: exports "React, Node.js"; imports comma-separated -> values[].
const techStackField: FieldSpec<Project> = {
  key: 'technology_stack', header: 'Tech Stack', hint: 'Comma-separated technologies', example: 'React, Node.js', aliases: ['tech stack', 'technology stack', 'technologies'],
  exportValue: (r, ctx) => (Array.isArray(r.technology_stack) ? r.technology_stack.map((t) => ctx.label('technology_stack', t)) : []).join(', '),
  parse: (raw, ctx) => {
    const s = clean(raw);
    if (!s) return { value: [] };
    const out: string[] = [];
    const unknown: string[] = [];
    for (const part of s.split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
      const v = ctx.resolve('technology_stack', part);
      if (v) out.push(v); else unknown.push(part);
    }
    if (unknown.length) return { value: out, error: `Unknown technology: ${unknown.join(', ')}`, display: s };
    return { value: out, display: s };
  },
};

function getProjectFields(urlTypes: string[]): FieldSpec<Project>[] {
  const fields: FieldSpec<Project>[] = [
    textField('project_name', 'Project', (r) => r.project_name, { required: true, min: 2, max: 150, hint: 'Project name (required)', example: 'Acme CRM Platform', aliases: ['project name'] }),
    textField('client', 'Client', (r) => r.client, { required: true, min: 1, max: 150, hint: 'Client name (required)', example: 'Acme Corp', aliases: ['client name'] }),
    masterField('project_type', 'Type', 'project_type', (r) => r.project_type, { hint: 'Project type', example: 'CRM', aliases: ['project type'] }),
    masterField('status', 'Status', 'project_status', (r) => r.status, { required: true, hint: 'Project status (required)', example: 'Active', aliases: ['project status'] }),
    masterField('priority', 'Priority', 'priority', (r) => r.priority, { defaultValue: 'medium', hint: 'Low / Medium / High / Critical', example: 'High' }),
    numberField('project_cost', 'Cost', (r) => Number(r.project_cost || 0), { min: 0, hint: 'Numeric cost (INR)', example: '120000', aliases: ['project cost', 'budget'] }),
    numberField('progress', 'Progress', (r) => r.progress ?? 0, { min: 0, max: 100, int: true, hint: '0 - 100', example: '0' }),
    employeeField('project_manager', 'Manager', (r) => r.manager?.employee_name ?? '', { aliases: ['project manager'] }),
    employeeField('assigned_employee', 'Assigned', (r) => r.assigned_employee?.employee_name ?? '', { aliases: ['assigned employee', 'assignee'] }),
    techStackField,
    textField('lead_no', 'Lead Ref', (r) => r.lead_no ?? '', { max: 40, hint: 'Originating lead number', aliases: ['lead ref', 'lead no'] }),
    dateField('start_date', 'Start Date', (r) => r.start_date, { aliases: ['start date'] }),
    dateField('expected_delivery', 'Delivery Date', (r) => r.expected_delivery, { aliases: ['delivery date', 'expected delivery'], example: '' }),
    textField('remarks', 'Remarks', (r) => r.remarks ?? '', { max: 4000, aliases: ['notes'] }),
  ];

  for (const t of urlTypes) {
    fields.push(textField(`url_${t}`, `${t} URL`, (r) => r.urls?.find((u) => u.type === t)?.url ?? '', { hint: `URL for ${t}`, aliases: [`${t} url`, t] }));
  }

  fields.find((f) => f.key === 'project_manager')!.payloadKey = 'project_manager_id';
  fields.find((f) => f.key === 'assigned_employee')!.payloadKey = 'assigned_employee_id';
  return fields;
}

export function getProjectImportColumns(urlTypes: string[]): ImportColumn[] {
  return buildModuleIO(getProjectFields(urlTypes)).columns;
}

export function makeProjectRowMapper(resolve: Resolver, resolveEmp: EmpResolver, label: Labeler, urlTypes: string[]) {
  const mapper = buildModuleIO(getProjectFields(urlTypes)).makeMapper({ resolve, resolveEmp, label });
  return (raw: Record<string, string>): MappedRow => {
    const res = mapper(raw);
    const urls: { type: string; url: string }[] = [];
    for (const t of urlTypes) {
      const val = res.values[`url_${t}`];
      if (val && typeof val === 'string' && val.trim()) {
        urls.push({ type: t, url: val.trim() });
      }
      delete res.values[`url_${t}`];
    }
    res.values.urls = urls;
    return res;
  };
}

export function buildProjectsCsv(projects: Project[], label: Labeler, resolve: Resolver, resolveEmp: EmpResolver, urlTypes: string[]): string {
  return buildModuleIO(getProjectFields(urlTypes)).buildCsv(projects, { label, resolve, resolveEmp });
}

export type { MasterItem };
