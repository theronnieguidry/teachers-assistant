import { create } from "zustand";
import { supabase } from "@/services/supabase";
import { toast } from "@/stores/toastStore";
import type { Project, ProjectStatus, Grade, InspirationItem, ProjectVersion, LessonMetadata } from "@/types";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  fetchProjectVersion: (projectId: string) => Promise<ProjectVersion | null>;
  fetchSpecificVersion: (projectId: string, versionId: string) => Promise<ProjectVersion | null>;
  fetchProjectInspiration: (projectId: string) => Promise<InspirationItem[]>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  updateProjectWithVersion: (
    projectId: string,
    status: ProjectStatus,
    version: Omit<ProjectVersion, "id" | "projectId" | "createdAt">
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  clearError: () => void;
}

interface CreateProjectData {
  title: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options?: Record<string, unknown>;
  inspiration?: InspirationItem[];
  inspirationIds?: string[]; // New: IDs of inspiration items to link
  outputPath?: string;
}

interface DbProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  prompt: string;
  grade: string;
  subject: string;
  options: Record<string, unknown>;
  inspiration: unknown[];
  output_path: string | null;
  status: string;
  error_message: string | null;
  credits_used: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface DbProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  worksheet_html: string | null;
  lesson_plan_html: string | null;
  answer_key_html: string | null;
  // New lesson plan fields (Issue #17)
  teacher_script_html: string | null;
  student_activity_html: string | null;
  materials_list_html: string | null;
  lesson_metadata: LessonMetadata | null;
  ai_provider: string | null;
  ai_model: string | null;
  created_at: string;
}

interface DbInspirationItem {
  id: string;
  user_id: string;
  type: "url" | "pdf" | "image" | "text";
  title: string | null;
  source_url: string | null;
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

interface ProjectInspirationJoin {
  position: number;
  inspiration_items: DbInspirationItem;
}

function mapDbInspirationToItem(item: DbInspirationItem): InspirationItem {
  return {
    id: item.id,
    userId: item.user_id,
    type: item.type,
    title: item.title || "",
    sourceUrl: item.source_url || undefined,
    content: item.content || undefined,
    storagePath: item.storage_path || undefined,
    createdAt: new Date(item.created_at),
  };
}

function mapDbVersionToVersion(v: DbProjectVersion): ProjectVersion {
  return {
    id: v.id,
    projectId: v.project_id,
    versionNumber: v.version_number,
    worksheetHtml: v.worksheet_html,
    lessonPlanHtml: v.lesson_plan_html,
    answerKeyHtml: v.answer_key_html,
    // New lesson plan fields (Issue #17)
    teacherScriptHtml: v.teacher_script_html,
    studentActivityHtml: v.student_activity_html,
    materialsListHtml: v.materials_list_html,
    lessonMetadata: v.lesson_metadata,
    aiProvider: v.ai_provider,
    aiModel: v.ai_model,
    createdAt: new Date(v.created_at),
  };
}

function mapDbProjectToProject(p: DbProject): Project {
  return {
    id: p.id,
    userId: p.user_id,
    title: p.title,
    description: p.description,
    prompt: p.prompt,
    grade: p.grade as Grade,
    subject: p.subject,
    options: p.options as Record<string, unknown>,
    inspiration: (p.inspiration || []) as InspirationItem[],
    outputPath: p.output_path,
    status: p.status as ProjectStatus,
    errorMessage: p.error_message,
    creditsUsed: p.credits_used,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
    completedAt: p.completed_at ? new Date(p.completed_at) : null,
  };
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projects = ((data || []) as DbProject[]).map(mapDbProjectToProject);
      set({ projects });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch projects";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  fetchProjectVersion: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No version found
          return null;
        }
        throw error;
      }

      const version = mapDbVersionToVersion(data as DbProjectVersion);

      // Update current project with version
      set((state) => ({
        currentProject:
          state.currentProject?.id === projectId
            ? { ...state.currentProject, latestVersion: version }
            : state.currentProject,
      }));

      return version;
    } catch (error) {
      console.error("Failed to fetch project version:", error);
      return null;
    }
  },

  fetchSpecificVersion: async (projectId, versionId) => {
    try {
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("id", versionId)
        .eq("project_id", projectId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No version found
          return null;
        }
        throw error;
      }

      const version = mapDbVersionToVersion(data as DbProjectVersion);

      // Update current project with this specific version
      set((state) => ({
        currentProject:
          state.currentProject?.id === projectId
            ? { ...state.currentProject, latestVersion: version }
            : state.currentProject,
      }));

      return version;
    } catch (error) {
      console.error("Failed to fetch specific version:", error);
      return null;
    }
  },

  fetchProjectInspiration: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from("project_inspiration")
        .select(`
          position,
          inspiration_items (*)
        `)
        .eq("project_id", projectId)
        .order("position");

      if (error) {
        console.error("Failed to fetch project inspiration:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map the joined data to InspirationItem[]
      const items = (data as unknown as ProjectInspirationJoin[])
        .filter((row) => row.inspiration_items)
        .map((row) => mapDbInspirationToItem(row.inspiration_items));

      return items;
    } catch (error) {
      console.error("Failed to fetch project inspiration:", error);
      return [];
    }
  },

  updateProjectWithVersion: async (projectId, status, version) => {
    try {
      set({ isLoading: true, error: null });

      // Get the next version number
      const { data: existingVersions } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersionNumber =
        existingVersions && existingVersions.length > 0
          ? (existingVersions[0] as { version_number: number }).version_number + 1
          : 1;

      // Insert new version
      const { data: newVersion, error: versionError } = await supabase
        .from("project_versions")
        .insert({
          project_id: projectId,
          version_number: nextVersionNumber,
          worksheet_html: version.worksheetHtml,
          lesson_plan_html: version.lessonPlanHtml,
          answer_key_html: version.answerKeyHtml,
          // New lesson plan fields (Issue #17)
          teacher_script_html: version.teacherScriptHtml,
          student_activity_html: version.studentActivityHtml,
          materials_list_html: version.materialsListHtml,
          lesson_metadata: version.lessonMetadata,
          ai_provider: version.aiProvider,
          ai_model: version.aiModel,
        } as never)
        .select()
        .single();

      if (versionError) throw versionError;

      // Update project status
      const { error: projectError } = await supabase
        .from("projects")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        } as never)
        .eq("id", projectId);

      if (projectError) throw projectError;

      const mappedVersion = mapDbVersionToVersion(newVersion as DbProjectVersion);

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                status,
                completedAt: status === "completed" ? new Date() : null,
                updatedAt: new Date(),
                latestVersion: mappedVersion,
              }
            : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? {
                ...state.currentProject,
                status,
                completedAt: status === "completed" ? new Date() : null,
                updatedAt: new Date(),
                latestVersion: mappedVersion,
              }
            : state.currentProject,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save project version";
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Keep inspiration in JSONB for backwards compatibility during transition
      const insertData = {
        user_id: user.id,
        title: data.title,
        prompt: data.prompt,
        grade: data.grade,
        subject: data.subject,
        options: data.options || {},
        inspiration: data.inspiration || [],
        output_path: data.outputPath,
        status: "pending",
      };

      const { data: newProject, error } = await supabase
        .from("projects")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      // Link inspiration items via junction table if IDs provided
      if (data.inspirationIds && data.inspirationIds.length > 0) {
        const junctionRecords = data.inspirationIds.map((inspirationId, index) => ({
          project_id: (newProject as DbProject).id,
          inspiration_id: inspirationId,
          position: index,
        }));

        const { error: junctionError } = await supabase
          .from("project_inspiration")
          .insert(junctionRecords as never);

        if (junctionError) {
          console.error("Failed to link inspiration items:", junctionError);
          // Don't throw - project was created successfully
        }
      }

      const project = mapDbProjectToProject(newProject as DbProject);

      set((state) => ({
        projects: [project, ...state.projects],
        currentProject: project,
      }));

      return project;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create project";
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.errorMessage !== undefined)
        updateData.error_message = data.errorMessage;
      if (data.creditsUsed !== undefined)
        updateData.credits_used = data.creditsUsed;
      if (data.completedAt !== undefined)
        updateData.completed_at = data.completedAt?.toISOString();

      const { error } = await supabase
        .from("projects")
        .update(updateData as never)
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
        ),
        currentProject:
          state.currentProject?.id === id
            ? { ...state.currentProject, ...data, updatedAt: new Date() }
            : state.currentProject,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update project";
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
      }));

      toast.success("Project deleted", "The project has been removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete project";
      set({ error: message });
      toast.error("Delete failed", message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
