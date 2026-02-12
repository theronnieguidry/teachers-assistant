import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp, Clock, Users, GraduationCap, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWizardStore } from "@/stores/wizardStore";
import { classDetailsSchema, type ClassDetailsFormData } from "@/lib/validators";
import type { StudentProfileFlag, TeachingConfidence, LessonLength, ObjectiveRecommendation, Grade } from "@/types";
import { ObjectiveChooser } from "./ObjectiveChooser";
import { K6SoftLimitAlert } from "./K6SoftLimitAlert";

// Extended schema with title field (string, not enum)
const classDetailsWithTitleSchema = classDetailsSchema.extend({
  title: z.string().optional(),
});

// Standard grades (K-3) shown by default
const standardGrades = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st Grade" },
  { value: "2", label: "2nd Grade" },
  { value: "3", label: "3rd Grade" },
];

// Advanced grades (4-6) shown when toggle is enabled
const advancedGrades = [
  { value: "4", label: "4th Grade" },
  { value: "5", label: "5th Grade" },
  { value: "6", label: "6th Grade" },
];

const subjects = [
  "Math",
  "Reading",
  "Writing",
  "Science",
  "Social Studies",
  "Art",
  "Music",
  "Physical Education",
];

// Lesson plan specific options (Issue #17)
const lessonLengthOptions: { value: LessonLength; label: string }[] = [
  { value: 15, label: "15 minutes (Quick)" },
  { value: 30, label: "30 minutes (Standard)" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const studentProfileOptions: { value: StudentProfileFlag; label: string; description: string }[] = [
  { value: "needs_movement", label: "Needs movement breaks", description: "Student benefits from physical activity" },
  { value: "struggles_reading", label: "Struggles with reading", description: "Needs simpler text and more visuals" },
  { value: "easily_frustrated", label: "Easily frustrated", description: "Benefits from scaffolding and encouragement" },
  { value: "advanced", label: "Advanced learner", description: "Ready for challenge activities" },
  { value: "ell", label: "English language learner", description: "Needs vocabulary support" },
];

const teachingConfidenceOptions: { value: TeachingConfidence; label: string; description: string }[] = [
  { value: "novice", label: "I'm new to teaching", description: "Include detailed teacher script" },
  { value: "intermediate", label: "I've done some teaching", description: "Include helpful prompts" },
  { value: "experienced", label: "I'm a teacher", description: "Standard lesson format" },
];

export function ClassDetailsStep() {
  const { classDetails, setClassDetails, nextStep, title, setTitle, setPrompt, prompt } =
    useWizardStore();

  // Check if current grade is advanced (4-6) to auto-show advanced toggle
  const isAdvancedGrade = classDetails?.grade && ["4", "5", "6"].includes(classDetails.grade);
  const [showAdvancedGrades, setShowAdvancedGrades] = useState(isAdvancedGrade);

  // "Help me choose" state - only show for K-3 which has curriculum packs
  const [needsObjectiveHelp, setNeedsObjectiveHelp] = useState(false);
  // Keep lesson plan extras collapsed by default so primary actions stay reachable.
  const [lessonOptionsExpanded, setLessonOptionsExpanded] = useState(false);

  // Combine grades based on toggle state
  const grades = showAdvancedGrades
    ? [...standardGrades, ...advancedGrades]
    : standardGrades;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassDetailsFormData & { title: string }>({
    resolver: zodResolver(classDetailsWithTitleSchema),
    defaultValues: {
      title: title,
      grade: classDetails?.grade || "2",
      subject: classDetails?.subject || "",
      format: classDetails?.format || "both",
      questionCount: classDetails?.questionCount || 10,
      includeVisuals: classDetails?.includeVisuals ?? true,
      difficulty: classDetails?.difficulty || "medium",
      includeAnswerKey: classDetails?.includeAnswerKey ?? true,
      // Lesson plan defaults (Issue #17)
      lessonLength: classDetails?.lessonLength || 30,
      studentProfile: classDetails?.studentProfile || [],
      teachingConfidence: classDetails?.teachingConfidence || "intermediate",
    },
  });

  // Watch format to show/hide lesson plan options
  const watchedFormat = useWatch({ control, name: "format" });
  const showLessonPlanOptions = watchedFormat === "lesson_plan" || watchedFormat === "both";

  useEffect(() => {
    if (!showLessonPlanOptions) {
      setLessonOptionsExpanded(false);
    }
  }, [showLessonPlanOptions]);

  // Watch grade and subject for ObjectiveChooser
  const watchedGrade = useWatch({ control, name: "grade" });
  const watchedSubject = useWatch({ control, name: "subject" });

  // Check if grade is K-3 (curriculum packs only cover K-3)
  const hasObjectivePacks = ["K", "1", "2", "3"].includes(watchedGrade);

  // Handle objective selection from ObjectiveChooser
  const handleObjectiveSelect = (objective: ObjectiveRecommendation) => {
    setPrompt(objective.text);
    setNeedsObjectiveHelp(false);
  };

  const onSubmit = (data: ClassDetailsFormData & { title: string }) => {
    setTitle(data.title || title);
    setClassDetails({
      grade: data.grade,
      subject: data.subject,
      format: data.format,
      questionCount: data.questionCount,
      includeVisuals: data.includeVisuals,
      difficulty: data.difficulty,
      includeAnswerKey: data.includeAnswerKey,
      // Lesson plan fields (Issue #17)
      lessonLength: data.lessonLength || 30,
      studentProfile: data.studentProfile || [],
      teachingConfidence: data.teachingConfidence || "intermediate",
    });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="My Math Worksheet"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Grade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Grade Level *</Label>
            <button
              type="button"
              onClick={() => setShowAdvancedGrades(!showAdvancedGrades)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {showAdvancedGrades ? (
                <>
                  Hide 4-6
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show 4-6
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
          <Controller
            name="grade"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.grade && (
            <p className="text-sm text-destructive">{errors.grade.message}</p>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.subject && (
            <p className="text-sm text-destructive">{errors.subject.message}</p>
          )}
        </div>
      </div>

      <K6SoftLimitAlert grade={watchedGrade} />

      {/* Help me choose - shown for K-3 grades with a selected subject */}
      {hasObjectivePacks && watchedSubject && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <Label htmlFor="help-me-choose" className="text-sm cursor-pointer">
                I don&apos;t know what to teach next
              </Label>
            </div>
            <Switch
              id="help-me-choose"
              checked={needsObjectiveHelp}
              onCheckedChange={setNeedsObjectiveHelp}
            />
          </div>

          {needsObjectiveHelp && (
            <ObjectiveChooser
              grade={watchedGrade as Grade}
              subject={watchedSubject}
              onSelect={handleObjectiveSelect}
              onCancel={() => setNeedsObjectiveHelp(false)}
            />
          )}

          {/* Show current prompt if one is set */}
          {!needsObjectiveHelp && prompt && (
            <div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded">
              <span className="font-medium">Current topic:</span> {prompt}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Format */}
        <div className="space-y-2">
          <Label>Format</Label>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Worksheet + Lesson Plan</SelectItem>
                  <SelectItem value="worksheet">Worksheet Only</SelectItem>
                  <SelectItem value="lesson_plan">Lesson Plan Only</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Controller
            name="difficulty"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Question Count */}
      <div className="space-y-2">
        <Label htmlFor="questionCount">Number of Questions</Label>
        <Input
          id="questionCount"
          type="number"
          min={5}
          max={20}
          {...register("questionCount", { valueAsNumber: true })}
        />
      </div>

      {/* Lesson Plan Options - shown when format includes lesson_plan (Issue #17) */}
      {showLessonPlanOptions && (
        <div className="space-y-3 pt-3 border-t">
          <button
            type="button"
            onClick={() => setLessonOptionsExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-left"
            data-testid="lesson-options-toggle"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              Lesson Plan Options
            </div>
            {lessonOptionsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {lessonOptionsExpanded && (
            <div className="space-y-3" data-testid="lesson-options-content">
              {/* Lesson Length + Teaching Confidence (stacked for readability) */}
              <div className="space-y-4" data-testid="lesson-options-layout">
                <div className="space-y-2" data-testid="lesson-length-section">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Lesson Length
                  </Label>
                  <Controller
                    name="lessonLength"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v) as LessonLength)}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select length" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessonLengthOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Teaching Confidence */}
                <div className="space-y-2" data-testid="teaching-confidence-section">
                  <Label>Your Teaching Experience</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose the level of scaffolding you want in the lesson plan.
                  </p>
                  <Controller
                    name="teachingConfidence"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-2 rounded-md border bg-muted/20 p-3"
                      >
                        {teachingConfidenceOptions.map((opt) => (
                          <div key={opt.value} className="flex items-start space-x-2">
                            <RadioGroupItem value={opt.value} id={`confidence-${opt.value}`} className="mt-0.5" />
                            <Label
                              htmlFor={`confidence-${opt.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-muted-foreground text-xs block">{opt.description}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </div>
              </div>

              {/* Student Profile */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Student Profile (optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select any that apply to help tailor the lesson
                </p>
                <Controller
                  name="studentProfile"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {studentProfileOptions.map((opt) => {
                        const isChecked = field.value?.includes(opt.value) || false;
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                              isChecked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValue = e.target.checked
                                  ? [...(field.value || []), opt.value]
                                  : (field.value || []).filter((v) => v !== opt.value);
                                field.onChange(newValue);
                              }}
                              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm">
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-muted-foreground text-xs block">{opt.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("includeVisuals")}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Include images/illustrations</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("includeAnswerKey")}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Generate answer key</span>
        </label>
      </div>

      <div
        className="sticky bottom-0 -mx-1 border-t bg-background/95 px-1 pb-1 pt-3 backdrop-blur"
        data-testid="class-details-footer"
      >
        <div className="flex justify-end">
        <Button type="submit">Next</Button>
        </div>
      </div>
    </form>
  );
}
