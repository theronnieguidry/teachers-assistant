-- ============================================
-- Add token tracking columns to project_versions
-- ============================================

-- Add input_tokens and output_tokens columns
ALTER TABLE public.project_versions
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;

-- Make version_number optional by setting a default
-- This allows the API to insert without specifying version_number
ALTER TABLE public.project_versions
ALTER COLUMN version_number SET DEFAULT 1;

-- Create a function to auto-increment version_number
CREATE OR REPLACE FUNCTION public.set_version_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version_number IS NULL THEN
        SELECT COALESCE(MAX(version_number), 0) + 1
        INTO NEW.version_number
        FROM public.project_versions
        WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set version_number before insert
DROP TRIGGER IF EXISTS set_version_number_trigger ON public.project_versions;
CREATE TRIGGER set_version_number_trigger
    BEFORE INSERT ON public.project_versions
    FOR EACH ROW EXECUTE FUNCTION public.set_version_number();
