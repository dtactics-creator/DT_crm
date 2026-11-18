-- ============================================================================
-- Database Migration: Competition Management Module
-- Tables, Constraints, Indexes & Auditing for Competitions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure referenced core tables exist in local environment
CREATE TABLE IF NOT EXISTS dt_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL DEFAULT 'standard',
    title TEXT NOT NULL DEFAULT '',
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

-- 1. Main Competitions Table
CREATE TABLE IF NOT EXISTS dt_competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_no TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subdomain TEXT UNIQUE,
    custom_domain TEXT,
    category TEXT NOT NULL DEFAULT 'photography',
    type TEXT NOT NULL DEFAULT 'public',
    description TEXT,
    description_ta TEXT,
    rules TEXT,
    rules_ta TEXT,
    eligibility TEXT,
    eligibility_ta TEXT,
    banner_url TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    project_id UUID REFERENCES dt_projects(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES dt_campaigns(id) ON DELETE SET NULL,
    registration_start_date TIMESTAMP WITH TIME ZONE,
    registration_end_date TIMESTAMP WITH TIME ZONE,
    submission_start_date TIMESTAMP WITH TIME ZONE,
    submission_end_date TIMESTAMP WITH TIME ZONE,
    voting_start_date TIMESTAMP WITH TIME ZONE,
    voting_end_date TIMESTAMP WITH TIME ZONE,
    max_entries_per_participant INTEGER DEFAULT 1,
    allowed_formats JSONB DEFAULT '["image"]'::jsonb,
    max_file_size_mb INTEGER DEFAULT 50,
    winner_selection_method TEXT DEFAULT 'public_voting',
    tie_breaker_rule TEXT DEFAULT 'earliest_submission',
    status TEXT NOT NULL DEFAULT 'draft',
    rewards JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Competition Domains (for multi-subdomain/domain routing e.g. photo.guessme.co)
CREATE TABLE IF NOT EXISTS dt_competition_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Competition Registrations / Participants
CREATE TABLE IF NOT EXISTS dt_competition_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    user_id UUID,
    participant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    suspension_reason TEXT,
    social_profiles JSONB DEFAULT '{}'::jsonb,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_comp_reg_email UNIQUE (competition_id, email)
);

-- 4. Competition Submissions
CREATE TABLE IF NOT EXISTS dt_competition_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_no TEXT,
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES dt_competition_registrations(id) ON DELETE CASCADE,
    participant_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    extra_media JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    moderated_by UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    jury_score NUMERIC DEFAULT 0,
    rank INTEGER,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Competition Likes (Strict deduplication by submission_id + voter_email)
CREATE TABLE IF NOT EXISTS dt_competition_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES dt_competition_submissions(id) ON DELETE CASCADE,
    user_id UUID,
    voter_email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_comp_submission_like UNIQUE (submission_id, voter_email)
);

-- 6. Competition Comments
CREATE TABLE IF NOT EXISTS dt_competition_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES dt_competition_submissions(id) ON DELETE CASCADE,
    user_id UUID,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_avatar TEXT,
    comment_text TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 7. Competition Reports
CREATE TABLE IF NOT EXISTS dt_competition_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    reported_by_email TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    action_taken TEXT,
    reviewed_by UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Competition Winners
CREATE TABLE IF NOT EXISTS dt_competition_winners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    place INTEGER NOT NULL,
    prize_title TEXT NOT NULL,
    prize_amount TEXT,
    submission_id UUID REFERENCES dt_competition_submissions(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES dt_competition_registrations(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    final_likes INTEGER DEFAULT 0,
    final_score NUMERIC DEFAULT 0,
    announced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    published_by UUID REFERENCES crm_employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_comp_place UNIQUE (competition_id, place)
);

-- 9. Competition Activity Logs
CREATE TABLE IF NOT EXISTS dt_competition_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES dt_competitions(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    actor_name TEXT,
    actor_email TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON dt_competitions(slug);
CREATE INDEX IF NOT EXISTS idx_competitions_subdomain ON dt_competitions(subdomain);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON dt_competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_project_id ON dt_competitions(project_id);
CREATE INDEX IF NOT EXISTS idx_competitions_campaign_id ON dt_competitions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comp_domains_domain ON dt_competition_domains(domain);
CREATE INDEX IF NOT EXISTS idx_comp_reg_comp_id ON dt_competition_registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_reg_email ON dt_competition_registrations(email);
CREATE INDEX IF NOT EXISTS idx_comp_sub_comp_id ON dt_competition_submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_sub_reg_id ON dt_competition_submissions(registration_id);
CREATE INDEX IF NOT EXISTS idx_comp_sub_status ON dt_competition_submissions(status);
CREATE INDEX IF NOT EXISTS idx_comp_likes_sub_id ON dt_competition_likes(submission_id);
CREATE INDEX IF NOT EXISTS idx_comp_comments_sub_id ON dt_competition_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_comp_reports_comp_id ON dt_competition_reports(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_winners_comp_id ON dt_competition_winners(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_activity_comp_id ON dt_competition_activity_logs(competition_id);
