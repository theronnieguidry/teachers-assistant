import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import { toast } from "@/stores/toastStore";
import type { UserProfile, UserCredits } from "@/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  credits: UserCredits | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      credits: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        try {
          set({ isLoading: true });

          // Get initial session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (session?.user) {
            set({ user: session.user, session });
            await get().refreshCredits();
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            set({ user: session?.user ?? null, session });

            if (session?.user) {
              await get().refreshCredits();
            } else {
              set({ profile: null, credits: null });
            }
          });
        } catch (error) {
          console.error("Auth initialization error:", error);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          set({ user: data.user, session: data.session });
          await get().refreshCredits();
          toast.success("Welcome back!", "You have successfully signed in.");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Sign in failed";
          set({ error: message });
          toast.error("Sign in failed", message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            set({ user: data.user, session: data.session });
            await get().refreshCredits();
            toast.success(
              "Account created!",
              "Welcome! You've received 50 free credits to get started."
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Sign up failed";
          set({ error: message });
          toast.error("Sign up failed", message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          set({ user: null, session: null, profile: null, credits: null });
          toast.info("Signed out", "You have been signed out successfully.");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Sign out failed";
          set({ error: message });
          toast.error("Sign out failed", message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      refreshCredits: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Fetch profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, email, display_name, avatar_url")
            .eq("id", user.id)
            .single();

          if (profileData) {
            const profile = profileData as {
              id: string;
              email: string;
              display_name: string | null;
              avatar_url: string | null;
            };
            set({
              profile: {
                id: profile.id,
                email: profile.email,
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
              },
            });
          }

          // Fetch credits
          const { data: creditsData } = await supabase
            .from("credits")
            .select("balance, lifetime_granted, lifetime_used")
            .eq("user_id", user.id)
            .single();

          if (creditsData) {
            const credits = creditsData as {
              balance: number;
              lifetime_granted: number;
              lifetime_used: number;
            };
            set({
              credits: {
                balance: credits.balance,
                lifetimeGranted: credits.lifetime_granted,
                lifetimeUsed: credits.lifetime_used,
              },
            });
          }
        } catch (error) {
          console.error("Failed to refresh credits:", error);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "ta-auth-storage",
      partialize: () => ({}),
    }
  )
);
