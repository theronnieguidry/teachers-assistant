-- ============================================
-- TA (Teacher's Assistant) - Initial Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- CREDITS TABLE
-- ============================================
CREATE TABLE public.credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_granted INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Credits policies (read-only for users, service role for modifications)
CREATE POLICY "Users can view own credits"
    ON public.credits FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- CREDIT TRANSACTIONS TABLE (audit log)
-- ============================================
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive = grant, negative = usage
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('trial_grant', 'purchase', 'generation', 'refund')),
    description TEXT,
    project_id UUID, -- optional reference to project
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project metadata
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL, -- original user prompt

    -- Classification
    grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6')),
    subject TEXT NOT NULL,

    -- Generation options (stored as JSONB for flexibility)
    options JSONB DEFAULT '{}',

    -- Inspiration references (stored as JSONB array)
    inspiration JSONB DEFAULT '[]',

    -- Output folder path (local filesystem)
    output_path TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,

    -- Credits used for this project
    credits_used INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- ============================================
-- PROJECT VERSIONS TABLE (for regeneration history)
-- ============================================
CREATE TABLE public.project_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Generated content (stored as HTML)
    worksheet_html TEXT,
    lesson_plan_html TEXT,
    answer_key_html TEXT,

    -- AI metadata
    ai_provider TEXT, -- 'claude' or 'openai'
    ai_model TEXT,    -- e.g., 'claude-3-5-sonnet-20241022'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, version_number)
);

-- Enable RLS
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project versions"
    ON public.project_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_versions.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project versions"
    ON public.project_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_versions.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Index for faster queries
CREATE INDEX idx_versions_project_id ON public.project_versions(project_id);

-- ============================================
-- INSPIRATION ITEMS TABLE (reusable inspiration)
-- ============================================
CREATE TABLE public.inspiration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Item metadata
    type TEXT NOT NULL CHECK (type IN ('url', 'pdf', 'image', 'text')),
    title TEXT,
    source_url TEXT,

    -- Content (for small items like extracted text)
    content TEXT,

    -- Storage reference (for uploaded files)
    storage_path TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inspiration_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inspiration"
    ON public.inspiration_items FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to create profile and credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);

    -- Grant trial credits (50 credits)
    INSERT INTO public.credits (user_id, balance, lifetime_granted)
    VALUES (NEW.id, 50, 50);

    -- Log the transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 50, 'trial_grant', 'Welcome trial credits');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reserve credits (called by generation API)
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT balance INTO current_balance
    FROM public.credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if sufficient credits
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct credits
    UPDATE public.credits
    SET
        balance = balance - p_amount,
        lifetime_used = lifetime_used + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, project_id)
    VALUES (p_user_id, -p_amount, 'generation', 'Teacher Pack generation', p_project_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund credits (on generation failure)
CREATE OR REPLACE FUNCTION public.refund_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_project_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Refund credits
    UPDATE public.credits
    SET
        balance = balance + p_amount,
        lifetime_used = lifetime_used - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log refund transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, project_id)
    VALUES (p_user_id, p_amount, 'refund', 'Generation failed - credits refunded', p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_credits_updated_at
    BEFORE UPDATE ON public.credits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
