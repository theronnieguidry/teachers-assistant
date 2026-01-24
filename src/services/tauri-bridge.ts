import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { documentDir, join } from "@tauri-apps/api/path";

export interface SaveFileOptions {
  filename: string;
  content: string;
  directory?: string;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export async function saveFile(options: SaveFileOptions): Promise<string> {
  const directory = options.directory || (await documentDir());
  const filePath = await join(directory, options.filename);

  await invoke("save_file", {
    path: filePath,
    content: options.content,
  });

  return filePath;
}

export async function readFile(path: string): Promise<string> {
  return invoke("read_file", { path });
}

export async function selectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select output folder",
    defaultPath: await documentDir(),
  });

  return selected as string | null;
}

export async function saveFileDialog(options: SaveDialogOptions): Promise<string | null> {
  const filePath = await save({
    title: options.title || "Save file",
    defaultPath: options.defaultPath,
    filters: options.filters,
  });

  return filePath;
}

export async function openFolder(path: string): Promise<void> {
  await invoke("open_folder", { path });
}

export async function saveTeacherPack(
  outputPath: string,
  content: {
    worksheetHtml: string;
    lessonPlanHtml: string;
    answerKeyHtml: string;
  },
  projectTitle: string
): Promise<string[]> {
  const sanitizedTitle = projectTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
  const savedFiles: string[] = [];

  // Save worksheet
  if (content.worksheetHtml) {
    const worksheetPath = await join(outputPath, `${sanitizedTitle} - Worksheet.html`);
    await invoke("save_file", {
      path: worksheetPath,
      content: wrapHtmlForPrint(content.worksheetHtml, `${projectTitle} - Worksheet`),
    });
    savedFiles.push(worksheetPath);
  }

  // Save lesson plan
  if (content.lessonPlanHtml) {
    const lessonPlanPath = await join(outputPath, `${sanitizedTitle} - Lesson Plan.html`);
    await invoke("save_file", {
      path: lessonPlanPath,
      content: wrapHtmlForPrint(content.lessonPlanHtml, `${projectTitle} - Lesson Plan`),
    });
    savedFiles.push(lessonPlanPath);
  }

  // Save answer key
  if (content.answerKeyHtml) {
    const answerKeyPath = await join(outputPath, `${sanitizedTitle} - Answer Key.html`);
    await invoke("save_file", {
      path: answerKeyPath,
      content: wrapHtmlForPrint(content.answerKeyHtml, `${projectTitle} - Answer Key`),
    });
    savedFiles.push(answerKeyPath);
  }

  return savedFiles;
}

function wrapHtmlForPrint(content: string, title: string): string {
  // Check if content is already a full HTML document
  if (content.toLowerCase().includes("<!doctype") || content.toLowerCase().includes("<html")) {
    return content;
  }

  // Wrap content in a printable HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: "Arial", sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 { font-size: 24px; margin-bottom: 16px; }
    h2 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
    h3 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; }
    p { margin-bottom: 12px; }
    ul, ol { margin-bottom: 12px; padding-left: 24px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    .question { margin-bottom: 20px; }
    .answer-line { border-bottom: 1px solid #999; height: 24px; margin: 8px 0; }
    @media print {
      body { max-width: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}
