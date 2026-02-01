import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Lesson plan specific schemas (Issue #17)
export const studentProfileFlagSchema = z.enum([
  "needs_movement",
  "struggles_reading",
  "easily_frustrated",
  "advanced",
  "ell",
]);

export const teachingConfidenceSchema = z.enum([
  "novice",
  "intermediate",
  "experienced",
]);

export const lessonLengthSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);

export const classDetailsSchema = z.object({
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6"], {
    required_error: "Please select a grade level",
  }),
  subject: z.string().min(1, "Please select a subject"),
  format: z.enum(["worksheet", "lesson_plan", "both"]).default("both"),
  questionCount: z.number().min(5).max(20).default(10),
  includeVisuals: z.boolean().default(true),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  includeAnswerKey: z.boolean().default(true),
  // Lesson plan specific options (Issue #17)
  lessonLength: lessonLengthSchema.optional().default(30),
  studentProfile: z.array(studentProfileFlagSchema).optional().default([]),
  teachingConfidence: teachingConfidenceSchema.optional().default("intermediate"),
});

export const projectPromptSchema = z.object({
  prompt: z
    .string()
    .min(10, "Please describe what you want to create (at least 10 characters)")
    .max(1000, "Description is too long (max 1000 characters)"),
  title: z.string().min(1, "Please enter a title").max(100),
});

export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature"], {
    required_error: "Please select a feedback type",
  }),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title is too long (max 100 characters)"),
  description: z
    .string()
    .min(20, "Please provide more details (at least 20 characters)")
    .max(2000, "Description is too long (max 2000 characters)"),
  contactEmail: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal("")),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ClassDetailsFormData = z.infer<typeof classDetailsSchema>;
export type ProjectPromptFormData = z.infer<typeof projectPromptSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
export type StudentProfileFlag = z.infer<typeof studentProfileFlagSchema>;
export type TeachingConfidence = z.infer<typeof teachingConfidenceSchema>;
export type LessonLength = z.infer<typeof lessonLengthSchema>;
