import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Add any provider-specific options here
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything
export * from "@testing-library/react";
export { customRender as render, userEvent };

// Test data factories
export const createMockProject = (overrides = {}) => ({
  id: `project-${Math.random().toString(36).substr(2, 9)}`,
  userId: "user-123",
  title: "Test Project",
  description: null,
  prompt: "Create a math worksheet",
  grade: "2" as const,
  subject: "Math",
  options: {},
  inspiration: [],
  outputPath: null,
  status: "pending" as const,
  errorMessage: null,
  creditsUsed: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  completedAt: null,
  ...overrides,
});

export const createMockInspirationItem = (overrides = {}) => ({
  id: `insp-${Math.random().toString(36).substr(2, 9)}`,
  type: "url" as const,
  title: "Example Website",
  sourceUrl: "https://example.com",
  content: undefined,
  storagePath: undefined,
  ...overrides,
});

export const createMockUserProfile = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  ...overrides,
});

export const createMockCredits = (overrides = {}) => ({
  balance: 50,
  lifetimeGranted: 50,
  lifetimeUsed: 0,
  ...overrides,
});

// Wait utilities
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
