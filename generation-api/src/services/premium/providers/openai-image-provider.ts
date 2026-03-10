/**
 * OpenAI Image Provider
 *
 * Wraps OpenAI's GPT Image API behind the ImageProvider interface.
 * Defaults to GPT Image 1.5 with an automatic fallback to GPT Image 1 when needed.
 */

import OpenAI from "openai";
import type {
  ImageProvider,
  ImageProviderResult,
  VisualStyle,
} from "../../../types/premium.js";

// GPT Image size mapping: logical size -> native API dimensions + display target
const OPENAI_SIZE_MAP: Record<
  string,
  {
    nativeSize: "1024x1024" | "1536x1024" | "1024x1536";
    target: { width: number; height: number };
  }
> = {
  small: { nativeSize: "1024x1024", target: { width: 256, height: 256 } },
  medium: { nativeSize: "1024x1024", target: { width: 400, height: 300 } },
  wide: { nativeSize: "1536x1024", target: { width: 600, height: 300 } },
  large: { nativeSize: "1024x1024", target: { width: 400, height: 300 } }, // Legacy alias
};

const DEFAULT_FALLBACK_SIZE = "medium";
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const FALLBACK_IMAGE_MODEL = "gpt-image-1";

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  private client: OpenAI | null = null;
  private model: string;
  private readonly allowDefaultFallback: boolean;

  constructor(model?: string) {
    const initialModel = model || process.env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
    this.model = initialModel;
    this.allowDefaultFallback = initialModel === DEFAULT_IMAGE_MODEL;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY environment variable is required for image generation"
        );
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  getSizeMapping(logicalSize: string): {
    nativeSize: string;
    target: { width: number; height: number };
  } {
    return (
      OPENAI_SIZE_MAP[logicalSize] || OPENAI_SIZE_MAP[DEFAULT_FALLBACK_SIZE]
    );
  }

  async generateImage(
    prompt: string,
    logicalSize: string,
    _style: VisualStyle
  ): Promise<ImageProviderResult> {
    const client = this.getClient();
    const sizeConfig = this.getSizeMapping(logicalSize);

    let response;
    try {
      response = await client.images.generate({
        model: this.model,
        prompt,
        n: 1,
        size: sizeConfig.nativeSize as "1024x1024" | "1536x1024" | "1024x1536",
        output_format: "png",
        quality: "medium",
      });
    } catch (error) {
      if (!this.shouldFallbackToGptImage1(error)) {
        throw error;
      }

      this.model = FALLBACK_IMAGE_MODEL;
      response = await client.images.generate({
        model: this.model,
        prompt,
        n: 1,
        size: sizeConfig.nativeSize as "1024x1024" | "1536x1024" | "1024x1536",
        output_format: "png",
        quality: "medium",
      });
    }

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error("No image data in response");
    }

    return {
      base64Data: imageData.b64_json,
      mediaType: "image/png",
      width: parseInt(sizeConfig.nativeSize.split("x")[0]),
      height: parseInt(sizeConfig.nativeSize.split("x")[1]),
    };
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private shouldFallbackToGptImage1(error: unknown): boolean {
    if (!this.allowDefaultFallback || this.model !== DEFAULT_IMAGE_MODEL) {
      return false;
    }

    if (error instanceof OpenAI.APIError) {
      return ["invalid_model", "model_not_found"].includes(error.code || "");
    }

    return (
      error instanceof Error &&
      /gpt-image-1\.5|unsupported model|invalid model|model not found/i.test(
        error.message
      )
    );
  }

  isContentPolicyError(error: unknown): boolean {
    return (
      error instanceof OpenAI.APIError &&
      error.code === "content_policy_violation"
    );
  }

  /** For testing: reset the lazy client */
  resetClient(): void {
    this.client = null;
  }
}
