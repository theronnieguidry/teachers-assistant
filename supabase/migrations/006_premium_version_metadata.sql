-- ============================================
-- Premium metadata columns for project_versions and projects
-- ============================================

-- Add premium metadata to project_versions
ALTER TABLE public.project_versions
    ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.worksheet_plans(id),
    ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);

-- Add check constraint for generation_mode (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_generation_mode'
    ) THEN
        ALTER TABLE public.project_versions
        ADD CONSTRAINT chk_generation_mode
        CHECK (generation_mode IN ('standard', 'premium_plan_pipeline'));
    END IF;
END $$;

-- Add visual_settings to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS visual_settings JSONB DEFAULT '{}';

-- Comment on columns for documentation
COMMENT ON COLUMN public.project_versions.generation_mode IS 'standard = legacy single-pass, premium_plan_pipeline = structured planner pipeline';
COMMENT ON COLUMN public.project_versions.plan_id IS 'Reference to worksheet_plans for premium generations';
COMMENT ON COLUMN public.project_versions.image_count IS 'Number of AI-generated images in this version';
COMMENT ON COLUMN public.project_versions.quality_score IS 'Quality gate score 0-100, must be >= 50 to charge credits';
COMMENT ON COLUMN public.projects.visual_settings IS 'JSON with imageCount, style, theme for premium generations';
