import { vi } from "vitest";

// Mock user data
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  aud: "authenticated",
  role: "authenticated",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockProfile = {
  id: "user-123",
  email: "test@example.com",
  display_name: "Test User",
  avatar_url: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockCredits = {
  id: "credits-123",
  user_id: "user-123",
  balance: 50,
  lifetime_granted: 50,
  lifetime_used: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockProject = {
  id: "project-123",
  user_id: "user-123",
  title: "Test Project",
  description: null,
  prompt: "Create a math worksheet",
  grade: "2",
  subject: "Math",
  options: {},
  inspiration: [],
  output_path: null,
  status: "pending",
  error_message: null,
  credits_used: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  completed_at: null,
};

// Create mock query builder
const createMockQueryBuilder = (data: unknown = null, error: Error | null = null) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };
  return builder;
};

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const authStateChangeCallbacks: Array<(event: string, session: unknown) => void> = [];

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: "https://accounts.google.com/oauth", provider: "google" },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn((callback) => {
        authStateChangeCallbacks.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      // Helper to trigger auth state change in tests
      _triggerAuthStateChange: (event: string, session: unknown) => {
        authStateChangeCallbacks.forEach((cb) => cb(event, session));
      },
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "profiles":
          return createMockQueryBuilder(mockProfile);
        case "credits":
          return createMockQueryBuilder(mockCredits);
        case "projects":
          return createMockQueryBuilder([mockProject]);
        default:
          return createMockQueryBuilder();
      }
    }),
  };
};

// Default mock instance
export const mockSupabase = createMockSupabaseClient();

// Mock the supabase service module
vi.mock("@/services/supabase", () => ({
  supabase: mockSupabase,
}));
