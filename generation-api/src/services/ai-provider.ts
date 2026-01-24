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
};

// Lazy initialization of clients
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

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

export async function generateContent(
  prompt: string,
  config: AIProviderConfig
): Promise<AIResponse> {
  switch (config.provider) {
    case "claude":
      return generateWithClaude(prompt, config);
    case "openai":
      return generateWithOpenAI(prompt, config);
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
}
