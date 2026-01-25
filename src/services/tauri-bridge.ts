import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { documentDir, join } from "@tauri-apps/api/path";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

// Check if running in Tauri context
export function isTauriContext(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// Ollama types
export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  models: string[];
}

export interface OllamaModel {
  name: string;
  size: string | null;
  modified_at: string | null;
}

export type RecommendedModel = [string, string, string]; // [name, size, description]

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
  // Skip local file saving when not in Tauri context (browser dev mode)
  if (!isTauriContext()) {
    console.log("Skipping local file save - not running in Tauri context");
    return [];
  }

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

// Ollama functions

const OLLAMA_API_URL = "http://localhost:11434";

/**
 * Check if Ollama is installed and running
 * Works in both Tauri and browser contexts
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  if (isTauriContext()) {
    return invoke("check_ollama_status");
  }

  // Browser fallback: check via HTTP
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      return {
        installed: true,
        running: true,
        version: null,
        models,
      };
    }
    return { installed: true, running: false, version: null, models: [] };
  } catch {
    return { installed: false, running: false, version: null, models: [] };
  }
}

/**
 * Install Ollama on the system
 * Only works in Tauri context
 */
export async function installOllama(): Promise<string> {
  if (!isTauriContext()) {
    throw new Error("Ollama installation requires the desktop app. Please download Ollama from https://ollama.com/download");
  }
  return invoke("install_ollama");
}

/**
 * Start the Ollama server
 * Only works in Tauri context
 */
export async function startOllama(): Promise<string> {
  if (!isTauriContext()) {
    throw new Error("Starting Ollama requires the desktop app. Please run 'ollama serve' in your terminal.");
  }
  return invoke("start_ollama");
}

/**
 * Stop the Ollama server
 * Only works in Tauri context
 */
export async function stopOllama(): Promise<string> {
  if (!isTauriContext()) {
    throw new Error("Stopping Ollama requires the desktop app. Please stop it manually.");
  }
  return invoke("stop_ollama");
}

/**
 * Pull (download) an Ollama model
 * Only works in Tauri context
 */
export async function pullOllamaModel(modelName: string): Promise<string> {
  if (!isTauriContext()) {
    throw new Error(`Model download requires the desktop app. Please run 'ollama pull ${modelName}' in your terminal.`);
  }
  return invoke("pull_ollama_model", { modelName });
}

/**
 * List installed Ollama models
 * Works in both Tauri and browser contexts
 */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  if (isTauriContext()) {
    return invoke("list_ollama_models");
  }

  // Browser fallback: get via HTTP
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      return data.models?.map((m: { name: string; size?: number }) => ({
        name: m.name,
        size: m.size ? formatBytes(m.size) : null,
        modified_at: null,
      })) || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Get recommended models for educational content
 * Returns array of [name, size, description] tuples
 */
export async function getRecommendedModels(): Promise<RecommendedModel[]> {
  if (isTauriContext()) {
    return invoke("get_recommended_models");
  }

  // Browser fallback: return static list
  return [
    ["llama3.2", "3B", "Fast, good for general tasks"],
    ["llama3.2:1b", "1B", "Smallest, fastest option"],
    ["mistral", "7B", "Good balance of speed and quality"],
    ["gemma2:2b", "2B", "Google's efficient model"],
  ];
}

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(1)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  return `${bytes} bytes`;
}

// Update functions

export interface UpdateInfo {
  available: boolean;
  version: string;
  body: string;
  date?: string;
}

let cachedUpdate: Update | null = null;

/**
 * Check for application updates
 * Only works in Tauri context
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (!isTauriContext()) {
    return null;
  }

  try {
    const update = await check();
    if (update) {
      cachedUpdate = update;
      return {
        available: true,
        version: update.version,
        body: update.body || "",
        date: update.date,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
}

/**
 * Download and install the available update
 * Only works in Tauri context
 */
export async function downloadAndInstallUpdate(): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Updates only available in desktop app");
  }

  if (!cachedUpdate) {
    throw new Error("No update available");
  }

  try {
    await cachedUpdate.downloadAndInstall();
    await relaunch();
  } catch (error) {
    throw new Error(`Update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
