import { Router } from "express";
import { z } from "zod";
import { chromium } from "playwright";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const pdfRequestSchema = z.object({
  html: z.string().min(1, "HTML content is required"),
  options: z
    .object({
      format: z.enum(["letter", "a4"]).optional(),
      landscape: z.boolean().optional(),
      margin: z
        .object({
          top: z.string().optional(),
          right: z.string().optional(),
          bottom: z.string().optional(),
          left: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const validation = pdfRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.issues,
      });
    }

    const { html, options } = validation.data;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(wrapHtmlForPdf(html));
    const pdfBuffer = await page.pdf({
      format: options?.format || "letter",
      landscape: options?.landscape || false,
      margin: options?.margin || {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      printBackground: true,
    });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="document.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({
      error: "PDF generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper function to wrap HTML for PDF generation
function wrapHtmlForPdf(content: string): string {
  if (
    content.toLowerCase().includes("<!doctype") ||
    content.toLowerCase().includes("<html")
  ) {
    return content;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "Arial", sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 0.5in;
    }
    h1 { font-size: 24pt; margin-bottom: 12pt; }
    h2 { font-size: 18pt; margin-top: 18pt; margin-bottom: 9pt; }
    h3 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; }
    p { margin-bottom: 9pt; }
    ul, ol { margin-bottom: 9pt; padding-left: 18pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
    th, td { border: 1px solid #ccc; padding: 6pt; text-align: left; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

export default router;
