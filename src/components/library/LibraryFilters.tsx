import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArtifactStore } from "@/stores/artifactStore";
import { useUnifiedProjectStore } from "@/stores/unifiedProjectStore";
import type { Grade, ArtifactType, LibraryFilters as LibraryFiltersType } from "@/types";
import { getArtifactTypeLabel } from "@/types";
import { SUBJECTS } from "@/types/learner";

const GRADES: Grade[] = ["K", "1", "2", "3", "4", "5", "6"];

const ARTIFACT_TYPES: ArtifactType[] = [
  "student_page",
  "teacher_script",
  "answer_key",
  "lesson_plan",
  "print_pack",
];

interface LibraryFiltersProps {
  onFilterChange?: () => void;
}

export function LibraryFilters({ onFilterChange }: LibraryFiltersProps) {
  const { filters, setFilters, clearFilters } = useArtifactStore();
  const { projects } = useUnifiedProjectStore();

  const hasFilters =
    filters.grades.length > 0 ||
    filters.subjects.length > 0 ||
    filters.types.length > 0 ||
    filters.projects.length > 0;

  const toggleGrade = (grade: Grade) => {
    const newGrades = filters.grades.includes(grade)
      ? filters.grades.filter((g) => g !== grade)
      : [...filters.grades, grade];
    setFilters({ grades: newGrades });
    onFilterChange?.();
  };

  const toggleSubject = (subject: string) => {
    const newSubjects = filters.subjects.includes(subject)
      ? filters.subjects.filter((s) => s !== subject)
      : [...filters.subjects, subject];
    setFilters({ subjects: newSubjects });
    onFilterChange?.();
  };

  const toggleType = (type: ArtifactType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ types: newTypes });
    onFilterChange?.();
  };

  const setProject = (projectId: string) => {
    if (projectId === "all") {
      setFilters({ projects: [] });
    } else {
      setFilters({ projects: [projectId] });
    }
    onFilterChange?.();
  };

  const handleClearFilters = () => {
    clearFilters();
    onFilterChange?.();
  };

  return (
    <div className="space-y-4">
      {/* Project Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Project</label>
        <Select
          value={filters.projects[0] || "all"}
          onValueChange={setProject}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.projectId} value={project.projectId}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grade Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Grade</label>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((grade) => (
            <Badge
              key={grade}
              variant={filters.grades.includes(grade) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleGrade(grade)}
            >
              {grade === "K" ? "K" : grade}
            </Badge>
          ))}
        </div>
      </div>

      {/* Subject Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Subject</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => (
            <Badge
              key={subject}
              variant={filters.subjects.includes(subject) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleSubject(subject)}
            >
              {subject}
            </Badge>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {ARTIFACT_TYPES.map((type) => (
            <Badge
              key={type}
              variant={filters.types.includes(type) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleType(type)}
            >
              {getArtifactTypeLabel(type)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleClearFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

// Compact inline filter chips for display above results
export function ActiveFilterChips() {
  const { filters, setFilters } = useArtifactStore();
  const { projects } = useUnifiedProjectStore();

  const removeGrade = (grade: Grade) => {
    setFilters({ grades: filters.grades.filter((g) => g !== grade) });
  };

  const removeSubject = (subject: string) => {
    setFilters({ subjects: filters.subjects.filter((s) => s !== subject) });
  };

  const removeType = (type: ArtifactType) => {
    setFilters({ types: filters.types.filter((t) => t !== type) });
  };

  const removeProject = (projectId: string) => {
    setFilters({ projects: filters.projects.filter((p) => p !== projectId) });
  };

  const hasFilters =
    filters.grades.length > 0 ||
    filters.subjects.length > 0 ||
    filters.types.length > 0 ||
    filters.projects.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.projects.map((projectId) => {
        const project = projects.find((p) => p.projectId === projectId);
        return (
          <Badge key={projectId} variant="secondary" className="gap-1">
            {project?.name || "Unknown Project"}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => removeProject(projectId)}
            />
          </Badge>
        );
      })}
      {filters.grades.map((grade) => (
        <Badge key={grade} variant="secondary" className="gap-1">
          Grade {grade}
          <X className="h-3 w-3 cursor-pointer" onClick={() => removeGrade(grade)} />
        </Badge>
      ))}
      {filters.subjects.map((subject) => (
        <Badge key={subject} variant="secondary" className="gap-1">
          {subject}
          <X className="h-3 w-3 cursor-pointer" onClick={() => removeSubject(subject)} />
        </Badge>
      ))}
      {filters.types.map((type) => (
        <Badge key={type} variant="secondary" className="gap-1">
          {getArtifactTypeLabel(type)}
          <X className="h-3 w-3 cursor-pointer" onClick={() => removeType(type)} />
        </Badge>
      ))}
    </div>
  );
}
