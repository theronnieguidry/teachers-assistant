-- ============================================
-- Lesson Plan Enhancements
-- Issue #17: High-Quality Lesson Plan Generation
-- ============================================

-- Add new HTML columns for lesson plan artifacts
ALTER TABLE public.project_versions
    ADD COLUMN IF NOT EXISTS teacher_script_html TEXT,
    ADD COLUMN IF NOT EXISTS student_activity_html TEXT,
    ADD COLUMN IF NOT EXISTS materials_list_html TEXT;

-- Add lesson metadata for tracking generation options
ALTER TABLE public.project_versions
    ADD COLUMN IF NOT EXISTS lesson_metadata JSONB;

-- Update generation_mode constraint to include lesson plan pipeline
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_generation_mode'
    ) THEN
        ALTER TABLE public.project_versions DROP CONSTRAINT chk_generation_mode;
    END IF;

    -- Add updated constraint
    ALTER TABLE public.project_versions
    ADD CONSTRAINT chk_generation_mode
    CHECK (generation_mode IN ('standard', 'premium_plan_pipeline', 'premium_lesson_plan_pipeline'));
END $$;

-- Add lesson plan specific fields to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS lesson_settings JSONB DEFAULT '{}';

-- Add index for lesson plan queries
CREATE INDEX IF NOT EXISTS idx_project_versions_lesson_metadata
    ON public.project_versions USING GIN (lesson_metadata);

-- Add index for projects with lesson settings
CREATE INDEX IF NOT EXISTS idx_projects_lesson_settings
    ON public.projects USING GIN (lesson_settings);

-- Comments for documentation
COMMENT ON COLUMN public.project_versions.teacher_script_html IS 'HTML for teacher script (novice mode only)';
COMMENT ON COLUMN public.project_versions.student_activity_html IS 'HTML for student activity instructions (non-worksheet activities)';
COMMENT ON COLUMN public.project_versions.materials_list_html IS 'HTML for materials list needed for the lesson';
COMMENT ON COLUMN public.project_versions.lesson_metadata IS 'JSON with objective, lessonLength, teachingConfidence, studentProfile, sectionsGenerated';
COMMENT ON COLUMN public.projects.lesson_settings IS 'JSON with lessonLength, studentProfile, teachingConfidence for lesson plan generations';
