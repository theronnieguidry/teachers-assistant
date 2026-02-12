import { useSettingsStore } from "@/stores/settingsStore";

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint.startsWith("/")) {
    return `/${endpoint}`;
  }
  return endpoint;
}

export function getApiBaseUrl(): string {
  return useSettingsStore.getState().getResolvedApiBaseUrl();
}

export function resolveApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${normalizeEndpoint(endpoint)}`;
}
