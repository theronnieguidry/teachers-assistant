import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProvider } from "../types.js";

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

// Default models
const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  ollama: "llama3.2",
};

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Lazy initialization of clients
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let ollamaClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

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

async function generateWithClaude(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  const client = getAnthropicClient();
  const model = config.model || DEFAULT_MODELS.claude;
  const maxTokens = config.maxTokens || 8192;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return {
    content: textContent.text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
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
  const maxTokens = config.maxTokens || 8192; // Match Claude/OpenAI token limit

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

export async function generateContent(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  switch (config.provider) {
    case "claude":
      return generateWithClaude(prompt, config);
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
  anthropicClient = null;
  openaiClient = null;
  ollamaClient = null;
}
