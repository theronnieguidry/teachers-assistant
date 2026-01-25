-- ============================================
-- Create project_inspiration junction table
-- Enables many-to-many relationship between projects and inspiration_items
-- Inspiration items persist independently of projects
-- ============================================

-- Create junction table
CREATE TABLE public.project_inspiration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    inspiration_id UUID NOT NULL REFERENCES public.inspiration_items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, inspiration_id)
);

-- Enable RLS
ALTER TABLE public.project_inspiration ENABLE ROW LEVEL SECURITY;

-- RLS policy (access via project ownership)
CREATE POLICY "Users can view project inspiration"
    ON public.project_inspiration FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_inspiration.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert project inspiration"
    ON public.project_inspiration FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_inspiration.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete project inspiration"
    ON public.project_inspiration FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_inspiration.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Indexes for faster lookups
CREATE INDEX idx_project_inspiration_project_id ON public.project_inspiration(project_id);
CREATE INDEX idx_project_inspiration_inspiration_id ON public.project_inspiration(inspiration_id);
CREATE INDEX idx_inspiration_items_user_id ON public.inspiration_items(user_id);
