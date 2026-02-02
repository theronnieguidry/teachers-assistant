-- ============================================
-- Add image_stats JSONB column to project_versions
-- Issue #23: Persist image generation diagnostics
-- ============================================

ALTER TABLE public.project_versions
    ADD COLUMN IF NOT EXISTS image_stats JSONB;

-- GIN index for querying image stats (e.g., finding failed generations)
CREATE INDEX IF NOT EXISTS idx_project_versions_image_stats
    ON public.project_versions USING GIN (image_stats);

-- Documentation
COMMENT ON COLUMN public.project_versions.image_stats IS 'JSON with total, generated, cached, failed counts and optional relevance filtering stats';
