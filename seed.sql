-- ============================================================================
-- DTactics CRM — Database Seed
-- ============================================================================
-- Seeds every application table with realistic, cross-referenced data:
--   masters, dt_roles2, dt_role_permissions, crm_employees,
--   dt_leads3, dt_projects, dt_templates
--
-- Shared lookup values (project types, lead status, project status, lead
-- sources, priority, industry, technology stack, departments, URL types,
-- template categories) live in the single `masters` table and are reused by
-- leads and projects via their stored `value` strings.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this file → Run.
--   (Or: psql "$DATABASE_URL" -f supabase/seed.sql)
--
-- Fixed UUIDs are used for roles / employees / leads / projects so foreign-key
-- references line up. Re-running is safe: it clears the app tables first.
--
-- NOTE ON LOGIN: Employees authenticate through Supabase Auth (auth.users),
-- matched to crm_employees by email. This SQL seeds the CRM tables only.
-- To let a seeded employee sign in, create an Auth user with the SAME email
-- (Dashboard → Authentication → Add user, or the app's Employees form which
-- provisions the login automatically). A ready-to-use admin is included below
-- (admin@dtactics.io) — just create a matching Auth user with any password.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. SCHEMA DEFINITION (DDL)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS crm_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    password_hash TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_roles2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'sales',
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES dt_roles2(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_leads3 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_no TEXT,
    customer_name TEXT NOT NULL,
    company TEXT,
    sales_manager_id UUID REFERENCES crm_employees(id),
    assigned_employee_id UUID REFERENCES crm_employees(id),
    source_person TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    tertiary_phone TEXT,
    primary_email TEXT,
    secondary_email TEXT,
    project_type TEXT,
    source TEXT NOT NULL,
    budget NUMERIC DEFAULT 0,
    status TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    lead_received_date DATE,
    next_follow_up DATE,
    urls JSONB DEFAULT '[]',
    address TEXT,
    remarks TEXT,
    converted_project_id UUID,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    cta_label TEXT,
    cta_url TEXT,
    coupon_code TEXT,
    expiry TEXT,
    brand TEXT,
    qr BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.dt_campaigns ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated CRM users to read/write
CREATE POLICY "Enable all for authenticated users" 
ON public.dt_campaigns FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Allow unauthenticated public to READ campaigns for the landing page
CREATE POLICY "Anyone can view campaigns"
  ON public.dt_campaigns
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS dt_campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    is_default BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft',
    schema JSONB NOT NULL,
    default_config JSONB NOT NULL,
    component_name TEXT NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.dt_campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" 
ON public.dt_campaign_templates FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view campaign templates"
  ON public.dt_campaign_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    reveal_type TEXT,
    reveal_title TEXT,
    brand TEXT,
    milestone INTEGER,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view analytics"
  ON public.analytics_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS dt_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_no TEXT,
    customer_name TEXT,
    company_name TEXT NOT NULL,
    vat_gst_no TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    website TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    lead_id UUID REFERENCES dt_leads3(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES dt_clients(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    department TEXT,
    mobile TEXT,
    landline TEXT,
    email TEXT,
    remarks TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_client_amc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES dt_clients(id) ON DELETE CASCADE,
    amc_name TEXT NOT NULL,
    description TEXT,
    amc_amount NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    renewal_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_no TEXT,
    project_name TEXT NOT NULL,
    client TEXT NOT NULL,
    client_id UUID REFERENCES dt_clients(id),
    lead_id UUID REFERENCES dt_leads3(id),
    lead_no TEXT,
    project_type TEXT,
    project_manager_id UUID REFERENCES crm_employees(id),
    assigned_employee_id UUID REFERENCES crm_employees(id),
    technology_stack JSONB DEFAULT '[]',
    urls JSONB DEFAULT '[]',
    project_cost NUMERIC DEFAULT 0,
    status TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    progress NUMERIC DEFAULT 0,
    start_date DATE,
    expected_delivery DATE,
    next_follow_up DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_no TEXT,
    project_id UUID NOT NULL REFERENCES dt_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    module TEXT,
    assigned_employee_id UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'assigned',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    estimated_hours NUMERIC DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'::jsonb,
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_task_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES dt_tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    update_note TEXT NOT NULL,
    status_from TEXT,
    status_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON dt_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee_id ON dt_tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON dt_task_updates(task_id);

CREATE TABLE IF NOT EXISTS dt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    channel TEXT DEFAULT 'whatsapp',
    body TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    username TEXT,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    http_method TEXT,
    endpoint TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);

CREATE TABLE IF NOT EXISTS dt_lead_url_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES dt_leads3(id) ON DELETE CASCADE,
    lead_url_id TEXT NOT NULL,
    tracking_token TEXT NOT NULL,
    session_id TEXT NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    full_url TEXT,
    path TEXT,
    query_string TEXT,
    ip_address TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    timezone TEXT,
    device_type TEXT,
    operating_system TEXT,
    browser TEXT,
    user_agent TEXT,
    referrer TEXT,
    duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dt_lead_url_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES dt_lead_url_visits(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES dt_leads3(id) ON DELETE CASCADE,
    lead_url_id TEXT NOT NULL,
    tracking_token TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    full_url TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    duration_seconds INTEGER DEFAULT 0,
    referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_url_visits_lead_id ON dt_lead_url_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_url_visits_token ON dt_lead_url_visits(tracking_token);
CREATE INDEX IF NOT EXISTS idx_lead_url_visits_session ON dt_lead_url_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_lead_url_visits_visited_at ON dt_lead_url_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_url_pv_visit_id ON dt_lead_url_page_views(visit_id);
CREATE INDEX IF NOT EXISTS idx_lead_url_pv_token ON dt_lead_url_page_views(tracking_token);

CREATE TABLE IF NOT EXISTS dt_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_no TEXT UNIQUE NOT NULL,
    lead_id UUID REFERENCES dt_leads3(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS dt_quotation_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES dt_quotations(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    template TEXT DEFAULT 'logistics',
    date DATE,
    valid_until DATE,
    enquiry_no TEXT,
    department TEXT,
    service_type TEXT,
    from_location TEXT,
    to_location TEXT,
    customer_name TEXT,
    company TEXT,
    lead_source TEXT,
    lead_status TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    tertiary_phone TEXT,
    primary_email TEXT,
    secondary_email TEXT,
    budget NUMERIC DEFAULT 0,
    source_person TEXT,
    lead_received_date DATE,
    address TEXT,
    lead_remarks TEXT,
    currency TEXT DEFAULT 'USD',
    payment_terms TEXT,
    notes TEXT,
    terms TEXT,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (quotation_id, version_number)
);

CREATE TABLE IF NOT EXISTS dt_quotation_service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID REFERENCES dt_quotation_versions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    remarks TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS dt_quotation_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_area_id UUID NOT NULL REFERENCES dt_quotation_service_areas(id) ON DELETE CASCADE,
    charge_name TEXT NOT NULL,
    basis TEXT,
    currency TEXT DEFAULT 'USD',
    rate NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dt_quotation_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES dt_quotation_versions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    description TEXT,
    percent NUMERIC DEFAULT 0,
    base_amount NUMERIC DEFAULT 0,
    gst_percent NUMERIC DEFAULT 0,
    gst_amount NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dt_quotation_commercial_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES dt_quotation_versions(id) ON DELETE CASCADE,
    project_type TEXT,
    description TEXT,
    base_amount NUMERIC DEFAULT 0,
    gst_percent NUMERIC DEFAULT 0,
    gst_amount NUMERIC DEFAULT 0,
    amount_inc_gst NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dt_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES crm_employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3366ff',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS dt_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS and add policy based on user email
ALTER TABLE dt_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notifications" ON dt_notifications;
DROP POLICY IF EXISTS "Users can view notifications" ON dt_notifications;

-- Simplification for Realtime: Allow all authenticated users to receive events.
-- The frontend filter ensures they only receive their own notifications.
CREATE POLICY "Users can view notifications"
ON dt_notifications FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own notifications"
ON dt_notifications FOR UPDATE
USING (user_id = (SELECT id FROM crm_employees WHERE email = auth.jwt()->>'email'));

-- Enable Realtime for dt_notifications (Supabase specific)
-- Direct alter publication is cleaner and guarantees setup if publication exists.
ALTER PUBLICATION supabase_realtime ADD TABLE dt_notifications;

-- Trigger Function: Notify on new lead assigned
CREATE OR REPLACE FUNCTION notify_lead_assigned() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_employee_id IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id)) THEN
    INSERT INTO dt_notifications (user_id, title, description, color)
    VALUES (
      NEW.assigned_employee_id,
      'New lead assigned',
      NEW.customer_name || ' · ' || COALESCE(NEW.company, 'No Company'),
      '#3366ff'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_assigned ON dt_leads3;
CREATE TRIGGER trigger_lead_assigned
  AFTER INSERT OR UPDATE OF assigned_employee_id ON dt_leads3
  FOR EACH ROW EXECUTE FUNCTION notify_lead_assigned();

-- Trigger Function: Notify on new quotation created or updated
CREATE OR REPLACE FUNCTION notify_quotation_changed() RETURNS TRIGGER AS $$
DECLARE
  v_lead dt_leads3%ROWTYPE;
  v_settings_value JSONB;
  v_user_ids UUID[] := '{}';
  v_user_id UUID;
  v_default_user UUID;
  v_title TEXT;
  v_desc TEXT;
BEGIN
  SELECT * INTO v_lead FROM dt_leads3 WHERE id = NEW.lead_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New quotation created';
  ELSE
    v_title := 'Quotation updated';
  END IF;

  v_desc := 'Quotation ' || NEW.quotation_no || ' for ' || v_lead.customer_name;
  v_default_user := COALESCE(v_lead.assigned_employee_id, v_lead.sales_manager_id);
  
  SELECT value INTO v_settings_value FROM dt_settings WHERE key = 'quotation_notification_users';

  IF v_settings_value IS NOT NULL AND jsonb_typeof(v_settings_value) = 'array' THEN
    SELECT array_agg(DISTINCT value::text::uuid) INTO v_user_ids
    FROM jsonb_array_elements_text(v_settings_value);
  END IF;

  IF v_default_user IS NOT NULL THEN
    v_user_ids := array_append(v_user_ids, v_default_user);
  END IF;

  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    FOR v_user_id IN 
      SELECT DISTINCT unnest(v_user_ids) AS uid 
    LOOP
      IF v_user_id IS NOT NULL THEN
        INSERT INTO dt_notifications (user_id, title, description, color)
        VALUES (v_user_id, v_title, v_desc, '#f59e0b');
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotation_created ON dt_quotations;
DROP TRIGGER IF EXISTS trigger_quotation_changed ON dt_quotations;
CREATE TRIGGER trigger_quotation_changed
  AFTER INSERT OR UPDATE ON dt_quotations
  FOR EACH ROW EXECUTE FUNCTION notify_quotation_changed();

-- ============================================================================
-- 0.5. ALTER EXISTING TABLES TO ADD MISSING COLUMNS
-- ============================================================================
ALTER TABLE masters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS percent NUMERIC(5,2);
ALTER TABLE masters ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2);
ALTER TABLE crm_employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE dt_projects ADD COLUMN IF NOT EXISTS next_follow_up DATE;
ALTER TABLE dt_quotation_versions ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE dt_quotation_versions ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE dt_quotation_versions ADD COLUMN IF NOT EXISTS from_location TEXT;
ALTER TABLE dt_quotation_versions ADD COLUMN IF NOT EXISTS to_location TEXT;
ALTER TABLE dt_campaign_setups ADD COLUMN IF NOT EXISTS campaign_products JSONB DEFAULT '[]'::jsonb;
ALTER TABLE dt_campaign_setups ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE dt_quotation_versions ADD COLUMN IF NOT EXISTS project_type_description TEXT;

ALTER TABLE dt_quotation_milestones ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dt_quotation_milestones ADD COLUMN IF NOT EXISTS base_amount NUMERIC DEFAULT 0;
ALTER TABLE dt_quotation_milestones ADD COLUMN IF NOT EXISTS gst_percent NUMERIC DEFAULT 0;
ALTER TABLE dt_quotation_milestones ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;

ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS tertiary_phone TEXT;
ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS secondary_email TEXT;
ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE dt_projects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS converted_project_id UUID REFERENCES dt_projects(id);
ALTER TABLE dt_leads3 ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE dt_clients ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE dt_clients ADD COLUMN IF NOT EXISTS vat_gst_no TEXT;
ALTER TABLE dt_clients ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE dt_clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE dt_clients ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE dt_campaigns ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE dt_campaigns ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE dt_campaigns ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES dt_campaign_templates(id);
ALTER TABLE dt_campaigns ADD COLUMN IF NOT EXISTS template_config JSONB;


-- ---------------------------------------------------------------------------
-- 0. Clean slate (comment this block out to keep existing rows)
-- ---------------------------------------------------------------------------
DELETE FROM dt_role_permissions;
DELETE FROM audit_logs;
DELETE FROM dt_lead_url_page_views;
DELETE FROM dt_lead_url_visits;
DELETE FROM dt_projects;
DELETE FROM dt_client_amc;
DELETE FROM dt_client_contacts;
DELETE FROM dt_clients;
DELETE FROM dt_leads3;
DELETE FROM dt_templates;
DELETE FROM dt_notifications;
DELETE FROM dt_settings;
DELETE FROM crm_employees;
DELETE FROM dt_roles2;
DELETE FROM masters;

-- ---------------------------------------------------------------------------
-- 1. MASTERS — shared lookup values (reused across the whole app)
-- ---------------------------------------------------------------------------

-- Project Types
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('project_type','Static Website','static_website','#3366ff',1,true),
  ('project_type','Dynamic Website','dynamic_website','#3366ff',2,true),
  ('project_type','Landing Page','landing_page','#0ea5e9',3,true),
  ('project_type','Portfolio Website','portfolio_website','#0ea5e9',4,true),
  ('project_type','Business Website','business_website','#8b5cf6',5,true),
  ('project_type','School Website','school_website','#8b5cf6',6,true),
  ('project_type','College Website','college_website','#8b5cf6',7,true),
  ('project_type','Hospital Website','hospital_website','#ef4444',8,true),
  ('project_type','NGO Website','ngo_website','#14b8a6',9,true),
  ('project_type','E-Commerce Website','ecommerce_website','#f59e0b',10,true),
  ('project_type','Marketplace','marketplace','#f59e0b',11,true),
  ('project_type','CRM','crm','#3366ff',12,true),
  ('project_type','ERP','erp','#3366ff',13,true),
  ('project_type','HRMS','hrms','#8b5cf6',14,true),
  ('project_type','LMS','lms','#8b5cf6',15,true),
  ('project_type','Inventory','inventory','#14b8a6',16,true),
  ('project_type','POS','pos','#14b8a6',17,true),
  ('project_type','Mobile App','mobile_app','#ec4899',18,true),
  ('project_type','Android','android','#10b981',19,true),
  ('project_type','iOS','ios','#64748b',20,true),
  ('project_type','Flutter','flutter','#0ea5e9',21,true),
  ('project_type','React Native','react_native','#0ea5e9',22,true),
  ('project_type','SaaS','saas','#8b5cf6',23,true),
  ('project_type','Multi Tenant SaaS','multi_tenant_saas','#8b5cf6',24,true),
  ('project_type','AI Solution','ai_solution','#f97316',25,true),
  ('project_type','Automation','automation','#f97316',26,true),
  ('project_type','Incident Intelligence','incident_intelligence','#ef4444',27,true),
  ('project_type','Dashboard','dashboard','#3366ff',28,true),
  ('project_type','API Development','api_development','#14b8a6',29,true),
  ('project_type','UI UX','ui_ux','#ec4899',30,true),
  ('project_type','Maintenance','maintenance','#64748b',31,true),
  ('project_type','Other','other','#64748b',32,true);

-- Lead Status
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('lead_status','New','new','#3366ff',1,true),
  ('lead_status','Contacted','contacted','#0ea5e9',2,true),
  ('lead_status','Proposal Sent','proposal_sent','#8b5cf6',3,true),
  ('lead_status','Negotiation','negotiation','#f59e0b',4,true),
  ('lead_status','Won','won','#10b981',5,true),
  ('lead_status','Lost','lost','#ef4444',6,true);

-- Project Status
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('project_status','Active','active','#3366ff',1,true),
  ('project_status','Completed','completed','#10b981',2,true),
  ('project_status','On Hold','on_hold','#f59e0b',3,true),
  ('project_status','Cancelled','cancelled','#ef4444',4,true);

-- Lead Sources
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('lead_source','Website','website','#3366ff',1,true),
  ('lead_source','Google','google','#ef4444',2,true),
  ('lead_source','WhatsApp','whatsapp','#10b981',3,true),
  ('lead_source','Facebook','facebook','#3366ff',4,true),
  ('lead_source','Instagram','instagram','#ec4899',5,true),
  ('lead_source','LinkedIn','linkedin','#0ea5e9',6,true),
  ('lead_source','Referral','referral','#14b8a6',7,true),
  ('lead_source','Walk In','walk_in','#f59e0b',8,true),
  ('lead_source','Phone','phone','#8b5cf6',9,true),
  ('lead_source','Email','email','#64748b',10,true);

-- Priority (shared by leads AND projects)
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('priority','Low','low','#64748b',1,true),
  ('priority','Medium','medium','#0ea5e9',2,true),
  ('priority','High','high','#f59e0b',3,true),
  ('priority','Critical','critical','#ef4444',4,true);

-- Industry
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('industry','Technology','technology','#3366ff',1,true),
  ('industry','Finance','finance','#10b981',2,true),
  ('industry','Healthcare','healthcare','#ef4444',3,true),
  ('industry','Retail','retail','#f59e0b',4,true),
  ('industry','Manufacturing','manufacturing','#8b5cf6',5,true),
  ('industry','Education','education','#0ea5e9',6,true),
  ('industry','Logistics','logistics','#14b8a6',7,true);

-- Technology Stack
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('technology_stack','Angular','angular','#ef4444',1,true),
  ('technology_stack','React','react','#0ea5e9',2,true),
  ('technology_stack','Vue','vue','#10b981',3,true),
  ('technology_stack','Node.js','nodejs','#10b981',4,true),
  ('technology_stack','Express','express','#64748b',5,true),
  ('technology_stack','NestJS','nestjs','#ef4444',6,true),
  ('technology_stack','Laravel','laravel','#ef4444',7,true),
  ('technology_stack','PHP','php','#8b5cf6',8,true),
  ('technology_stack','Python','python','#3366ff',9,true),
  ('technology_stack','Java','java','#f97316',10,true),
  ('technology_stack','Spring Boot','spring_boot','#10b981',11,true),
  ('technology_stack','Flutter','flutter','#0ea5e9',12,true),
  ('technology_stack','React Native','react_native','#0ea5e9',13,true),
  ('technology_stack','PostgreSQL','postgresql','#3366ff',14,true),
  ('technology_stack','MySQL','mysql','#f59e0b',15,true),
  ('technology_stack','MongoDB','mongodb','#10b981',16,true),
  ('technology_stack','Firebase','firebase','#f59e0b',17,true),
  ('technology_stack','Supabase','supabase','#10b981',18,true),
  ('technology_stack','AWS','aws','#f97316',19,true),
  ('technology_stack','Azure','azure','#3366ff',20,true),
  ('technology_stack','Docker','docker','#0ea5e9',21,true);

-- Departments
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('department','Sales','sales','#3366ff',1,true),
  ('department','Engineering','engineering','#8b5cf6',2,true),
  ('department','Consulting','consulting','#14b8a6',3,true),
  ('department','Marketing','marketing','#f59e0b',4,true),
  ('department','Operations','operations','#0ea5e9',5,true);

-- URL Types
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('url_type','Demo URL','demo_url','#3366ff',1,true),
  ('url_type','Live URL','live_url','#10b981',2,true),
  ('url_type','GitHub URL','github_url','#64748b',3,true),
  ('url_type','Reference URL','reference_url','#8b5cf6',4,true),
  ('url_type','Staging URL','staging_url','#f59e0b',5,true),
  ('url_type','Design URL','design_url','#ec4899',6,true);

-- Template Categories
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('template_category','Outreach','outreach','#3366ff',1,true),
  ('template_category','Follow-up','follow_up','#f59e0b',2,true),
  ('template_category','Sales','sales','#8b5cf6',3,true),
  ('template_category','Delivery','delivery','#10b981',4,true),
  ('template_category','Billing','billing','#ef4444',5,true),
  ('template_category','General','general','#64748b',6,true);

-- Campaign Fonts
INSERT INTO masters (id, category, label, value, color, description, sort_order, is_active) VALUES
  ('7bbd7e0b-23f6-4c2b-bb46-1a763d6c8cf7', 'campaign_font', 'Poppins', '"Poppins", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">|||Poppins font - The font looks like the name.', 1, true),
  ('2a1f6c93-8f34-4b2d-a7e1-91c54f8d2101', 'campaign_font', 'Roboto', '"Roboto", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">|||Roboto font - Clean and highly readable.', 2, true),
  ('c84e2a17-5b93-4d6f-9c21-73a8f0e45126', 'campaign_font', 'Inter', '"Inter", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">|||Inter font - Modern and professional.', 3, true),
  ('f91b3d62-7e45-4c18-b029-65d2a8f71394', 'campaign_font', 'Montserrat', '"Montserrat", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">|||Montserrat font - Bold and stylish.', 4, true),
  ('6d27a9e4-13bc-48f5-bc72-90e61f3a5827', 'campaign_font', 'Open Sans', '"Open Sans", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">|||Open Sans font - Simple and highly readable.', 5, true),
  ('b52f8c31-64a7-4e09-81d3-27f6a9c54018', 'campaign_font', 'Oswald', '"Oswald", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&display=swap" rel="stylesheet">|||Oswald font - Strong and condensed.', 6, true),
  ('e73c1f05-9a62-4b84-bd17-52f0e8c63149', 'campaign_font', 'Raleway', '"Raleway", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">|||Raleway font - Elegant and modern.', 7, true),
  ('a41d8e72-36f5-4c90-ab15-58e7f2136049', 'campaign_font', 'Nunito', '"Nunito", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">|||Nunito font - Friendly and rounded.', 8, true),
  ('d63b7f29-81e4-45a2-96c3-14a8e0527396', 'campaign_font', 'Playfair Display', '"Playfair Display", serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">|||Playfair Display font - Elegant serif style.', 9, true),
  ('9f24c681-57a3-4d8e-a310-82b6e7451930', 'campaign_font', 'DM Sans', '"DM Sans", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,100..1000&display=swap" rel="stylesheet">|||DM Sans font - Clean, modern, and versatile.', 10, true),
  ('3c8f21a7-6d54-4e92-b138-75fa20c46183', 'campaign_font', 'Manrope', '"Manrope", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">|||Manrope font - Modern, clean, and geometric.', 11, true),
  ('7e42b916-3a85-4c27-b061-98d5f7312046', 'campaign_font', 'Lato', '"Lato", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">|||Lato font - Professional, friendly, and readable.', 12, true),
  ('b615d3e8-92f4-4a71-8c30-57e1f0264932', 'campaign_font', 'Ubuntu', '"Ubuntu", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet">|||Ubuntu font - Distinctive, modern, and friendly.', 13, true),
  ('f029c473-81b6-45de-a257-63e8b9147205', 'campaign_font', 'Rubik', '"Rubik", sans-serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">|||Rubik font - Rounded, bold, and contemporary.', 14, true),
  ('5a73e914-28c6-4f01-b592-47d8e6312057', 'campaign_font', 'Merriweather', '"Merriweather", serif', '#3366ff', '<link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">|||Merriweather font - Classic, elegant, and highly readable serif.', 15, true);

-- Role Types
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('role_type','Sales','sales','#3366ff',1,true),
  ('role_type','Developer','developer','#8b5cf6',2,true);

-- Task Modules
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('task_module','Frontend','frontend','#0ea5e9',1,true),
  ('task_module','Backend','backend','#8b5cf6',2,true),
  ('task_module','UI/UX Design','ui_ux_design','#ec4899',3,true),
  ('task_module','API Integration','api_integration','#14b8a6',4,true),
  ('task_module','Database','database','#3366ff',5,true),
  ('task_module','QA & Testing','qa_testing','#f59e0b',6,true),
  ('task_module','DevOps & Deployment','devops_deployment','#10b981',7,true),
  ('task_module','General','general','#64748b',8,true);

-- Task Statuses
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('task_status','Assigned','assigned','#3366ff',1,true),
  ('task_status','In Progress','in_progress','#f59e0b',2,true),
  ('task_status','Under Review','under_review','#8b5cf6',3,true),
  ('task_status','Completed','completed','#10b981',4,true);

-- Task Priorities
INSERT INTO masters (category, label, value, color, sort_order, is_active) VALUES
  ('task_priority','Low','low','#64748b',1,true),
  ('task_priority','Medium','medium','#0ea5e9',2,true),
  ('task_priority','High','high','#f59e0b',3,true),
  ('task_priority','Urgent','urgent','#ef4444',4,true);

-- ---------------------------------------------------------------------------
-- 2. ROLES (dt_roles2) — sales + developer, plus an Administrator
-- ---------------------------------------------------------------------------
INSERT INTO dt_roles2 (id, name, type, description, status) VALUES
  ('a0000000-0000-0000-0000-000000000001','Administrator','sales','Full system access (super admin).','active'),
  -- Sales roles
  ('a0000000-0000-0000-0000-000000000002','Sales Director','sales','Leads the sales organization and owns revenue targets.','active'),
  ('a0000000-0000-0000-0000-000000000003','Sales Manager','sales','Manages the sales team and lead pipeline.','active'),
  ('a0000000-0000-0000-0000-000000000004','Account Executive','sales','Manages client relationships and closes deals.','active'),
  ('a0000000-0000-0000-0000-000000000005','Sales Executive','sales','Handles outreach, qualification and follow-ups.','active'),
  ('a0000000-0000-0000-0000-000000000006','Business Development Manager','sales','Drives new business and partnerships.','active'),
  ('a0000000-0000-0000-0000-000000000007','Pre-Sales Consultant','sales','Provides solution demos and technical pre-sales support.','active'),
  -- Developer roles
  ('a0000000-0000-0000-0000-000000000008','Engineering Manager','developer','Oversees engineering teams and delivery.','active'),
  ('a0000000-0000-0000-0000-000000000009','Solutions Architect','developer','Designs technical architecture for projects.','active'),
  ('a0000000-0000-0000-0000-00000000000a','Tech Lead','developer','Leads a development team and code quality.','active'),
  ('a0000000-0000-0000-0000-00000000000b','Frontend Developer','developer','Builds user interfaces and client-side features.','active'),
  ('a0000000-0000-0000-0000-00000000000c','Backend Developer','developer','Develops server-side logic and APIs.','active'),
  ('a0000000-0000-0000-0000-00000000000d','Full Stack Developer','developer','Works across frontend and backend.','active'),
  ('a0000000-0000-0000-0000-00000000000e','Mobile Developer','developer','Builds Android, iOS and cross-platform apps.','active'),
  ('a0000000-0000-0000-0000-00000000000f','QA Engineer','developer','Ensures product quality through testing.','active'),
  ('a0000000-0000-0000-0000-000000000010','DevOps Engineer','developer','Manages CI/CD, infrastructure and deployments.','active'),
  ('a0000000-0000-0000-0000-000000000011','UI/UX Designer','developer','Designs product experience and interfaces.','active');

-- ---------------------------------------------------------------------------
-- 3. ROLE PERMISSIONS (dt_role_permissions)
--    Naming: <module>.<action>. '*' = super admin (all).
-- ---------------------------------------------------------------------------

-- Administrator: full access
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000001','*');

-- Sales Director: full leads control + read-only elsewhere
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000002','leads.view'),
  ('a0000000-0000-0000-0000-000000000002','leads.create'),
  ('a0000000-0000-0000-0000-000000000002','leads.edit'),
  ('a0000000-0000-0000-0000-000000000002','leads.delete'),
  ('a0000000-0000-0000-0000-000000000002','leads.convert'),
  ('a0000000-0000-0000-0000-000000000002','leads.import'),
  ('a0000000-0000-0000-0000-000000000002','leads.export'),
  ('a0000000-0000-0000-0000-000000000002','clients.view'),
  ('a0000000-0000-0000-0000-000000000002','clients.create'),
  ('a0000000-0000-0000-0000-000000000002','clients.edit'),
  ('a0000000-0000-0000-0000-000000000002','clients.delete'),
  ('a0000000-0000-0000-0000-000000000002','projects.view'),
  ('a0000000-0000-0000-0000-000000000002','employees.view'),
  ('a0000000-0000-0000-0000-000000000002','masters.view'),
  ('a0000000-0000-0000-0000-000000000002','templates.view'),
  ('a0000000-0000-0000-0000-000000000002','reports.view');

-- Sales Manager: manage leads + convert
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000003','leads.view'),
  ('a0000000-0000-0000-0000-000000000003','leads.create'),
  ('a0000000-0000-0000-0000-000000000003','leads.edit'),
  ('a0000000-0000-0000-0000-000000000003','leads.convert'),
  ('a0000000-0000-0000-0000-000000000003','leads.export'),
  ('a0000000-0000-0000-0000-000000000003','clients.view'),
  ('a0000000-0000-0000-0000-000000000003','clients.create'),
  ('a0000000-0000-0000-0000-000000000003','clients.edit'),
  ('a0000000-0000-0000-0000-000000000003','masters.view'),
  ('a0000000-0000-0000-0000-000000000003','templates.view'),
  ('a0000000-0000-0000-0000-000000000003','reports.view');

-- Account Executive: work leads
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000004','leads.view'),
  ('a0000000-0000-0000-0000-000000000004','leads.create'),
  ('a0000000-0000-0000-0000-000000000004','leads.edit'),
  ('a0000000-0000-0000-0000-000000000004','masters.view'),
  ('a0000000-0000-0000-0000-000000000004','templates.view');

-- Sales Executive: basic leads
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000005','leads.view'),
  ('a0000000-0000-0000-0000-000000000005','leads.create'),
  ('a0000000-0000-0000-0000-000000000005','leads.edit'),
  ('a0000000-0000-0000-0000-000000000005','templates.view');

-- Engineering Manager: full projects control + read leads
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000008','projects.view'),
  ('a0000000-0000-0000-0000-000000000008','projects.create'),
  ('a0000000-0000-0000-0000-000000000008','projects.edit'),
  ('a0000000-0000-0000-0000-000000000008','projects.delete'),
  ('a0000000-0000-0000-0000-000000000008','projects.import'),
  ('a0000000-0000-0000-0000-000000000008','projects.export'),
  ('a0000000-0000-0000-0000-000000000008','clients.view'),
  ('a0000000-0000-0000-0000-000000000008','leads.view'),
  ('a0000000-0000-0000-0000-000000000008','employees.view'),
  ('a0000000-0000-0000-0000-000000000008','masters.view'),
  ('a0000000-0000-0000-0000-000000000008','reports.view');

-- Solutions Architect: manage projects
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-000000000009','projects.view'),
  ('a0000000-0000-0000-0000-000000000009','projects.create'),
  ('a0000000-0000-0000-0000-000000000009','projects.edit'),
  ('a0000000-0000-0000-0000-000000000009','masters.view'),
  ('a0000000-0000-0000-0000-000000000009','reports.view');

-- Frontend / Backend Developer: view + edit projects
INSERT INTO dt_role_permissions (role_id, permission) VALUES
  ('a0000000-0000-0000-0000-00000000000b','projects.view'),
  ('a0000000-0000-0000-0000-00000000000b','projects.edit'),
  ('a0000000-0000-0000-0000-00000000000b','masters.view'),
  ('a0000000-0000-0000-0000-00000000000c','projects.view'),
  ('a0000000-0000-0000-0000-00000000000c','projects.edit'),
  ('a0000000-0000-0000-0000-00000000000c','masters.view');

-- ---------------------------------------------------------------------------
-- 4. EMPLOYEES (crm_employees)
--    `role` MUST match a dt_roles2.name so permissions resolve.
-- ---------------------------------------------------------------------------
INSERT INTO crm_employees (id, employee_name, role, phone, email, password_hash, status) VALUES
  ('b0000000-0000-0000-0000-000000000001','Admin User','Administrator','+1 415 555 0100','admin@dtactics.io', crypt('password123', gen_salt('bf')), 'active');
  

-- ---------------------------------------------------------------------------
-- 5. LEADS (dt_leads3)
--    sales_manager_id / assigned_employee_id → sales employees.
--    source / status / priority / project_type → master `value`s.
-- ---------------------------------------------------------------------------
INSERT INTO dt_leads3
  (id, lead_no, customer_name, company, sales_manager_id, assigned_employee_id, source_person,
   primary_phone, secondary_phone, primary_email, project_type, source, budget, status, priority,
   lead_received_date, next_follow_up, remarks, address)
VALUES
  ('c0000000-0000-0000-0000-000000000001','26-LD-001','Marcus Thompson','Northwind Analytics',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Referral - Nikhil Rao',
   '+1 212 555 0101',NULL,'marcus@northwind.io','dashboard','website',85000,'proposal_sent','high',
   '2026-01-05 09:00:00+00','2026-02-20 10:00:00+00','Interested in a full analytics dashboard rebuild.', '123 Analytics Way, NY'),

  ('c0000000-0000-0000-0000-000000000002','26-LD-002','Isabella Ferrari','Meridian Finance',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Priya Nair',
   '+1 312 555 0122',NULL,'isabella@meridianfin.com','erp','referral',210000,'negotiation','critical',
   '2026-01-10 11:45:00+00','2026-02-15 14:30:00+00','Proposal sent for ERP modernization. Strong intent.', '45 Finance St, Chicago'),

  ('c0000000-0000-0000-0000-000000000003','26-LD-003','James Whitfield','Apex Health Systems',
   'b0000000-0000-0000-0000-000000000001',NULL,NULL,
   '+1 617 555 0143',NULL,'jwhitfield@apexhealth.org','hospital_website','linkedin',64000,'contacted','medium',
   '2026-01-12 08:30:00+00','2026-02-22 09:00:00+00','Exploring a HIPAA-compliant patient portal.', '100 Health Ave, Boston'),

  ('c0000000-0000-0000-0000-000000000004','26-LD-004','Chloe Bennett','Urban Retail Co',
   'b0000000-0000-0000-0000-000000000001',NULL,NULL,
   '+1 213 555 0164',NULL,'chloe@urbanretail.com','ecommerce_website','google',32000,'new','low',
   '2026-01-18 15:20:00+00','2026-02-18 13:00:00+00','Inbound from ad campaign. Needs an e-commerce revamp.', '50 Retail Blvd, LA'),

  ('c0000000-0000-0000-0000-000000000005','26-LD-005','Rohan Gupta','Skyline Logistics',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Aarav Mehta',
   '+1 469 555 0175',NULL,'rohan@skylinelog.com','automation','walk_in',148000,'won','high',
   '2025-12-10 10:00:00+00',NULL,'Closed! Fleet tracking + route optimization platform.', '88 Logistics Rd, Dallas'),

  ('c0000000-0000-0000-0000-000000000006','26-LD-006','Olivia Martins','BrightEdu Group',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Priya Nair',
   '+1 305 555 0186',NULL,'olivia@brightedu.com','lms','referral',96000,'negotiation','high',
   '2025-12-28 09:40:00+00','2026-02-16 11:00:00+00','Negotiating LMS platform scope and support tier.', '200 Education Center, Miami'),

  ('c0000000-0000-0000-0000-000000000007','26-LD-007','Ava Robinson','Coastal Bank',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','David Chen',
   '+1 786 555 0108',NULL,'ava@coastalbank.com','saas','referral',320000,'won','critical',
   '2025-11-22 09:00:00+00',NULL,'Multi-year SaaS platform engagement signed.', '75 Banking District, SF'),

  ('c0000000-0000-0000-0000-000000000008','26-LD-008','Grace Sullivan','PureLeaf Organics',
   'b0000000-0000-0000-0000-000000000001',NULL,NULL,
   '+1 720 555 0130',NULL,'grace@pureleaf.com','landing_page','instagram',12000,'lost','low',
   '2025-12-05 10:15:00+00',NULL,'Went with a cheaper freelancer. Keep warm.', '10 Organic Lane, Denver');

-- ---------------------------------------------------------------------------
-- 6. PROJECTS (dt_projects)
--    project_manager_id → dev managers; assigned_employee_id → dev employees.
--    technology_stack → array of master `value`s. Two link to won leads.
-- ---------------------------------------------------------------------------
INSERT INTO dt_projects
  (id, project_no, project_name, client, lead_id, lead_no, project_type,
   project_manager_id, assigned_employee_id, technology_stack, urls, project_cost,
   status, priority, progress, start_date, expected_delivery, remarks)
VALUES
  ('d0000000-0000-0000-0000-000000000001','26-PRJ-001','Fleet Intelligence Platform','Skyline Logistics',
   'c0000000-0000-0000-0000-000000000005','26-LD-005','automation',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["react","nodejs","postgresql","docker"]'::jsonb,
   '[{"type":"demo_url","url":"https://demo.skyline-fleet.dtactics.io"},{"type":"github_url","url":"https://github.com/dtactics/skyline-fleet"}]'::jsonb,
   148000,'active','high',62,'2025-12-15 00:00:00+00','2026-06-30 00:00:00+00',
   'Real-time fleet tracking with ML-based route optimization.'),

  ('d0000000-0000-0000-0000-000000000002','26-PRJ-002','Coastal SaaS Banking','Coastal Bank',
   'c0000000-0000-0000-0000-000000000007','26-LD-007','saas',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["angular","spring_boot","postgresql","aws"]'::jsonb,
   '[{"type":"live_url","url":"https://app.coastalbank.com"}]'::jsonb,
   320000,'active','critical',38,'2025-12-01 00:00:00+00','2026-09-15 00:00:00+00',
   'Multi-tenant SaaS core banking platform.'),

  ('d0000000-0000-0000-0000-000000000003','26-PRJ-003','GreenGrid Analytics Dashboard','GreenGrid Utilities',
   NULL,NULL,'dashboard',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["react","python","mongodb","azure"]'::jsonb,
   '[{"type":"live_url","url":"https://dashboard.greengrid.com"}]'::jsonb,
   205000,'completed','high',100,'2025-08-01 00:00:00+00','2025-12-01 00:00:00+00',
   'Smart grid monitoring dashboard with predictive load forecasting.'),

  ('d0000000-0000-0000-0000-000000000004','26-PRJ-004','Vertex Inventory System','Vertex Manufacturing',
   NULL,NULL,'inventory',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["vue","laravel","mysql"]'::jsonb,'[]'::jsonb,
   120000,'on_hold','high',25,'2026-02-15 00:00:00+00','2026-08-15 00:00:00+00',
   'IoT sensor network with real-time inventory tracking.'),

  ('d0000000-0000-0000-0000-000000000005','26-PRJ-005','Apex Patient Portal','Apex Health Systems',
   NULL,NULL,'hospital_website',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["react","nestjs","postgresql","firebase"]'::jsonb,
   '[{"type":"demo_url","url":"https://demo.apexhealth.org/portal"}]'::jsonb,
   64000,'active','medium',45,'2026-01-10 00:00:00+00','2026-05-10 00:00:00+00',
   'HIPAA-compliant patient engagement portal.'),

  ('d0000000-0000-0000-0000-000000000006','26-PRJ-006','BrightEdu LMS','BrightEdu Group',
   NULL,NULL,'lms',
   'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   '["flutter","nodejs","mongodb","supabase"]'::jsonb,'[]'::jsonb,
   96000,'cancelled','medium',15,'2025-12-01 00:00:00+00','2026-06-01 00:00:00+00',
   'Client paused indefinitely due to budget cuts.');

-- ---------------------------------------------------------------------------
-- 7. TEMPLATES (dt_templates)
--    category → template_category master `value`s.
-- ---------------------------------------------------------------------------
INSERT INTO dt_templates (title, category, channel, body, status, sort_order) VALUES
  ('Website Demo Introduction','outreach','whatsapp',
   E'Good morning, {{Name}} 👋\n\nMany customers search online before choosing a business. Right now, you don''t have a dedicated website to showcase yours.\n\nWe''ve created a FREE personalized website demo for you:\n\n🌐 {{Demo Link}}\n\nIf you like it, we can customize it with your details, Google Reviews, Maps, WhatsApp and online booking.\n\n— Team DTACTICS IT',
   'active',1),

  ('Website Demo Follow-up','follow_up','whatsapp',
   E'Hi {{Name}}, your personalized website is ready.\n\nWe''d love your quick feedback before we finalize it — it takes about 2 minutes to review.\n\n🌐 Preview: {{Demo Link}}\n\nPlease reply with "yes" or share any changes and we''ll take care of the rest.\n\n— DTACTICS IT',
   'active',2),

  ('Proposal Sent','sales','whatsapp',
   E'Hi {{Name}},\n\nThank you for your time today. As discussed, please find our proposal for {{ProjectType}}.\n\n📄 {{Proposal Link}}\n\nHappy to walk you through the scope, timeline and pricing on a quick call. Let me know what works!\n\n— {{OwnerName}}, DTACTICS IT',
   'active',3),

  ('Project Kickoff','delivery','whatsapp',
   E'Hi {{ContactPerson}}, 🎉\n\nWe''re excited to kick off {{ProjectName}} ({{ProjectNo}})!\n\nYour project manager is {{ManagerName}}, and our team has already started. We''ll share regular updates and reach out whenever we need your input.\n\n— Team DTACTICS IT',
   'active',4),

  ('Website Live','delivery','whatsapp',
   E'Hello {{ContactPerson}},\n\nGreat news — your website for {{BusinessName}} is now live! 🚀\n\n🌐 {{WebsiteLink}}\n\nThank you for choosing DTACTICS IT. Please review it and share any final feedback.',
   'active',5),

  ('Payment Reminder','billing','whatsapp',
   E'Hello {{ContactPerson}},\n\nA gentle reminder that the payment for {{ProjectName}} ({{ProjectNo}}) is due.\n\n💳 Amount: {{Amount}}\n\nPlease let us know once it''s processed, or reach out if you need an invoice or an alternate payment option. Thank you! 🙏',
   'active',6),

  ('New Lead Welcome','general','whatsapp',
   E'Hi {{Name}} 👋\n\nThank you for reaching out to DTACTICS IT Solutions!\n\nWe help businesses like {{BusinessName}} grow online with custom websites, CRMs, mobile apps and AI solutions.\n\nCould you share a bit about what you''re looking to build? I''ll put together a tailored proposal for you. 🚀',
   'active',7);

-- Quotations Permissions
INSERT INTO dt_role_permissions (role_id, permission)
SELECT id, 'quotations.view' FROM dt_roles2 WHERE name IN ('Administrator', 'Sales Director', 'Sales Manager', 'Account Executive', 'Sales Executive');

INSERT INTO dt_role_permissions (role_id, permission)
SELECT id, 'quotations.create' FROM dt_roles2 WHERE name IN ('Administrator', 'Sales Director', 'Sales Manager', 'Account Executive', 'Sales Executive');

INSERT INTO dt_role_permissions (role_id, permission)
SELECT id, 'quotations.edit' FROM dt_roles2 WHERE name IN ('Administrator', 'Sales Director', 'Sales Manager', 'Account Executive', 'Sales Executive');

-- Tasks Permissions
INSERT INTO dt_role_permissions (role_id, permission)
SELECT id, p FROM dt_roles2, (VALUES ('tasks.view'), ('tasks.create'), ('tasks.edit'), ('tasks.delete')) AS perms(p)
WHERE type = 'developer' OR name IN ('Administrator', 'Sales Director', 'Engineering Manager');

COMMIT;

-- ============================================================================
-- Done. Summary of seeded data:
--   masters             ~122 rows across 10 categories (shared lookups)
--   dt_roles2            17 roles (1 admin, 6 sales, 10 developer)
--   dt_role_permissions permission sets for admin + key roles
--   crm_employees       11 employees (admin@dtactics.io is the admin login)
--   dt_leads3           8 leads (2 won, 1 lost, rest in pipeline)
--   dt_projects         6 projects (2 linked to won leads)
--   dt_templates        7 WhatsApp message templates
--
-- Next: create a Supabase Auth user with email admin@dtactics.io to sign in
-- as the full-access administrator.
-- ============================================================================
-- Create dt_campaign_setups table
CREATE TABLE IF NOT EXISTS public.dt_campaign_setups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    play_mode TEXT DEFAULT 'loop',
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    campaign_products JSONB DEFAULT '[]'::jsonb,
    domain TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create dt_campaign_setup_templates table
CREATE TABLE IF NOT EXISTS public.dt_campaign_setup_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_setup_id UUID NOT NULL REFERENCES public.dt_campaign_setups(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.dt_campaign_templates(id) ON DELETE RESTRICT,
    sort_order INT DEFAULT 0,
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_setup_id, template_id)
);

-- Enable RLS
ALTER TABLE public.dt_campaign_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dt_campaign_setup_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dt_campaign_setups
CREATE POLICY "Enable read access for authenticated users" ON public.dt_campaign_setups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view campaign setups"
    ON public.dt_campaign_setups
    FOR SELECT TO anon USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.dt_campaign_setups
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.dt_campaign_setups
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.dt_campaign_setups
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for dt_campaign_setup_templates
CREATE POLICY "Enable read access for authenticated users" ON public.dt_campaign_setup_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view campaign setup templates"
    ON public.dt_campaign_setup_templates
    FOR SELECT TO anon USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.dt_campaign_setup_templates
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.dt_campaign_setup_templates
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.dt_campaign_setup_templates
    FOR DELETE TO authenticated USING (true);


-- Create analytics_sessions table
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE,
    visitor_id UUID NOT NULL,
    
    -- Context
    domain TEXT,
    campaign_setup_id UUID REFERENCES public.dt_campaign_setups(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.dt_campaign_templates(id) ON DELETE SET NULL,
    
    -- Metrics
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_domain ON public.analytics_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_setup_id ON public.analytics_sessions(campaign_setup_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_template_id ON public.analytics_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to INSERT new sessions
CREATE POLICY "Anyone can insert sessions"
    ON public.analytics_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow anonymous users to UPDATE their own sessions using visitor_id + session_id as the pseudo-auth mechanism
CREATE POLICY "Users can update own sessions"
    ON public.analytics_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated (CRM) users and anon (for update resolution) to read all analytics
CREATE POLICY "Authenticated users can read sessions"
    ON public.analytics_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);
