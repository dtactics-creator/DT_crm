export interface AuditFields {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MasterItem extends AuditFields {
  category: string;
  label: string;
  value: string;
  color: string | null;
  symbol?: string | null;
  sort_order: number;
  is_active: boolean;
  description?: string | null;
  percent?: number | null;
  gst_percent?: number | null;
}

export interface Role extends AuditFields {
  name: string;
  type: string;
  description: string | null;
  status: string;
}

export interface Template extends AuditFields {
  title: string;
  category: string;
  channel: string;
  body: string;
  status: string;
  sort_order: number;
}

export interface ProjectUrl {
  id?: string;
  type: string;
  url: string;
  tracking_enabled?: boolean;
  tracking_token?: string;
  first_opened_at?: string | null;
  last_opened_at?: string | null;
  total_visits?: number;
  unique_visitors?: number;
  unique_pages?: number;
}

export interface UrlVisit {
  id: string;
  lead_id: string;
  lead_url_id: string;
  tracking_token: string;
  session_id: string;
  visited_at: string;
  full_url?: string | null;
  path: string;
  ip_address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  device_type?: string | null;
  operating_system?: string | null;
  browser?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  duration_seconds?: number;
}

export interface UrlPageView {
  id: string;
  visit_id?: string | null;
  lead_id: string;
  lead_url_id: string;
  tracking_token: string;
  session_id: string;
  path: string;
  full_url?: string | null;
  viewed_at: string;
  duration_seconds: number;
  referrer?: string | null;
}

export interface UrlPathAnalytics {
  path: string;
  views: number;
  first_viewed: string;
  last_viewed: string;
  avg_duration_seconds: number;
}

export interface LeadUrlAnalytics {
  lead: {
    id: string;
    lead_no: string | null;
    customer_name: string;
    company: string | null;
  };
  url: ProjectUrl;
  summary: {
    first_opened_at: string | null;
    last_opened_at: string | null;
    total_visits: number;
    unique_visitors: number;
    unique_pages: number;
  };
  pages: UrlPathAnalytics[];
  visits: UrlVisit[];
}

export interface Employee extends AuditFields {
  employee_name: string;
  role: string;
  phone: string | null;
  email: string;
  status: string;
}

export interface Lead extends AuditFields {
  lead_no: string | null;
  customer_name: string;
  company: string | null;
  sales_manager_id: string | null;
  assigned_employee_id: string | null;
  source_person: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  tertiary_phone: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  project_type: string | null;
  source: string;
  industry: string | null;
  budget: number;
  status: string;
  priority: string;
  lead_received_date: string | null;
  next_follow_up: string | null;
  address: string | null;
  remarks: string | null;
  converted_project_id: string | null;
  converted_at: string | null;
  urls?: ProjectUrl[];
  sales_manager?: Employee | null;
  assigned_employee?: Employee | null;
}

export interface Project extends AuditFields {
  project_no: string | null;
  project_name: string;
  client: string;
  lead_id: string | null;
  lead_no: string | null;
  project_type: string | null;
  industry: string | null;
  project_manager_id: string | null;
  assigned_employee_id: string | null;
  technology_stack: string[];
  urls: ProjectUrl[];
  project_cost: number;
  status: string;
  priority: string;
  progress: number;
  start_date: string | null;
  expected_delivery: string | null;
  next_follow_up: string | null;
  remarks: string | null;
  manager?: Employee | null;
  assigned_employee?: Employee | null;
  lead_coordinator?: Employee | null;
  lead?: { id: string; lead_no: string | null; customer_name: string; company: string | null } | null;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  newLeadsThisMonth: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  pipelineValue: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalProjectBudget: number;
  avgProjectProgress: number;
  leadsByStatus: { status: string; count: number; color: string }[];
  leadsBySource: { source: string; count: number; color: string }[];
  projectsByStatus: { status: string; count: number; color: string }[];
  monthlyTrend: { month: string; leads: number; won: number }[];
  recentLeads: Lead[];
  recentProjects: Project[];
}

export interface ReportData {
  summary: {
    leadCount: number;
    wonLeads: number;
    lostLeads: number;
    projectCount: number;
    activeProjects: number;
    completedProjects: number;
  };
  conversionFunnel: { stage: string; count: number; color: string }[];
  sourcePerformance: { source: string; total: number; won: number; value: number }[];
  revenueByType: { type: string; budget: number; count: number }[];
  monthlyRevenue: { month: string; revenue: number; projects: number }[];
  leadValueByStatus: { status: string; value: number; color: string }[];
  employeeLoad: { name: string; leads: number; projects: number }[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  module: string;
  entity: string | null;
  entity_id: string | null;
  description: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  http_method: string | null;
  endpoint: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface QuotationCharge extends AuditFields {
  service_area_id: string;
  charge_name: string;
  basis: string | null;
  currency: string;
  rate: number;
  sort_order: number;
}

export interface QuotationMilestone extends AuditFields {
  version_id: string;
  label: string;
  description?: string;
  percent: number;
  base_amount?: number;
  gst_percent?: number;
  gst_amount?: number;
  amount: number;
  sort_order: number;
}

export interface QuotationCommercialItem extends AuditFields {
  version_id: string;
  project_type: string | null;
  description: string;
  base_amount: number;
  gst_percent: number;
  gst_amount: number;
  amount_inc_gst: number;
  sort_order: number;
  exclude_from_milestone?: boolean;
}

export interface ServiceArea extends AuditFields {
  version_id: string;
  name: string;
  location: string | null;
  remarks: string | null;
  sort_order: number;
  charges?: QuotationCharge[];
}

export interface QuotationVersion extends AuditFields {
  quotation_id: string;
  version_number: number;
  template: string;
  date: string | null;
  valid_until: string | null;
  enquiry_no: string | null;
  department: string | null;
  service_type: string | null;
  project_type_description: string | null;
  from_location: string | null;
  to_location: string | null;
  customer_name: string | null;
  company: string | null;
  lead_source: string | null;
  lead_status: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  tertiary_phone: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  budget: number | null;
  source_person: string | null;
  lead_received_date: string | null;
  address: string | null;
  lead_remarks: string | null;
  currency: string;
  payment_terms: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  is_accepted: boolean;
  service_areas?: ServiceArea[];
  commercial_items?: QuotationCommercialItem[];
  milestones?: QuotationMilestone[];
  quotation?: Partial<Quotation>;
}

export interface Quotation extends AuditFields {
  quotation_no: string;
  lead_id: string | null;
  client_id?: string | null;
  project_id?: string | null;
  status: string;
  lead?: { customer_name: string; company: string | null; lead_no?: string };
  client?: { company_name: string; contact_person: string | null };
  project?: { project_name: string; project_no: string };
  versions?: QuotationVersion[];
}

export interface ClientAmc extends AuditFields {
  client_id: string;
  project_id?: string | null;
  amc_name: string;
  description: string | null;
  amc_amount: number;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  status: string;
  notes: string | null;
  project?: { project_name: string };
}

export interface Client extends AuditFields {
  client_no: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  status: string;
  notes: string | null;
  lead_id: string | null;
  project_count?: number;
  projects?: Project[];
  amcs?: ClientAmc[];
  lead?: Lead;
  quotations?: any[];
  audit_logs?: any[];
}
