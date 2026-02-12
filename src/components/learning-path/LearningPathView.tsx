import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObjectiveCard } from "./ObjectiveCard";
import { MasteryBadge } from "./MasteryBadge";
import { useLearnerStore } from "@/stores/learnerStore";
import {
  getUnitsForGrade,
  getSubjects,
  getSubjectProgress,
  getAllSubjectProgress,
  getObjectiveById,
} from "@/lib/curriculum";
import type { MasteryState, CurriculumUnit } from "@/types";
import {
  Filter,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Calculator,
  PenTool,
  Microscope,
  Globe,
} from "lucide-react";

interface LearningPathViewProps {
  initialSubject?: string;
  highlightObjectiveId?: string | null;
}

type MasteryFilter = "all" | MasteryState;

const subjectIcons: Record<string, typeof BookOpen> = {
  Math: Calculator,
  Reading: BookOpen,
  Writing: PenTool,
  Science: Microscope,
  "Social Studies": Globe,
};

export function LearningPathView({
  initialSubject,
  highlightObjectiveId = null,
}: LearningPathViewProps) {
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || "Math");
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // Select raw state to avoid infinite loops
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const masteryData = useLearnerStore((state) => state.masteryData);
  const loadMastery = useLearnerStore((state) => state.loadMastery);

  // Compute derived values with useMemo
  const activeProfile = useMemo(() => {
    if (!activeLearnerId) return null;
    return profiles.find((p) => p.learnerId === activeLearnerId) || null;
  }, [profiles, activeLearnerId]);

  const allProgress = useMemo(() => {
    if (!activeProfile) return [];
    return getAllSubjectProgress(activeProfile.grade, masteryData);
  }, [activeProfile, masteryData]);

  // Update subject when initialSubject changes
  useEffect(() => {
    if (initialSubject) {
      setSelectedSubject(initialSubject);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (!highlightObjectiveId || !activeProfile) return;

    const objectiveInfo = getObjectiveById(highlightObjectiveId);
    if (!objectiveInfo) return;

    if (objectiveInfo.subject !== selectedSubject) {
      setSelectedSubject(objectiveInfo.subject);
    }

    setMasteryFilter("all");
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      next.add(objectiveInfo.unit.unitId);
      return next;
    });

    if (typeof window === "undefined") return;

    const selector = `[data-objective-id="${highlightObjectiveId}"]`;
    const tryScroll = (attempt = 0) => {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement) {
        if (typeof element.scrollIntoView === "function") {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (attempt < 8) {
        window.setTimeout(() => tryScroll(attempt + 1), 80);
      }
    };

    window.setTimeout(() => tryScroll(), 50);
  }, [highlightObjectiveId, activeProfile, selectedSubject]);

  // Load mastery when profile changes
  useEffect(() => {
    if (activeLearnerId) {
      loadMastery(activeLearnerId);
    }
  }, [activeLearnerId, loadMastery]);

  const subjects = getSubjects();
  const units = activeProfile
    ? getUnitsForGrade(selectedSubject, activeProfile.grade)
    : [];
  const currentProgress = activeProfile
    ? getSubjectProgress(selectedSubject, activeProfile.grade, masteryData)
    : null;

  const getMasteryState = (objectiveId: string): MasteryState => {
    return masteryData?.objectives?.[objectiveId]?.state || "not_started";
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  // Filter objectives within units
  const getFilteredObjectives = (unit: CurriculumUnit) => {
    if (masteryFilter === "all") {
      return unit.objectives;
    }
    return unit.objectives.filter(
      (obj) => getMasteryState(obj.id) === masteryFilter
    );
  };

  // Count objectives by filter
  const countByFilter = (filter: MasteryFilter) => {
    if (filter === "all") {
      return units.reduce((sum, u) => sum + u.objectives.length, 0);
    }
    return units.reduce(
      (sum, u) =>
        sum + u.objectives.filter((obj) => getMasteryState(obj.id) === filter).length,
      0
    );
  };

  if (!activeProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">
              Select a learner to view their learning path.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SubjectIcon = subjectIcons[selectedSubject] || BookOpen;

  return (
    <div className="space-y-6">
      {/* Header with subject tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SubjectIcon className="h-6 w-6" />
            {selectedSubject} Learning Path
          </h1>
          <p className="text-muted-foreground mt-1">
            Grade {activeProfile.grade} curriculum for {activeProfile.displayName}
          </p>
        </div>

        {/* Progress summary */}
        {currentProgress && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {currentProgress.percentComplete}%
            </div>
            <div className="text-sm text-muted-foreground">
              {currentProgress.mastered} of {currentProgress.totalObjectives} mastered
            </div>
          </div>
        )}
      </div>

      {/* Subject tabs */}
      <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {subjects.map((subject) => {
            const Icon = subjectIcons[subject] || BookOpen;
            const progress = allProgress.find((p) => p.subject === subject);
            return (
              <TabsTrigger
                key={subject}
                value={subject}
                className="gap-2 min-w-max"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{subject}</span>
                {progress && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({progress.percentComplete}%)
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {subjects.map((subject) => (
          <TabsContent key={subject} value={subject} className="mt-6">
            {/* Filter bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "not_started", label: "Not Started" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "needs_review", label: "Needs Review" },
                    { value: "mastered", label: "Mastered" },
                  ] as { value: MasteryFilter; label: string }[]
                ).map(({ value, label }) => {
                  const count = countByFilter(value);
                  return (
                    <Button
                      key={value}
                      variant={masteryFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMasteryFilter(value)}
                      className="gap-1"
                    >
                      {value !== "all" && (
                        <MasteryBadge state={value as MasteryState} size="sm" />
                      )}
                      <span>{label}</span>
                      <span className="text-xs opacity-70">({count})</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Units and objectives */}
            <div className="space-y-4">
              {units.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No curriculum available for Grade {activeProfile.grade} {subject}
                  </CardContent>
                </Card>
              ) : (
                units.map((unit) => {
                  const filteredObjectives = getFilteredObjectives(unit);
                  const isExpanded = expandedUnits.has(unit.unitId);
                  const masteredCount = unit.objectives.filter(
                    (obj) => getMasteryState(obj.id) === "mastered"
                  ).length;

                  // Skip units with no matching objectives
                  if (masteryFilter !== "all" && filteredObjectives.length === 0) {
                    return null;
                  }

                  return (
                    <Card key={unit.unitId}>
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleUnit(unit.unitId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-lg">{unit.title}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {masteredCount} of {unit.objectives.length} skills
                                mastered
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              {unit.objectives.slice(0, 5).map((obj) => (
                                <MasteryBadge
                                  key={obj.id}
                                  state={getMasteryState(obj.id)}
                                  size="sm"
                                />
                              ))}
                              {unit.objectives.length > 5 && (
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                                  +{unit.objectives.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {filteredObjectives.map((objective) => (
                              <ObjectiveCard
                                key={objective.id}
                                objective={objective}
                                unit={unit}
                                subject={subject}
                                masteryState={getMasteryState(objective.id)}
                                highlighted={highlightObjectiveId === objective.id}
                              />
                            ))}
                          </div>
                          {filteredObjectives.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                              No objectives match the current filter
                            </p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
