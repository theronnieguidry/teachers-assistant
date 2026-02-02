/**
 * ObjectiveChooser Component
 *
 * "Help me choose" feature that displays recommended learning objectives
 * from curriculum packs and allows the user to select one to use as their prompt.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Lightbulb, BookOpen, Clock, AlertCircle } from "lucide-react";
import type { ObjectiveRecommendation, Grade } from "@/types";
import { getRecommendedObjectives, searchObjectives } from "@/services/generation-api";
import { useAuthStore } from "@/stores/authStore";

interface ObjectiveChooserProps {
  grade: Grade;
  subject: string;
  onSelect: (objective: ObjectiveRecommendation) => void;
  onCancel?: () => void;
}

export function ObjectiveChooser({
  grade,
  subject,
  onSelect,
  onCancel,
}: ObjectiveChooserProps) {
  const [objectives, setObjectives] = useState<ObjectiveRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { session } = useAuthStore();

  // Fetch recommended objectives on mount or when grade/subject changes
  useEffect(() => {
    async function fetchObjectives() {
      if (!grade || !subject || !session?.access_token) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await getRecommendedObjectives(
          grade,
          subject,
          session.access_token,
          { count: 5 }
        );
        setObjectives(results);
      } catch (err) {
        console.error("Failed to fetch objectives:", err);
        setError("Failed to load learning objectives. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchObjectives();
  }, [grade, subject, session?.access_token]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !session?.access_token) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchObjectives(
        subject,
        searchQuery,
        session.access_token,
        grade
      );
      setObjectives(results);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, subject, grade, session?.access_token]);

  // Clear search and reload recommendations
  const handleClearSearch = useCallback(async () => {
    setSearchQuery("");
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const results = await getRecommendedObjectives(
        grade,
        subject,
        session.access_token,
        { count: 5 }
      );
      setObjectives(results);
    } catch (err) {
      console.error("Failed to reload objectives:", err);
    } finally {
      setLoading(false);
    }
  }, [grade, subject, session?.access_token]);

  // Get badge variant based on difficulty
  const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "outline" => {
    switch (difficulty) {
      case "easy":
        return "secondary";
      case "challenge":
        return "default";
      default:
        return "outline";
    }
  };

  // Get difficulty label
  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "Foundation";
      case "standard":
        return "Standard";
      case "challenge":
        return "Challenge";
      default:
        return difficulty;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span>Choose a learning objective for your lesson:</span>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="pl-9"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
        {searchQuery && (
          <Button variant="ghost" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && objectives.length === 0 && !error && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No curriculum objectives available for Grade {grade} {subject}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different subject or enter your own topic below.
          </p>
        </div>
      )}

      {/* Objectives list */}
      {!loading && objectives.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {objectives.map((objective) => (
            <Card
              key={objective.id}
              className="cursor-pointer transition-colors hover:border-primary hover:bg-accent/50"
              onClick={() => onSelect(objective)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-tight">
                      {objective.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {objective.unitTitle}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{objective.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {objective.whyRecommended}
                    </p>
                  </div>
                  <Badge variant={getDifficultyVariant(objective.difficulty)}>
                    {getDifficultyLabel(objective.difficulty)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            I&apos;ll write my own topic
          </Button>
        </div>
      )}
    </div>
  );
}
