import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

// User-facing provider types (not technical model names)
export type AiProvider = "premium" | "local";
export type ApiEndpointPreset = "local" | "staging" | "production" | "custom";

// Legacy provider types for migration
type LegacyAiProvider = "claude" | "openai" | "ollama";

interface EndpointState {
  apiEndpointPreset: ApiEndpointPreset;
  customApiEndpoint: string;
}

const DEFAULT_LOCAL_API_URL = "http://localhost:3001";
const DEFAULT_STAGING_API_URL =
  import.meta.env.VITE_GENERATION_API_URL_STAGING || "";
const DEFAULT_PRODUCTION_API_URL =
  import.meta.env.VITE_GENERATION_API_URL_PRODUCTION || "";

function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function resolveApiBaseUrlFromEndpointState(state: EndpointState): string {
  if (state.apiEndpointPreset === "custom") {
    const normalizedCustom = normalizeApiUrl(state.customApiEndpoint);
    return normalizedCustom || DEFAULT_LOCAL_API_URL;
  }

  if (state.apiEndpointPreset === "staging") {
    return normalizeApiUrl(DEFAULT_STAGING_API_URL || DEFAULT_LOCAL_API_URL);
  }

  if (state.apiEndpointPreset === "production") {
    return normalizeApiUrl(DEFAULT_PRODUCTION_API_URL || DEFAULT_LOCAL_API_URL);
  }

  return DEFAULT_LOCAL_API_URL;
}

export function isHostedApiBaseUrl(apiBaseUrl: string): boolean {
  try {
    const url = new URL(apiBaseUrl);
    const host = url.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local");
    return url.protocol === "https:" && !isLocalHost;
  } catch {
    return false;
  }
}

interface SettingsState {
  defaultAiProvider: AiProvider;
  apiEndpointPreset: ApiEndpointPreset;
  customApiEndpoint: string;
  allowPremiumOnLocalDev: boolean;
  setDefaultAiProvider: (provider: AiProvider) => void;
  setApiEndpointPreset: (preset: ApiEndpointPreset) => void;
  setCustomApiEndpoint: (url: string) => void;
  setAllowPremiumOnLocalDev: (enabled: boolean) => void;
  getResolvedApiBaseUrl: () => string;
}

// Custom storage adapter that handles migration from legacy provider values
const migratingStorage: PersistStorage<SettingsState> = {
  getItem: (name: string): StorageValue<SettingsState> | null => {
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);
      // Migrate legacy provider values
      if (parsed.state?.defaultAiProvider) {
        const legacy = parsed.state.defaultAiProvider as LegacyAiProvider | AiProvider;
        if (legacy === "claude" || legacy === "openai") {
          parsed.state.defaultAiProvider = "premium";
        } else if (legacy === "ollama") {
          parsed.state.defaultAiProvider = "local";
        }
      }

      // Add newly introduced endpoint settings defaults for old snapshots.
      if (!parsed.state?.apiEndpointPreset) {
        parsed.state.apiEndpointPreset = "local";
      }
      if (parsed.state?.customApiEndpoint === undefined) {
        parsed.state.customApiEndpoint = "";
      }
      if (parsed.state?.allowPremiumOnLocalDev === undefined) {
        parsed.state.allowPremiumOnLocalDev = false;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<SettingsState>) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      defaultAiProvider: "local", // Default to free option
      apiEndpointPreset: "local",
      customApiEndpoint: "",
      allowPremiumOnLocalDev: false,
      setDefaultAiProvider: (provider) => set({ defaultAiProvider: provider }),
      setApiEndpointPreset: (preset) => set({ apiEndpointPreset: preset }),
      setCustomApiEndpoint: (url) => set({ customApiEndpoint: normalizeApiUrl(url) }),
      setAllowPremiumOnLocalDev: (enabled) => set({ allowPremiumOnLocalDev: enabled }),
      getResolvedApiBaseUrl: () => {
        const state = get();
        return resolveApiBaseUrlFromEndpointState({
          apiEndpointPreset: state.apiEndpointPreset,
          customApiEndpoint: state.customApiEndpoint,
        });
      },
    }),
    {
      name: "ta-settings",
      storage: migratingStorage,
    }
  )
);
