import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  documentDir: vi.fn(),
  join: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { documentDir, join } from "@tauri-apps/api/path";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  saveFile,
  readFile,
  selectFolder,
  saveFileDialog,
  openFolder,
  saveTeacherPack,
  isTauriContext,
  checkOllamaStatus,
  installOllama,
  startOllama,
  stopOllama,
  pullOllamaModel,
  listOllamaModels,
  getRecommendedModels,
  checkForUpdates,
  downloadAndInstallUpdate,
} from "@/services/tauri-bridge";

describe("tauri-bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentDir).mockResolvedValue("C:\\Users\\Test\\Documents");
    vi.mocked(join).mockImplementation((...args: string[]) =>
      Promise.resolve(args.join("\\"))
    );
    // Simulate Tauri context
    (window as unknown as { __TAURI__: object }).__TAURI__ = {};
  });

  afterEach(() => {
    // Clean up Tauri context
    delete (window as unknown as { __TAURI__?: object }).__TAURI__;
  });

  describe("saveFile", () => {
    it("saves file to specified directory", async () => {
      await saveFile({
        filename: "test.html",
        content: "<html>Test</html>",
        directory: "C:\\Custom\\Path",
      });

      expect(join).toHaveBeenCalledWith("C:\\Custom\\Path", "test.html");
      expect(invoke).toHaveBeenCalledWith("save_file", {
        path: "C:\\Custom\\Path\\test.html",
        content: "<html>Test</html>",
      });
    });

    it("uses document directory when no directory specified", async () => {
      await saveFile({
        filename: "test.html",
        content: "<html>Test</html>",
      });

      expect(documentDir).toHaveBeenCalled();
      expect(join).toHaveBeenCalledWith("C:\\Users\\Test\\Documents", "test.html");
    });

    it("returns the file path", async () => {
      const result = await saveFile({
        filename: "test.html",
        content: "<html>Test</html>",
        directory: "C:\\Output",
      });

      expect(result).toBe("C:\\Output\\test.html");
    });
  });

  describe("readFile", () => {
    it("invokes read_file command with path", async () => {
      vi.mocked(invoke).mockResolvedValue("file contents");

      const result = await readFile("C:\\path\\to\\file.txt");

      expect(invoke).toHaveBeenCalledWith("read_file", { path: "C:\\path\\to\\file.txt" });
      expect(result).toBe("file contents");
    });
  });

  describe("selectFolder", () => {
    it("opens folder selection dialog", async () => {
      vi.mocked(open).mockResolvedValue("C:\\Selected\\Folder");

      const result = await selectFolder();

      expect(open).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
        title: "Select output folder",
        defaultPath: "C:\\Users\\Test\\Documents",
      });
      expect(result).toBe("C:\\Selected\\Folder");
    });

    it("returns null when dialog is cancelled", async () => {
      vi.mocked(open).mockResolvedValue(null);

      const result = await selectFolder();

      expect(result).toBeNull();
    });
  });

  describe("saveFileDialog", () => {
    it("opens save dialog with options", async () => {
      vi.mocked(save).mockResolvedValue("C:\\Output\\file.html");

      const result = await saveFileDialog({
        title: "Save HTML",
        defaultPath: "C:\\Output\\file.html",
        filters: [{ name: "HTML", extensions: ["html"] }],
      });

      expect(save).toHaveBeenCalledWith({
        title: "Save HTML",
        defaultPath: "C:\\Output\\file.html",
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      expect(result).toBe("C:\\Output\\file.html");
    });

    it("uses default title when not specified", async () => {
      vi.mocked(save).mockResolvedValue("C:\\file.txt");

      await saveFileDialog({});

      expect(save).toHaveBeenCalledWith({
        title: "Save file",
        defaultPath: undefined,
        filters: undefined,
      });
    });

    it("returns null when dialog is cancelled", async () => {
      vi.mocked(save).mockResolvedValue(null);

      const result = await saveFileDialog({});

      expect(result).toBeNull();
    });
  });

  describe("openFolder", () => {
    it("invokes open_folder command", async () => {
      await openFolder("C:\\Documents\\Project");

      expect(invoke).toHaveBeenCalledWith("open_folder", {
        path: "C:\\Documents\\Project",
      });
    });
  });

  describe("saveTeacherPack", () => {
    const mockContent = {
      worksheetHtml: "<html>Worksheet content</html>",
      lessonPlanHtml: "<html>Lesson plan content</html>",
      answerKeyHtml: "<html>Answer key content</html>",
    };

    it("saves all three files when content is provided", async () => {
      const result = await saveTeacherPack(
        "C:\\Output",
        mockContent,
        "Math Test"
      );

      expect(invoke).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it("sanitizes project title for filenames", async () => {
      await saveTeacherPack(
        "C:\\Output",
        mockContent,
        "Math: Test #1 (Addition)"
      );

      expect(join).toHaveBeenCalledWith(
        "C:\\Output",
        "Math Test 1 Addition - Worksheet.html"
      );
    });

    it("saves worksheet with correct filename", async () => {
      await saveTeacherPack("C:\\Output", mockContent, "My Project");

      expect(join).toHaveBeenCalledWith("C:\\Output", "My Project - Worksheet.html");
    });

    it("saves lesson plan with correct filename", async () => {
      await saveTeacherPack("C:\\Output", mockContent, "My Project");

      expect(join).toHaveBeenCalledWith("C:\\Output", "My Project - Lesson Plan.html");
    });

    it("saves answer key with correct filename", async () => {
      await saveTeacherPack("C:\\Output", mockContent, "My Project");

      expect(join).toHaveBeenCalledWith("C:\\Output", "My Project - Answer Key.html");
    });

    it("skips worksheet when content is empty", async () => {
      await saveTeacherPack(
        "C:\\Output",
        { ...mockContent, worksheetHtml: "" },
        "Test"
      );

      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it("skips lesson plan when content is empty", async () => {
      await saveTeacherPack(
        "C:\\Output",
        { ...mockContent, lessonPlanHtml: "" },
        "Test"
      );

      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it("skips answer key when content is empty", async () => {
      await saveTeacherPack(
        "C:\\Output",
        { ...mockContent, answerKeyHtml: "" },
        "Test"
      );

      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it("wraps non-HTML content in HTML structure", async () => {
      await saveTeacherPack(
        "C:\\Output",
        { worksheetHtml: "Plain text content", lessonPlanHtml: "", answerKeyHtml: "" },
        "Test"
      );

      const savedContent = vi.mocked(invoke).mock.calls[0][1] as { content: string };
      expect(savedContent.content).toContain("<!DOCTYPE html>");
      expect(savedContent.content).toContain("Plain text content");
    });

    it("does not wrap content that is already HTML", async () => {
      const htmlContent = "<!DOCTYPE html><html><body>Content</body></html>";
      await saveTeacherPack(
        "C:\\Output",
        { worksheetHtml: htmlContent, lessonPlanHtml: "", answerKeyHtml: "" },
        "Test"
      );

      const savedContent = vi.mocked(invoke).mock.calls[0][1] as { content: string };
      expect(savedContent.content).toBe(htmlContent);
    });

    it("returns array of saved file paths", async () => {
      const result = await saveTeacherPack("C:\\Output", mockContent, "Test");

      expect(result).toContain("C:\\Output\\Test - Worksheet.html");
      expect(result).toContain("C:\\Output\\Test - Lesson Plan.html");
      expect(result).toContain("C:\\Output\\Test - Answer Key.html");
    });

    it("returns empty array when not in Tauri context", async () => {
      // Remove Tauri context
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      const result = await saveTeacherPack("C:\\Output", mockContent, "Test");

      expect(result).toEqual([]);
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("isTauriContext", () => {
    it("returns true when __TAURI__ is present", () => {
      (window as unknown as { __TAURI__: object }).__TAURI__ = {};
      expect(isTauriContext()).toBe(true);
    });

    it("returns false when __TAURI__ is not present", () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;
      expect(isTauriContext()).toBe(false);
    });
  });

  describe("checkOllamaStatus", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      const mockStatus = {
        installed: true,
        running: true,
        version: "0.1.0",
        models: ["llama3.2"],
      };
      vi.mocked(invoke).mockResolvedValue(mockStatus);

      const result = await checkOllamaStatus();

      expect(invoke).toHaveBeenCalledWith("check_ollama_status");
      expect(result).toEqual(mockStatus);
    });

    it("falls back to HTTP check when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "llama3.2" }] }),
      });

      const result = await checkOllamaStatus();

      expect(result.installed).toBe(true);
      expect(result.running).toBe(true);
      expect(result.models).toContain("llama3.2");
    });

    it("returns not running when HTTP check fails with response", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await checkOllamaStatus();

      expect(result.installed).toBe(true);
      expect(result.running).toBe(false);
    });

    it("returns not installed when HTTP check throws", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const result = await checkOllamaStatus();

      expect(result.installed).toBe(false);
      expect(result.running).toBe(false);
    });
  });

  describe("installOllama", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      vi.mocked(invoke).mockResolvedValue("Installed successfully");

      const result = await installOllama();

      expect(invoke).toHaveBeenCalledWith("install_ollama");
      expect(result).toBe("Installed successfully");
    });

    it("throws error when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      await expect(installOllama()).rejects.toThrow(
        "Ollama installation requires the desktop app"
      );
    });
  });

  describe("startOllama", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      vi.mocked(invoke).mockResolvedValue("Started");

      const result = await startOllama();

      expect(invoke).toHaveBeenCalledWith("start_ollama");
      expect(result).toBe("Started");
    });

    it("throws error when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      await expect(startOllama()).rejects.toThrow(
        "Starting Ollama requires the desktop app"
      );
    });
  });

  describe("stopOllama", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      vi.mocked(invoke).mockResolvedValue("Stopped");

      const result = await stopOllama();

      expect(invoke).toHaveBeenCalledWith("stop_ollama");
      expect(result).toBe("Stopped");
    });

    it("throws error when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      await expect(stopOllama()).rejects.toThrow(
        "Stopping Ollama requires the desktop app"
      );
    });
  });

  describe("pullOllamaModel", () => {
    it("invokes Tauri command with model name", async () => {
      vi.mocked(invoke).mockResolvedValue("Pulled llama3.2");

      const result = await pullOllamaModel("llama3.2");

      expect(invoke).toHaveBeenCalledWith("pull_ollama_model", { modelName: "llama3.2" });
      expect(result).toBe("Pulled llama3.2");
    });

    it("throws error when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      await expect(pullOllamaModel("llama3.2")).rejects.toThrow(
        "Model download requires the desktop app"
      );
    });
  });

  describe("listOllamaModels", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      const mockModels = [
        { name: "llama3.2", size: "2.0 GB", modified_at: "2024-01-01" },
      ];
      vi.mocked(invoke).mockResolvedValue(mockModels);

      const result = await listOllamaModels();

      expect(invoke).toHaveBeenCalledWith("list_ollama_models");
      expect(result).toEqual(mockModels);
    });

    it("falls back to HTTP when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: "llama3.2", size: 2000000000 }],
        }),
      });

      const result = await listOllamaModels();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("llama3.2");
      expect(result[0].size).toBe("1.9 GB");
    });

    it("returns empty array when HTTP check fails", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const result = await listOllamaModels();

      expect(result).toEqual([]);
    });

    it("returns empty array when HTTP throws", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await listOllamaModels();

      expect(result).toEqual([]);
    });
  });

  describe("getRecommendedModels", () => {
    it("invokes Tauri command when in Tauri context", async () => {
      const mockModels = [["llama3.2", "3B", "Fast model"]];
      vi.mocked(invoke).mockResolvedValue(mockModels);

      const result = await getRecommendedModels();

      expect(invoke).toHaveBeenCalledWith("get_recommended_models");
      expect(result).toEqual(mockModels);
    });

    it("returns static list when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      const result = await getRecommendedModels();

      expect(result).toContainEqual(["llama3.2", "3B", "Fast, good for general tasks"]);
      expect(result).toContainEqual(["mistral", "7B", "Good balance of speed and quality"]);
    });
  });

  describe("checkForUpdates", () => {
    it("returns null when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      const result = await checkForUpdates();

      expect(result).toBeNull();
    });

    it("returns update info when update is available", async () => {
      const mockUpdate = {
        version: "1.2.0",
        body: "New features",
        date: "2024-06-15",
        downloadAndInstall: vi.fn(),
      };
      vi.mocked(check).mockResolvedValue(mockUpdate);

      const result = await checkForUpdates();

      expect(result).toEqual({
        available: true,
        version: "1.2.0",
        body: "New features",
        date: "2024-06-15",
      });
    });

    it("returns null when no update is available", async () => {
      vi.mocked(check).mockResolvedValue(null);

      const result = await checkForUpdates();

      expect(result).toBeNull();
    });

    it("returns null and logs error when check fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(check).mockRejectedValue(new Error("Check failed"));

      const result = await checkForUpdates();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("handles update without body", async () => {
      const mockUpdate = {
        version: "1.2.0",
        body: undefined,
        date: undefined,
        downloadAndInstall: vi.fn(),
      };
      vi.mocked(check).mockResolvedValue(mockUpdate);

      const result = await checkForUpdates();

      expect(result).toEqual({
        available: true,
        version: "1.2.0",
        body: "",
        date: undefined,
      });
    });
  });

  describe("downloadAndInstallUpdate", () => {
    it("throws error when not in Tauri context", async () => {
      delete (window as unknown as { __TAURI__?: object }).__TAURI__;

      await expect(downloadAndInstallUpdate()).rejects.toThrow(
        "Updates only available in desktop app"
      );
    });

    it("throws error when no update is cached", async () => {
      // Reset modules to clear the cached update
      vi.resetModules();

      // Re-import with fresh state
      const { downloadAndInstallUpdate: freshDownload } = await import("@/services/tauri-bridge");

      await expect(freshDownload()).rejects.toThrow(
        "No update available"
      );
    });

    it("downloads, installs, and relaunches when update is cached", async () => {
      const mockDownloadAndInstall = vi.fn().mockResolvedValue(undefined);
      const mockUpdate = {
        version: "1.2.0",
        body: "New features",
        downloadAndInstall: mockDownloadAndInstall,
      };
      vi.mocked(check).mockResolvedValue(mockUpdate);
      vi.mocked(relaunch).mockResolvedValue(undefined);

      // First check for updates to cache the update
      await checkForUpdates();

      // Now download and install
      await downloadAndInstallUpdate();

      expect(mockDownloadAndInstall).toHaveBeenCalled();
      expect(relaunch).toHaveBeenCalled();
    });

    it("throws formatted error when download fails", async () => {
      const mockDownloadAndInstall = vi.fn().mockRejectedValue(new Error("Download failed"));
      const mockUpdate = {
        version: "1.2.0",
        body: "New features",
        downloadAndInstall: mockDownloadAndInstall,
      };
      vi.mocked(check).mockResolvedValue(mockUpdate);

      await checkForUpdates();

      await expect(downloadAndInstallUpdate()).rejects.toThrow(
        "Update failed: Download failed"
      );
    });

    it("handles non-Error exceptions during download", async () => {
      const mockDownloadAndInstall = vi.fn().mockRejectedValue("String error");
      const mockUpdate = {
        version: "1.2.0",
        body: "New features",
        downloadAndInstall: mockDownloadAndInstall,
      };
      vi.mocked(check).mockResolvedValue(mockUpdate);

      await checkForUpdates();

      await expect(downloadAndInstallUpdate()).rejects.toThrow(
        "Update failed: Unknown error"
      );
    });
  });
});
