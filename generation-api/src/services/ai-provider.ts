import OpenAI from "openai";
import type { AIProvider, InternalAIProvider } from "../types.js";

export interface AIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProviderConfig {
  provider: AIProvider;
  model?: string;
  maxTokens?: number;
}

// Vision image format for multimodal AI requests
export interface VisionImage {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  base64Data: string;
}

// Default cloud provider for "premium" (OpenAI is now the only premium option)
const DEFAULT_PREMIUM_PROVIDER: InternalAIProvider =
  (process.env.PREMIUM_AI_PROVIDER as InternalAIProvider) || "openai";

// Map user-facing provider to internal provider
export function resolveProvider(provider: AIProvider): InternalAIProvider {
  switch (provider) {
    case "premium":
      return DEFAULT_PREMIUM_PROVIDER;
    case "local":
      return "ollama";
    // Legacy: remap "claude" to "openai" for backward compatibility (BR-3)
    case "claude":
      console.log("[ai-provider] Legacy provider 'claude' remapped to 'openai'");
      return "openai";
    case "openai":
    case "ollama":
      return provider;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Check if a provider supports vision/image analysis
export function supportsVision(provider: AIProvider): boolean {
  const resolved = resolveProvider(provider);
  return resolved === "openai";
}

// Check if a provider requires credits (cloud providers)
export function requiresCredits(provider: AIProvider): boolean {
  const resolved = resolveProvider(provider);
  return resolved === "openai";
}

// Default models
const DEFAULT_MODELS: Record<InternalAIProvider, string> = {
  openai: "gpt-4o",
  ollama: "llama3.2",
};

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Lazy initialization of clients
let openaiClient: OpenAI | null = null;
let ollamaClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getOllamaClient(): OpenAI {
  if (!ollamaClient) {
    // Ollama uses OpenAI-compatible API
    ollamaClient = new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama", // Required by OpenAI client but not used by Ollama
    });
  }
  return ollamaClient;
}

// Check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get available Ollama models
export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

async function generateWithOpenAI(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  const client = getOpenAIClient();
  const model = config.model || DEFAULT_MODELS.openai;
  const maxTokens = config.maxTokens || 8192;

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return {
    content,
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  };
}

async function generateWithOllama(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  // Check if Ollama is available first
  const available = await isOllamaAvailable();
  if (!available) {
    throw new Error(
      "Ollama is not running. Please start Ollama with 'ollama serve' and ensure you have a model pulled (e.g., 'ollama pull llama3.2')"
    );
  }

  const client = getOllamaClient();
  const model = process.env.OLLAMA_MODEL || config.model || DEFAULT_MODELS.ollama;
  const maxTokens = config.maxTokens || 8192; // Match OpenAI token limit

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in Ollama response");
    }

    return {
      content,
      // Ollama may not always return usage stats
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("model")) {
      throw new Error(
        `Ollama model '${model}' not found. Pull it with: ollama pull ${model}`
      );
    }
    throw error;
  }
}

// Vision API: Analyze images with OpenAI
async function analyzeWithOpenAIVision(
  prompt: string,
  images: VisionImage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const client = getOpenAIClient();
  const model = config.model || DEFAULT_MODELS.openai;
  const maxTokens = config.maxTokens || 1000;

  // Build content array with text prompt and images
  const content: OpenAI.ChatCompletionContentPart[] = [
    { type: "text", text: prompt },
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mediaType};base64,${img.base64Data}`,
        detail: "low" as const, // Use low detail to minimize token cost
      },
    })),
  ];

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  });

  return {
    content: response.choices[0]?.message?.content || "",
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  };
}

// Analyze images using vision-capable AI providers
export async function analyzeImageWithVision(
  prompt: string,
  images: VisionImage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const resolved = resolveProvider(config.provider);
  switch (resolved) {
    case "openai":
      return analyzeWithOpenAIVision(prompt, images, config);
    default:
      throw new Error(`Vision not supported for provider: ${config.provider}`);
  }
}

export async function generateContent(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  const resolved = resolveProvider(config.provider);
  switch (resolved) {
    case "openai":
      return generateWithOpenAI(prompt, config);
    case "ollama":
      return generateWithOllama(prompt, config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

// Calculate credits based on tokens used
// Simple model: 1 credit = 1000 tokens (combined input + output)
export function calculateCredits(
  inputTokens: number,
  outputTokens: number
): number {
  const totalTokens = inputTokens + outputTokens;
  return Math.ceil(totalTokens / 1000);
}

// For testing: reset clients
export function resetClients(): void {
  openaiClient = null;
  ollamaClient = null;
}
