import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWizardStore } from "@/stores/wizardStore";
import { classDetailsSchema, type ClassDetailsFormData } from "@/lib/validators";

// Extended schema with title field (string, not enum)
const classDetailsWithTitleSchema = classDetailsSchema.extend({
  title: z.string().optional(),
});

const grades = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st Grade" },
  { value: "2", label: "2nd Grade" },
  { value: "3", label: "3rd Grade" },
  { value: "4", label: "4th Grade (Experimental)" },
  { value: "5", label: "5th Grade (Experimental)" },
  { value: "6", label: "6th Grade (Experimental)" },
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

export function ClassDetailsStep() {
  const { classDetails, setClassDetails, nextStep, title, setTitle } =
    useWizardStore();

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
    },
  });

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
    });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Label>Grade Level *</Label>
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

      <div className="flex justify-end pt-4">
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
