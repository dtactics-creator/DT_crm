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
  sort_order: number;
  is_active: boolean;
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
  type: string;
  url: string;
}

export interface Employee extends AuditFields {
  employee_name: string;
  role: string;
  phone: string | null;
  email: string;
  status: string;
  is_manager: boolean;
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
  budget: number;
  status: string;
  priority: string;
  lead_received_date: string | null;
  next_follow_up: string | null;
  remarks: string | null;
  converted_project_id: string | null;
  converted_at: string | null;
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
  remarks: string | null;
  manager?: Employee | null;
  assigned_employee?: Employee | null;
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
