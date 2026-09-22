-- Database Migration: Task Management Tables & Indexes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text; $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{}'::jsonb; $$ LANGUAGE sql;

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

CREATE TABLE IF NOT EXISTS dt_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_no TEXT,
    project_name TEXT NOT NULL,
    client TEXT NOT NULL,
    client_id UUID,
    lead_id UUID,
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
