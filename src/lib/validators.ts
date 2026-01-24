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
});

export const projectPromptSchema = z.object({
  prompt: z
    .string()
    .min(10, "Please describe what you want to create (at least 10 characters)")
    .max(1000, "Description is too long (max 1000 characters)"),
  title: z.string().min(1, "Please enter a title").max(100),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ClassDetailsFormData = z.infer<typeof classDetailsSchema>;
export type ProjectPromptFormData = z.infer<typeof projectPromptSchema>;
