import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLearnerStore } from "@/stores/learnerStore";
import { useWizardStore } from "@/stores/wizardStore";
import { SubjectProgressCard } from "./SubjectProgress";
import { MasteryBadge } from "./MasteryBadge";
import { CreateLearnerDialog } from "@/components/learner";
import {
  Play,
  FileText,
  Sparkles,
  BookOpen,
  Clock,
  UserPlus,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { useState } from "react";
import {
  getNextRecommendedObjective,
  getAllSubjectProgress,
} from "@/lib/curriculum";

interface TodayViewProps {
  onNavigateToLearningPath?: (subject?: string) => void;
}

export function TodayView({ onNavigateToLearningPath }: TodayViewProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Select primitive/stable state values directly
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const masteryData = useLearnerStore((state) => state.masteryData);
  const loadProfiles = useLearnerStore((state) => state.loadProfiles);
  const loadMastery = useLearnerStore((state) => state.loadMastery);
  const markObjectiveStarted = useLearnerStore((state) => state.markObjectiveStarted);

  // Compute derived values with useMemo to avoid infinite loops
  const activeProfile = useMemo(() => {
    if (!activeLearnerId) return null;
    return profiles.find((p) => p.learnerId === activeLearnerId) || null;
  }, [profiles, activeLearnerId]);

  const nextObjective = useMemo(() => {
    if (!activeProfile) return null;
    return getNextRecommendedObjective(activeProfile.grade, masteryData);
  }, [activeProfile, masteryData]);

  const allProgress = useMemo(() => {
    if (!activeProfile) return [];
    return getAllSubjectProgress(activeProfile.grade, masteryData);
  }, [activeProfile, masteryData]);

  const openWizardFromObjective = useWizardStore(
    (state) => state.openWizardFromObjective
  );
  const openWizardOneOffForLearner = useWizardStore(
    (state) => state.openWizardOneOffForLearner
  );

  // Load profiles and mastery on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (activeLearnerId) {
      loadMastery(activeLearnerId);
    }
  }, [activeLearnerId, loadMastery]);

  // No profiles - show welcome
  if (profiles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Learning Path!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Create a learner profile to get personalized lesson recommendations
              and track progress through the K-3 curriculum.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Your First Learner
            </Button>
          </CardContent>
        </Card>
        <CreateLearnerDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    );
  }

  // No active profile selected
  if (!activeProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Select a Learner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the learner switcher in the header to select who's learning
              today.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const greeting = getGreeting();
  const totalMastered = allProgress.reduce((sum, p) => sum + p.mastered, 0);
  const totalObjectives = allProgress.reduce((sum, p) => sum + p.totalObjectives, 0);
  const overallPercent =
    totalObjectives > 0 ? Math.round((totalMastered / totalObjectives) * 100) : 0;

  const handleStartLesson = async () => {
    if (!nextObjective || !activeProfile) return;

    openWizardFromObjective(
      {
        id: nextObjective.objective.id,
        text: nextObjective.objective.text,
        difficulty: nextObjective.objective.difficulty,
        estimatedMinutes: nextObjective.objective.estimatedMinutes,
        unitTitle: `${nextObjective.subject} - ${nextObjective.unit.title}`,
        whyRecommended: nextObjective.whyRecommended,
        vocabulary: nextObjective.objective.vocabulary,
        activities: nextObjective.objective.activities,
        misconceptions: nextObjective.objective.misconceptions,
      },
      activeProfile
    );

    await markObjectiveStarted(nextObjective.objective.id, nextObjective.subject);
  };

  const handlePractice = () => {
    if (!nextObjective || !activeProfile) return;

    openWizardFromObjective(
      {
        id: nextObjective.objective.id,
        text: nextObjective.objective.text,
        difficulty: nextObjective.objective.difficulty,
        estimatedMinutes: 15,
        unitTitle: `${nextObjective.subject} - ${nextObjective.unit.title}`,
        whyRecommended: "Quick practice",
        vocabulary: nextObjective.objective.vocabulary,
      },
      activeProfile,
      "worksheet"
    );
  };

  const handleCreateOneOff = () => {
    if (!activeProfile) return;
    openWizardOneOffForLearner(activeProfile, nextObjective?.subject);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {activeProfile.displayName}! {activeProfile.avatarEmoji}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ready for today's learning adventure?
        </p>
      </div>

      {/* Next Up Card */}
      {nextObjective ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium text-sm uppercase tracking-wide">
                Next Up
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <MasteryBadge state={nextObjective.masteryState} size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-medium">{nextObjective.objective.text}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {nextObjective.objective.estimatedMinutes} min
                  </span>
                  <span>Grade {nextObjective.unit.grade} {nextObjective.subject}</span>
                  <span className="capitalize">{nextObjective.objective.difficulty}</span>
                </div>
                {nextObjective.whyRecommended && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    {nextObjective.whyRecommended}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleStartLesson} className="gap-2">
                <Play className="h-4 w-4" />
                Start Lesson
              </Button>
              <Button variant="outline" onClick={handlePractice} className="gap-2">
                <FileText className="h-4 w-4" />
                Quick Practice
              </Button>
              <Button variant="secondary" onClick={handleCreateOneOff} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Create one-off
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-medium">All caught up!</h2>
            <p className="text-muted-foreground mt-2">
              Great work! Check the Learning Path for more skills to learn.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => onNavigateToLearningPath?.()}
            >
              Explore Learning Path
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={handleCreateOneOff}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create one-off
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalMastered} of {totalObjectives} skills mastered
            </span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Subject Progress */}
      <div>
        <h3 className="font-medium mb-3">Progress by Subject</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allProgress.map((progress) => (
            <SubjectProgressCard
              key={progress.subject}
              progress={progress}
              compact
              onClick={() => onNavigateToLearningPath?.(progress.subject)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
