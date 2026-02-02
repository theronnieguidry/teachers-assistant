-- ============================================
-- Worksheet Plans table for Premium Pipeline
-- ============================================

-- New table for structured worksheet plans
CREATE TABLE public.worksheet_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Structured plan (JSON matching WorksheetPlan interface)
    plan_json JSONB NOT NULL,

    -- Validation results
    validation_passed BOOLEAN DEFAULT false,
    validation_issues JSONB DEFAULT '[]',
    repair_attempted BOOLEAN DEFAULT false,

    -- Quality gate results
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    quality_issues JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, version_number)
);

-- Enable RLS
ALTER TABLE public.worksheet_plans ENABLE ROW LEVEL SECURITY;

-- Users can view their own worksheet plans
CREATE POLICY "Users can view own worksheet plans"
    ON public.worksheet_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = worksheet_plans.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Users can insert their own worksheet plans
CREATE POLICY "Users can insert own worksheet plans"
    ON public.worksheet_plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = worksheet_plans.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Index for faster queries
CREATE INDEX idx_worksheet_plans_project_id ON public.worksheet_plans(project_id);
