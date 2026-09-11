export type TrendRange = '7d' | '30d' | '90d' | '12m';

export interface MasterOption { label: string; value: string; color: string }

export interface KpiSummary {
  totalLeads: number; newLeads: number; contactedLeads: number; proposalSentLeads: number; negotiationLeads: number;
  wonLeads: number; lostLeads: number; openLeads: number; unassignedLeads: number; newThisMonth: number;
  openPipelineValue: number; wonValue: number; lostValue: number; avgWonValue: number;
  /** won ÷ total leads (%) */
  conversionRate: number;
  /** won ÷ (won + lost) (%) */
  winRate: number;
}

export interface ProjectSummary {
  total: number; active: number; completed: number; onHold: number; cancelled: number;
  totalValue: number; activeValue: number; completedValue: number; avgProgress: number; delayed: number; due30d: number;
}

export interface StatusSlice { status: string; label: string; color: string; count: number; value: number }
export interface PrioritySlice { priority: string; label: string; color: string; count: number; value: number }

export interface OpportunityRow {
  id: string; leadNo: string | null; customerName: string; company: string | null; budget: number;
  status: string; statusLabel: string; statusColor: string;
  priority: string | null; priorityLabel: string; priorityColor: string;
  source: string; sourceLabel: string; nextFollowUp: string | null; owner: string | null;
}

export interface SourceRow {
  source: string; label: string; color: string; totalLeads: number; wonLeads: number; lostLeads: number; openLeads: number;
  totalValue: number; wonValue: number; pipelineValue: number; conversionRate: number;
}

export interface EmployeeRow {
  id: string; name: string; role: string; assignedLeads: number; managedLeads: number; wonLeads: number; lostLeads: number;
  openLeads: number; pipelineValue: number; wonValue: number; managedWon: number; managedWonValue: number; conversionRate: number;
}

export type AttentionEntity = 'lead' | 'quotation' | 'project' | 'amc';
export type AttentionUrgency = 'overdue' | 'today' | 'soon' | 'watch';

export interface AttentionItem {
  entity: AttentionEntity; kind: string; id: string; reference: string | null; name: string; subtitle: string | null;
  dueDate: string | null; status: string | null; statusLabel: string | null; statusColor: string | null;
  priority: string | null; priorityLabel: string | null; priorityColor: string | null;
  value: number; rank: number; urgency: AttentionUrgency;
}
export interface AttentionData { items: AttentionItem[]; counts: Record<string, number>; total: number }

export interface QuotationSummary {
  total: number; draft: number; sent: number; accepted: number; rejected: number;
  totalValue: number; acceptedValue: number; sentValue: number; avgValue: number; avgVersions: number;
  expiring7d: number; expired: number; acceptanceRate: number;
}

export interface TopClient { id: string; name: string; projectCount: number; activeProjects: number; totalValue: number }
export interface ClientSummary {
  total: number; active: number; withProjects: number; withActiveProjects: number; repeatClients: number; repeatValue: number;
  totalProjectValue: number; repeatRate: number; repeatValueShare: number; newThisMonth: number; topClients: TopClient[];
}

export interface AmcRow { id: string; name: string; client: string; amount: number; renewalDate: string | null; daysLeft: number | null; status: string | null }
export interface AmcSummary {
  total: number; active: number; annualValue: number; renew30: number; renew60: number; renew90: number; renew90Value: number;
  expired: number; upcoming: AmcRow[];
}

export interface LabelCount { label: string; count: number; avgDuration?: number }
export interface EngagedLead {
  id: string; leadNo: string | null; customerName: string; company: string | null; status: string; statusLabel: string; statusColor: string;
  sessions: number; visits: number; pageViews: number; totalDuration: number; lastVisit: string | null;
}
export interface WebsiteSummary {
  totalVisits: number; uniqueSessions: number; leadsEngaged: number; pageViews: number; avgDuration: number; visits7d: number; returningLeads: number;
  topPages: LabelCount[]; referrers: LabelCount[]; devices: LabelCount[]; browsers: LabelCount[]; os: LabelCount[]; countries: LabelCount[];
  recentLeads: EngagedLead[];
}

export type ProjectHealthStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'on_hold' | 'cancelled';
export interface HealthSlice { health: ProjectHealthStatus; label: string; color: string; count: number; value: number }
export interface ProjectHealthRow {
  id: string; projectNo: string | null; projectName: string; client: string; status: string; statusLabel: string; statusColor: string;
  priority: string | null; progress: number; expectedProgress: number | null; projectCost: number;
  startDate: string | null; expectedDelivery: string | null; nextFollowUp: string | null; daysToDelivery: number | null;
  manager: string | null; health: ProjectHealthStatus; healthLabel: string; healthColor: string;
}

export interface RecentLead {
  id: string; leadNo: string | null; customerName: string; company: string | null; source: string; sourceLabel: string; budget: number;
  status: string; statusLabel: string; statusColor: string; priority: string | null; nextFollowUp: string | null; createdAt: string | null; owner: string | null;
}
export interface RecentProject {
  id: string; projectNo: string | null; projectName: string; client: string; status: string; statusLabel: string; statusColor: string;
  progress: number; projectCost: number; expectedDelivery: string | null; updatedAt: string | null; manager: string | null;
}
export interface ActivityItem {
  source: 'notification' | 'audit'; id: string; title: string; description: string | null; color: string | null; isRead: boolean;
  createdAt: string | null; actor: string | null; module: string | null;
}

export interface TrendPoint { bucket: string; label: string; leads: number; won: number; lost: number; wonValue: number }
export interface TrendTotals { leads: number; won: number; lost: number; wonValue: number }
export interface TrendData { range: TrendRange; points: TrendPoint[]; totals: TrendTotals; previous: TrendTotals; hasPrevious: boolean }

export interface EmployeeOption { id: string; name: string; role: string }

export interface DashboardPayload {
  generatedAt: string;
  /** Per-section query errors (section key → message). Sections without an entry loaded fine. */
  errors: Record<string, string>;
  kpis: KpiSummary;
  projects: ProjectSummary;
  leadStatus: StatusSlice[];
  projectStatus: StatusSlice[];
  priorityPipeline: PrioritySlice[];
  opportunities: OpportunityRow[];
  sources: SourceRow[];
  employees: EmployeeRow[];
  attention: AttentionData;
  quotations: QuotationSummary;
  clients: ClientSummary;
  amc: AmcSummary;
  website: WebsiteSummary;
  projectHealth: { slices: HealthSlice[]; rows: ProjectHealthRow[] };
  recentLeads: RecentLead[];
  recentProjects: RecentProject[];
  activity: ActivityItem[];
  trend: TrendData | null;
  masters: Record<string, MasterOption[]>;
  employeeOptions: EmployeeOption[];
}
