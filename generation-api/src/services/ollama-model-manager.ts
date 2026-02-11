/**
 * Ollama Local Model Manager
 *
 * Startup warmup and readiness state for backend-managed local model selection.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_PRIMARY_MODEL = "llama3.1:8b";
const DEFAULT_FALLBACK_MODELS = ["qwen2.5:7b", "gemma3:4b", "llama3.2"];

export interface OllamaModelPolicy {
  primaryModel: string;
  fallbackModels: string[];
  autoPull: boolean;
  warmupTimeoutMs: number;
}

export interface OllamaWarmupState {
  warmingUp: boolean;
  reachable: boolean;
  activeModel: string | null;
  localModelReady: boolean;
  selectedPrimaryModel: string;
  fallbackModels: string[];
  autoPull: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
}

const defaultState = (): OllamaWarmupState => ({
  warmingUp: false,
  reachable: false,
  activeModel: null,
  localModelReady: false,
  selectedPrimaryModel: getModelPolicy().primaryModel,
  fallbackModels: getModelPolicy().fallbackModels,
  autoPull: getModelPolicy().autoPull,
  lastCheckedAt: null,
  lastError: null,
});

let state: OllamaWarmupState = defaultState();
let warmupInFlight: Promise<OllamaWarmupState> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() !== "false";
}

function parseFallbackModels(value: string | undefined): string[] {
  if (!value || !value.trim()) return [...DEFAULT_FALLBACK_MODELS];
  const parsed = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_FALLBACK_MODELS];
}

export function getModelPolicy(): OllamaModelPolicy {
  return {
    primaryModel: process.env.OLLAMA_PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL,
    fallbackModels: parseFallbackModels(process.env.OLLAMA_FALLBACK_MODELS),
    autoPull: parseBoolean(process.env.OLLAMA_AUTO_PULL, true),
    warmupTimeoutMs: Number(process.env.OLLAMA_WARMUP_TIMEOUT_MS || 180000),
  };
}

function orderedCandidates(policy: OllamaModelPolicy): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const model of [policy.primaryModel, ...policy.fallbackModels]) {
    const normalized = model.trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      ordered.push(normalized);
    }
  }
  return ordered;
}

async function getTags(): Promise<{ reachable: boolean; installed: string[] }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { reachable: false, installed: [] };
    }

    const data = await response.json();
    const installed = (data.models || []).map((m: { name: string }) => m.name);
    return { reachable: true, installed };
  } catch {
    return { reachable: false, installed: [] };
  }
}

async function pullModel(model: string): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function selectInstalledModel(installed: string[], policy: OllamaModelPolicy): string | null {
  const installedSet = new Set(installed);
  for (const model of orderedCandidates(policy)) {
    if (installedSet.has(model)) {
      return model;
    }
  }
  return null;
}

async function runWarmupInternal(): Promise<OllamaWarmupState> {
  const policy = getModelPolicy();
  state = {
    ...state,
    warmingUp: true,
    selectedPrimaryModel: policy.primaryModel,
    fallbackModels: policy.fallbackModels,
    autoPull: policy.autoPull,
    lastCheckedAt: nowIso(),
    lastError: null,
  };

  const tags = await getTags();
  state = { ...state, reachable: tags.reachable, lastCheckedAt: nowIso() };

  if (!tags.reachable) {
    state = {
      ...state,
      warmingUp: false,
      localModelReady: false,
      activeModel: null,
      lastError: "Ollama is unreachable at startup",
      lastCheckedAt: nowIso(),
    };
    return state;
  }

  const selectedInstalled = selectInstalledModel(tags.installed, policy);
  if (selectedInstalled) {
    state = {
      ...state,
      warmingUp: false,
      activeModel: selectedInstalled,
      localModelReady: true,
      lastError: null,
      lastCheckedAt: nowIso(),
    };
    return state;
  }

  if (!policy.autoPull) {
    state = {
      ...state,
      warmingUp: false,
      activeModel: null,
      localModelReady: false,
      lastError: "No preferred local model installed and auto-pull disabled",
      lastCheckedAt: nowIso(),
    };
    return state;
  }

  for (const candidate of orderedCandidates(policy)) {
    const pulled = await pullModel(candidate);
    if (!pulled) {
      state = {
        ...state,
        lastError: `Failed to pull model '${candidate}'`,
      };
      continue;
    }

    const refreshed = await getTags();
    if (!refreshed.reachable) {
      state = {
        ...state,
        warmingUp: false,
        reachable: false,
        activeModel: null,
        localModelReady: false,
        lastError: "Ollama became unreachable during warmup",
        lastCheckedAt: nowIso(),
      };
      return state;
    }

    if (refreshed.installed.includes(candidate)) {
      state = {
        ...state,
        warmingUp: false,
        reachable: true,
        activeModel: candidate,
        localModelReady: true,
        lastError: null,
        lastCheckedAt: nowIso(),
      };
      return state;
    }
  }

  state = {
    ...state,
    warmingUp: false,
    activeModel: null,
    localModelReady: false,
    lastError:
      state.lastError || "No compatible local model available after warmup attempts",
    lastCheckedAt: nowIso(),
  };

  return state;
}

export async function warmupLocalModel(): Promise<OllamaWarmupState> {
  if (warmupInFlight) return warmupInFlight;

  const { warmupTimeoutMs } = getModelPolicy();
  warmupInFlight = new Promise<OllamaWarmupState>((resolve) => {
    let settled = false;
    const finish = (nextState: OllamaWarmupState) => {
      if (settled) return;
      settled = true;
      resolve(nextState);
    };

    const timeoutId = setTimeout(() => {
      state = {
        ...state,
        warmingUp: false,
        localModelReady: false,
        activeModel: null,
        lastError: `Warmup timed out after ${warmupTimeoutMs}ms`,
        lastCheckedAt: nowIso(),
      };
      finish(state);
    }, warmupTimeoutMs);

    void runWarmupInternal()
      .then((result) => {
        clearTimeout(timeoutId);
        finish(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        state = {
          ...state,
          warmingUp: false,
          localModelReady: false,
          activeModel: null,
          lastError: error instanceof Error ? error.message : String(error),
          lastCheckedAt: nowIso(),
        };
        finish(state);
      });
  }).finally(() => {
    warmupInFlight = null;
  });

  return warmupInFlight;
}

export function getOllamaWarmupState(): OllamaWarmupState {
  return { ...state };
}

export function getResolvedLocalModel(): string {
  if (!state.localModelReady || !state.activeModel) {
    const policy = getModelPolicy();
    return policy.primaryModel;
  }
  return state.activeModel;
}

// Test helper
export function resetOllamaModelManagerForTests(): void {
  state = defaultState();
  warmupInFlight = null;
}
