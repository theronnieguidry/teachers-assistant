/**
 * OpenAI Image Provider
 *
 * Wraps OpenAI's DALL-E image generation API behind the ImageProvider interface.
 * Supports DALL-E 3 (default) and DALL-E 2 via the model parameter.
 */

import OpenAI from "openai";
import type {
  ImageProvider,
  ImageProviderResult,
  VisualStyle,
} from "../../../types/premium.js";

// DALL-E size mapping: logical size -> native API dimensions + display target
const OPENAI_SIZE_MAP: Record<
  string,
  {
    nativeSize: "1024x1024" | "1792x1024" | "1024x1792";
    target: { width: number; height: number };
  }
> = {
  small: { nativeSize: "1024x1024", target: { width: 256, height: 256 } },
  medium: { nativeSize: "1024x1024", target: { width: 400, height: 300 } },
  wide: { nativeSize: "1792x1024", target: { width: 600, height: 300 } },
  large: { nativeSize: "1024x1024", target: { width: 400, height: 300 } }, // Legacy alias
};

const DEFAULT_FALLBACK_SIZE = "medium";

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  private client: OpenAI | null = null;
  private model: string;

  constructor(model?: string) {
    this.model = model || "dall-e-3";
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
    style: VisualStyle
  ): Promise<ImageProviderResult> {
    const client = this.getClient();
    const sizeConfig = this.getSizeMapping(logicalSize);

    const response = await client.images.generate({
      model: this.model,
      prompt,
      n: 1,
      size: sizeConfig.nativeSize as "1024x1024" | "1792x1024" | "1024x1792",
      response_format: "b64_json",
      quality: "standard",
      style: style === "friendly_cartoon" ? "vivid" : "natural",
    });

    const imageData = response.data[0];
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
