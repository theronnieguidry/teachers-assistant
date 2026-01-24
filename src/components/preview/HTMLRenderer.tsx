import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface HTMLRendererProps {
  html: string;
  className?: string;
}

export function HTMLRenderer({ html, className }: HTMLRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!doc) return;

    // Build the full HTML document with styles
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: "Arial", "Helvetica", sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #fff;
            padding: 24px;
            margin: 0;
          }

          h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 20px 0;
            color: #111;
            border-bottom: 2px solid #e5e5e5;
            padding-bottom: 12px;
          }

          h2 {
            font-size: 22px;
            font-weight: 600;
            margin: 28px 0 14px 0;
            color: #222;
          }

          h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 20px 0 10px 0;
            color: #333;
          }

          h4 {
            font-size: 16px;
            font-weight: 600;
            margin: 16px 0 8px 0;
            color: #444;
          }

          p {
            margin: 0 0 14px 0;
          }

          ul, ol {
            margin: 0 0 16px 0;
            padding-left: 28px;
          }

          li {
            margin-bottom: 6px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }

          th, td {
            border: 1px solid #d1d5db;
            padding: 10px 12px;
            text-align: left;
          }

          th {
            background-color: #f3f4f6;
            font-weight: 600;
          }

          tr:nth-child(even) {
            background-color: #f9fafb;
          }

          /* Question styling */
          .question, .problem {
            margin: 20px 0;
            padding: 16px;
            background-color: #fafafa;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
          }

          .question-number {
            font-weight: 700;
            color: #4f46e5;
            margin-right: 8px;
          }

          /* Answer line for students to write on */
          .answer-line, .blank {
            border-bottom: 1px solid #999;
            display: inline-block;
            min-width: 200px;
            height: 24px;
            margin: 4px 8px;
          }

          .answer-box {
            border: 1px solid #d1d5db;
            padding: 12px;
            margin: 8px 0;
            min-height: 60px;
            background-color: #fff;
          }

          /* Visual placeholder */
          .visual-placeholder, [data-visual] {
            background-color: #f1f5f9;
            border: 2px dashed #94a3b8;
            padding: 24px;
            text-align: center;
            color: #64748b;
            margin: 16px 0;
            border-radius: 8px;
          }

          /* Lesson plan specific */
          .section {
            margin: 24px 0;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e5e5;
          }

          .time-estimate {
            background-color: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
          }

          .materials-list {
            background-color: #ecfdf5;
            padding: 16px;
            border-radius: 8px;
            margin: 12px 0;
          }

          .materials-list li {
            color: #065f46;
          }

          /* Answer key specific */
          .answer {
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 12px 16px;
            margin: 8px 0;
          }

          .answer-label {
            font-weight: 700;
            color: #059669;
          }

          .explanation {
            font-style: italic;
            color: #4b5563;
            margin-top: 8px;
          }

          /* Print styles */
          @media print {
            body {
              padding: 0;
              font-size: 12pt;
            }

            .no-print {
              display: none !important;
            }

            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={cn("w-full flex-1 border-0 bg-white", className)}
      sandbox="allow-same-origin"
      title="Content Preview"
    />
  );
}
