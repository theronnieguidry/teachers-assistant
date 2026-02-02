import OpenAI from "openai";
import type {
  ImprovementType,
  ImprovementResult,
  VisualSettings,
  Grade,
} from "../../types/premium.js";
import type { ProjectOptions } from "../../types.js";
import { generateImage } from "./image-generator.js";

// Local type for placing images during improvements
interface ImprovementImagePlacement {
  imageData: string;
  placement: string;
  alt: string;
}

interface ImprovementContext {
  projectId: string;
  versionId: string;
  improvementType: ImprovementType;
  targetDocument: "worksheet" | "lesson_plan" | "answer_key";
  additionalInstructions?: string;
  currentHtml: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  visualSettings?: VisualSettings;
}

const IMPROVEMENT_PROMPTS: Record<ImprovementType, string> = {
  fix_confusing: `Review this worksheet and identify any questions that might be confusing for a young student.
For each confusing question:
- Reword it to be clearer
- Simplify the vocabulary if needed
- Add hints or context if helpful
Return the improved HTML with the same structure but clearer wording.`,

  simplify: `Simplify this worksheet for younger or struggling students:
- Lower the vocabulary level (use simpler words)
- Add hints or visual cues
- Break complex questions into smaller steps
- Use more common examples
Return the improved HTML with the same structure but simpler content.`,

  add_questions: `Add 3-5 more practice questions to this worksheet on the same topic.
- Match the difficulty level and style of existing questions
- Cover different aspects of the same concept
- Include answer key entries for new questions
Return the complete HTML with the new questions integrated naturally.`,

  add_visuals: `Suggest 2 more images that would enhance this worksheet:
- Images should support specific questions
- Match the visual style already used
- Be age-appropriate and educational
Return JSON with image prompts and placement suggestions.`,

  make_harder: `Increase the difficulty of this worksheet:
- Use more challenging vocabulary
- Add multi-step problems
- Reduce hints and scaffolding
- Include more abstract concepts
Return the improved HTML with increased difficulty.`,

  make_easier: `Decrease the difficulty of this worksheet:
- Simplify vocabulary and sentences
- Add more hints and examples
- Break complex problems into smaller steps
- Use more concrete, familiar examples
Return the improved HTML with decreased difficulty.`,
};

const CREDIT_COSTS: Record<ImprovementType, number> = {
  fix_confusing: 1,
  simplify: 2,
  add_questions: 3,
  add_visuals: 4,
  make_harder: 2,
  make_easier: 2,
};

export class ImprovementService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI API key is required for improvement service");
    }
    this.openai = new OpenAI({ apiKey: key });
  }

  /**
   * Get the credit cost for an improvement type
   */
  getCreditCost(improvementType: ImprovementType): number {
    return CREDIT_COSTS[improvementType] || 2;
  }

  /**
   * Apply an improvement to a document
   */
  async applyImprovement(context: ImprovementContext): Promise<ImprovementResult> {
    const {
      improvementType,
      targetDocument,
      additionalInstructions,
      currentHtml,
      grade,
      subject,
      visualSettings,
    } = context;

    const basePrompt = IMPROVEMENT_PROMPTS[improvementType];
    const documentName = this.getDocumentName(targetDocument);

    const systemPrompt = `You are an expert K-6 educational content editor.
You are improving a ${documentName} for Grade ${grade} ${subject}.
Focus on age-appropriate vocabulary and clear presentation.
Maintain the existing HTML structure and styling.`;

    const userPrompt = `${basePrompt}

${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ""}

Current HTML:
\`\`\`html
${currentHtml}
\`\`\`

${improvementType === "add_visuals" ? "Return a JSON object with image prompts." : "Return only the improved HTML, no explanations."}`;

    // Handle add_visuals separately (needs image generation)
    if (improvementType === "add_visuals" && visualSettings?.includeVisuals) {
      return this.handleAddVisuals(context);
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.3,
    });

    const improvedHtml = this.extractHtml(response.choices[0]?.message?.content || "");
    const changes = this.detectChanges(currentHtml, improvedHtml, improvementType);

    return {
      improvedHtml,
      changes,
      creditsUsed: CREDIT_COSTS[improvementType],
    };
  }

  /**
   * Handle the add_visuals improvement type
   */
  private async handleAddVisuals(context: ImprovementContext): Promise<ImprovementResult> {
    const { currentHtml, grade, subject, visualSettings } = context;

    // First, get image suggestions from GPT
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at enhancing educational worksheets with images.
Suggest 2 images that would enhance this Grade ${grade} ${subject} worksheet.
Return a JSON array with objects containing: { "prompt": "image description", "placement": "after_question_N" or "header" }`,
        },
        {
          role: "user",
          content: `Current HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nSuggest 2 relevant images. Return only JSON.`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });

    let imageSuggestions: Array<{ prompt: string; placement: string }> = [];
    try {
      const content = response.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        imageSuggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to generic images
      imageSuggestions = [
        { prompt: `Educational illustration for Grade ${grade} ${subject} worksheet`, placement: "header" },
        { prompt: `Student-friendly diagram for ${subject} learning activity`, placement: "after_question_1" },
      ];
    }

    // Generate the images
    const style = visualSettings?.style || "friendly_cartoon";
    const generatedImages: ImprovementImagePlacement[] = [];

    for (const suggestion of imageSuggestions.slice(0, 2)) {
      try {
        const imageResult = await generateImage({
          prompt: suggestion.prompt,
          style,
          size: "small",
        });
        generatedImages.push({
          imageData: imageResult.base64Data,
          placement: suggestion.placement,
          alt: suggestion.prompt,
        });
      } catch (error) {
        console.error("Failed to generate image:", error);
        // Continue without this image
      }
    }

    // Embed images into HTML
    const improvedHtml = this.embedImagesInHtml(currentHtml, generatedImages);

    return {
      improvedHtml,
      changes: [`Added ${generatedImages.length} new images to the worksheet`],
      creditsUsed: CREDIT_COSTS.add_visuals,
    };
  }

  /**
   * Embed generated images into HTML content
   */
  private embedImagesInHtml(html: string, images: ImprovementImagePlacement[]): string {
    let result = html;

    for (const image of images) {
      const imgTag = `<img src="data:image/png;base64,${image.imageData}" alt="${image.alt}" style="max-width: 250px; display: block; margin: 1rem auto;" />`;

      if (image.placement === "header") {
        // Insert after the opening body tag or main container
        result = result.replace(
          /(<body[^>]*>|<main[^>]*>|<div class="worksheet[^"]*">)/i,
          `$1\n${imgTag}\n`
        );
      } else if (image.placement.startsWith("after_question_")) {
        const questionNum = parseInt(image.placement.replace("after_question_", ""));
        // Try to find question by number and insert after it
        const questionPattern = new RegExp(
          `(<(?:div|p|li)[^>]*class="[^"]*question[^"]*"[^>]*>[\\s\\S]*?<\\/(?:div|p|li)>)`,
          "gi"
        );
        let matches = 0;
        result = result.replace(questionPattern, (match) => {
          matches++;
          if (matches === questionNum) {
            return `${match}\n${imgTag}\n`;
          }
          return match;
        });
      }
    }

    return result;
  }

  /**
   * Extract HTML from a response that may include markdown fences
   */
  private extractHtml(content: string): string {
    // Remove markdown code fences if present
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch) {
      return htmlMatch[1].trim();
    }

    // Try to extract content between html tags
    const docMatch = content.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    if (docMatch) {
      return docMatch[0];
    }

    // Return as-is if no fences found
    return content.trim();
  }

  /**
   * Detect what changes were made
   */
  private detectChanges(originalHtml: string, improvedHtml: string, type: ImprovementType): string[] {
    const changes: string[] = [];

    switch (type) {
      case "fix_confusing":
        changes.push("Improved clarity of question wording");
        break;
      case "simplify":
        changes.push("Simplified vocabulary and instructions");
        break;
      case "add_questions":
        // Count questions in both
        const origCount = (originalHtml.match(/class="[^"]*question/gi) || []).length;
        const newCount = (improvedHtml.match(/class="[^"]*question/gi) || []).length;
        const added = newCount - origCount;
        if (added > 0) {
          changes.push(`Added ${added} new questions`);
        }
        break;
      case "make_harder":
        changes.push("Increased difficulty level");
        break;
      case "make_easier":
        changes.push("Decreased difficulty level");
        break;
    }

    return changes;
  }

  /**
   * Get a human-readable document name
   */
  private getDocumentName(target: "worksheet" | "lesson_plan" | "answer_key"): string {
    switch (target) {
      case "worksheet":
        return "worksheet";
      case "lesson_plan":
        return "lesson plan";
      case "answer_key":
        return "answer key";
    }
  }
}

// Export singleton instance
export const improvementService = new ImprovementService();
