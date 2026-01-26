/**
 * Shared mock data for E2E tests
 *
 * This module consolidates all mock objects used across E2E tests.
 * Import these in fixture files or individual tests that need custom setups.
 */

// ============================================
// Authentication Mocks
// ============================================

export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

export const mockSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

// ============================================
// Learner Profile Mocks
// ============================================

export const mockLearnerProfile = {
  learnerId: "test-learner-1",
  displayName: "Test Learner",
  grade: "2",
  avatarEmoji: "\uD83E\uDD8A", // Fox emoji
  createdAt: new Date().toISOString(),
};

// ============================================
// Credits Mocks
// ============================================

export const mockCredits = {
  balance: 50,
  lifetime_granted: 50,
  lifetime_used: 0,
};

// ============================================
// Project Mocks
// ============================================

export const mockCompletedProject = {
  id: "project-completed",
  user_id: "test-user-id",
  title: "Addition Worksheet",
  description: null,
  prompt: "Create a math worksheet about addition",
  grade: "2",
  subject: "Math",
  options: { questionCount: 10, difficulty: "medium" },
  inspiration: [],
  output_path: null,
  status: "completed",
  error_message: null,
  credits_used: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

export const mockProjectVersion = {
  id: "version-1",
  project_id: "project-completed",
  worksheet_html: "<h1>Math Worksheet</h1><p>Question 1: 2 + 3 = ?</p>",
  lesson_plan_html: "<h1>Lesson Plan</h1><p>Objectives: Learn addition</p>",
  answer_key_html: "<h1>Answer Key</h1><p>1. 5</p>",
  ai_provider: "openai",
  ai_model: "gpt-4o",
  input_tokens: 500,
  output_tokens: 1000,
  created_at: new Date().toISOString(),
};

// ============================================
// Supabase Key (hardcoded for test environment)
// ============================================

/**
 * The Supabase localStorage key used for auth token storage.
 * Derived from the Supabase URL hostname.
 */
export const SUPABASE_AUTH_KEY = "sb-ugvrangptgrojipazqxh-auth-token";
