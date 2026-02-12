import { useEffect, useMemo, useState } from "react";
import { Search, Grid, List, SlidersHorizontal, BookOpen, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArtifactStore, useFilteredArtifacts } from "@/stores/artifactStore";
import { useUnifiedProjectStore } from "@/stores/unifiedProjectStore";
import { ArtifactCard, ArtifactListItem } from "./ArtifactCard";
import { LibraryFilters, ActiveFilterChips } from "./LibraryFilters";
import { StandardizedPreviewTabs } from "@/components/preview/PreviewTabs";
import { getObjectiveById } from "@/lib/curriculum";
import type { LibrarySortBy, LibraryViewMode, LocalArtifact } from "@/types";

const SORT_OPTIONS: { value: LibrarySortBy; label: string }[] = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
  { value: "grade", label: "By Grade" },
];

interface LibraryViewProps {
  onNavigateToObjective?: (objectiveId: string, subject?: string) => void;
}

export function LibraryView({ onNavigateToObjective }: LibraryViewProps = {}) {
  const {
    isLoading,
    error,
    viewMode,
    sortBy,
    searchQuery,
    currentArtifact,
    loadArtifacts,
    loadArtifact,
    deleteArtifact,
    setViewMode,
    setSortBy,
    setSearchQuery,
    setCurrentArtifact,
  } = useArtifactStore();

  const { loadProjects } = useUnifiedProjectStore();
  const filteredArtifacts = useFilteredArtifacts();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [siblingArtifacts, setSiblingArtifacts] = useState<LocalArtifact[]>([]);
  const linkedObjectiveId = currentArtifact?.objectiveId || null;
  const linkedObjective = useMemo(
    () => (linkedObjectiveId ? getObjectiveById(linkedObjectiveId) : null),
    [linkedObjectiveId]
  );

  // Load artifacts and projects on mount
  useEffect(() => {
    loadArtifacts();
    loadProjects();
  }, [loadArtifacts, loadProjects]);

  const handleView = async (artifactId: string) => {
    const artifact = await loadArtifact(artifactId);
    if (artifact?.jobId) {
      const siblings = await useArtifactStore.getState().loadArtifactsByJob(artifact.jobId);
      setSiblingArtifacts(siblings);
    } else {
      setSiblingArtifacts(artifact ? [artifact] : []);
    }
    setIsPreviewOpen(true);
  };

  const handlePrint = async (artifactId: string) => {
    const artifact = await loadArtifact(artifactId);
    if (!artifact) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${artifact.title}</title>
        <style>
          body {
            font-family: "Arial", sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1 { font-size: 24px; margin-bottom: 16px; }
          h2 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
          h3 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; }
          p { margin-bottom: 12px; }
          ul, ol { margin-bottom: 12px; padding-left: 24px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        ${artifact.htmlContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDelete = async (artifactId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteArtifact(artifactId);
    }
  };

  const handleEditTags = async (artifactId: string, tags: string[]) => {
    await useArtifactStore.getState().updateTags(artifactId, tags);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setCurrentArtifact(null);
    setSiblingArtifacts([]);
  };

  const handleNavigateToLinkedObjective = () => {
    if (!linkedObjectiveId || !onNavigateToObjective) return;
    onNavigateToObjective(linkedObjectiveId, linkedObjective?.subject || currentArtifact?.subject);
    handleClosePreview();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => loadArtifacts()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-muted-foreground">
            Browse all your generated teaching materials
          </p>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as LibrarySortBy)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Filter your library by project, grade, subject, or type
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <LibraryFilters onFilterChange={() => setIsFilterSheetOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters */}
      <ActiveFilterChips />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredArtifacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">No materials found</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Generate some teaching materials to see them here"}
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && filteredArtifacts.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {filteredArtifacts.length} item{filteredArtifacts.length !== 1 ? "s" : ""}
          </p>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredArtifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.artifactId}
                  artifact={artifact}
                  onView={handleView}
                  onPrint={handlePrint}
                  onDelete={handleDelete}
                  onEditTags={handleEditTags}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArtifacts.map((artifact) => (
                <ArtifactListItem
                  key={artifact.artifactId}
                  artifact={artifact}
                  onView={handleView}
                  onPrint={handlePrint}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{currentArtifact?.title || "Preview"}</DialogTitle>
            {linkedObjectiveId && (
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Linked objective</span>
                <button
                  type="button"
                  onClick={handleNavigateToLinkedObjective}
                  className="inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 text-left text-primary underline-offset-4 hover:underline"
                >
                  <span>
                    {linkedObjective
                      ? `${linkedObjective.objective.text} (${linkedObjective.subject} • ${linkedObjective.unit.title})`
                      : linkedObjectiveId}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <StandardizedPreviewTabs
              studentPageHtml={siblingArtifacts.find((a) => a.type === "student_page")?.htmlContent}
              teacherScriptHtml={siblingArtifacts.find((a) => a.type === "teacher_script")?.htmlContent}
              answerKeyHtml={siblingArtifacts.find((a) => a.type === "answer_key")?.htmlContent}
              lessonPlanHtml={siblingArtifacts.find((a) => a.type === "lesson_plan")?.htmlContent}
              projectTitle={currentArtifact?.title || "Preview"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
