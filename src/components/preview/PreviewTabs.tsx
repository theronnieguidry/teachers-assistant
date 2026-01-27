import { useState } from "react";
import { FileText, BookOpen, CheckSquare, Download, Printer, Loader2, ClipboardList, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HTMLRenderer } from "./HTMLRenderer";
import { generatePdf } from "@/services/generation-api";
import { useAuthStore } from "@/stores/authStore";
import type { PreviewTabId } from "@/types";

// Legacy tab type for backwards compatibility
export type PreviewTab = "worksheet" | "lesson_plan" | "answer_key";

// New standardized tab type (Issue #20)
export type StandardizedPreviewTab = PreviewTabId;

// Legacy props interface (backwards compatible)
interface PreviewTabsProps {
  worksheetHtml: string;
  lessonPlanHtml: string;
  answerKeyHtml: string;
  projectTitle: string;
}

// New standardized props interface (Issue #20)
interface StandardizedPreviewTabsProps {
  studentPageHtml?: string;
  teacherScriptHtml?: string;
  answerKeyHtml?: string;
  lessonPlanHtml?: string;
  projectTitle: string;
  showPrintPack?: boolean;
}

export function PreviewTabs({
  worksheetHtml,
  lessonPlanHtml,
  answerKeyHtml,
  projectTitle,
}: PreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("worksheet");
  const [isDownloading, setIsDownloading] = useState(false);
  const { session } = useAuthStore();

  const tabs = [
    {
      id: "worksheet" as const,
      label: "Worksheet",
      icon: FileText,
      content: worksheetHtml,
    },
    {
      id: "lesson_plan" as const,
      label: "Lesson Plan",
      icon: BookOpen,
      content: lessonPlanHtml,
    },
    {
      id: "answer_key" as const,
      label: "Answer Key",
      icon: CheckSquare,
      content: answerKeyHtml,
    },
  ];

  const currentContent = tabs.find((t) => t.id === activeTab)?.content || "";

  const handlePrint = () => {
    // Open the content in a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tabLabel = tabs.find((t) => t.id === activeTab)?.label || "";
    const title = `${projectTitle} - ${tabLabel}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
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
        </style>
      </head>
      <body>
        ${currentContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async () => {
    if (!session?.access_token || !currentContent) return;

    setIsDownloading(true);

    try {
      const blob = await generatePdf(currentContent, session.access_token);
      const tabLabel = tabs.find((t) => t.id === activeTab)?.label || "";
      const filename = `${projectTitle} - ${tabLabel}.pdf`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PreviewTab)}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
          <TabsList className="bg-transparent h-auto p-0 gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!tab.content}
                className="gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!currentContent}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!currentContent || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            {tab.content ? (
              <HTMLRenderer html={tab.content} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No content available
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Standardized Preview Tabs component (Issue #20)
 * Follows the new tab structure: Student Page, Teacher Script, Answer Key, Lesson Plan, Print Pack
 */
export function StandardizedPreviewTabs({
  studentPageHtml,
  teacherScriptHtml,
  answerKeyHtml,
  lessonPlanHtml,
  projectTitle,
  showPrintPack = true,
}: StandardizedPreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<StandardizedPreviewTab>("student_page");
  const [isDownloading, setIsDownloading] = useState(false);
  const { session } = useAuthStore();

  // Build tabs based on available content
  const tabs: Array<{
    id: StandardizedPreviewTab;
    label: string;
    icon: typeof FileText;
    content: string | undefined;
  }> = [
    {
      id: "student_page",
      label: "Student Page",
      icon: FileText,
      content: studentPageHtml,
    },
    {
      id: "teacher_script",
      label: "Teacher Script",
      icon: BookOpen,
      content: teacherScriptHtml,
    },
    {
      id: "answer_key",
      label: "Answer Key",
      icon: CheckSquare,
      content: answerKeyHtml,
    },
    {
      id: "lesson_plan",
      label: "Lesson Plan",
      icon: ClipboardList,
      content: lessonPlanHtml,
    },
  ];

  // Add print pack if enabled and there's any content
  if (showPrintPack) {
    const hasAnyContent = studentPageHtml || teacherScriptHtml || answerKeyHtml || lessonPlanHtml;
    tabs.push({
      id: "print_pack",
      label: "Print Pack",
      icon: Package,
      content: hasAnyContent ? "print_pack" : undefined,
    });
  }

  // Find first available tab
  const firstAvailableTab = tabs.find((t) => t.content)?.id || "student_page";

  // Auto-select first available tab if current tab has no content
  const currentTab = tabs.find((t) => t.id === activeTab);
  const effectiveActiveTab = currentTab?.content ? activeTab : firstAvailableTab;

  const currentContent = activeTab === "print_pack"
    ? buildPrintPackContent(studentPageHtml, teacherScriptHtml, answerKeyHtml, lessonPlanHtml, projectTitle)
    : tabs.find((t) => t.id === activeTab)?.content || "";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tabLabel = tabs.find((t) => t.id === activeTab)?.label || "";
    const title = `${projectTitle} - ${tabLabel}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
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
          .page-break { page-break-after: always; }
          .section-divider { margin: 32px 0; border-top: 2px solid #333; padding-top: 16px; }
          @media print {
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        ${currentContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async () => {
    if (!session?.access_token || !currentContent) return;

    setIsDownloading(true);

    try {
      const blob = await generatePdf(currentContent, session.access_token);
      const tabLabel = tabs.find((t) => t.id === activeTab)?.label || "";
      const filename = `${projectTitle} - ${tabLabel}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={effectiveActiveTab}
        onValueChange={(v) => setActiveTab(v as StandardizedPreviewTab)}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
          <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!tab.content}
                className="gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!currentContent}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!currentContent || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            {tab.content ? (
              tab.id === "print_pack" ? (
                <HTMLRenderer html={buildPrintPackContent(studentPageHtml, teacherScriptHtml, answerKeyHtml, lessonPlanHtml, projectTitle)} />
              ) : (
                <HTMLRenderer html={tab.content} />
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No content available
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Build combined print pack HTML from all available content
 */
function buildPrintPackContent(
  studentPageHtml?: string,
  teacherScriptHtml?: string,
  answerKeyHtml?: string,
  lessonPlanHtml?: string,
  projectTitle?: string
): string {
  const sections: string[] = [];

  if (studentPageHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Student Page</h2>
        ${studentPageHtml}
      </div>
      <div class="page-break"></div>
    `);
  }

  if (teacherScriptHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Teacher Script</h2>
        ${teacherScriptHtml}
      </div>
      <div class="page-break"></div>
    `);
  }

  if (answerKeyHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Answer Key</h2>
        ${answerKeyHtml}
      </div>
      <div class="page-break"></div>
    `);
  }

  if (lessonPlanHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Lesson Plan</h2>
        ${lessonPlanHtml}
      </div>
    `);
  }

  return `
    <div class="print-pack">
      <h1 class="print-pack-title">${projectTitle || "Teaching Materials"}</h1>
      ${sections.join("\n")}
    </div>
  `;
}
