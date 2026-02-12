import { useState } from "react";
import {
  FileText,
  BookOpen,
  CheckSquare,
  Download,
  Printer,
  Loader2,
  ClipboardList,
  MessageSquare,
  Users,
  Package,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HTMLRenderer } from "./HTMLRenderer";
import { ImproveMenu } from "./ImproveMenu";
import { generatePdf } from "@/services/generation-api";
import { useAuthStore } from "@/stores/authStore";
import type { PreviewTabId } from "@/types";

// Legacy tab names used by the project preview and improve API.
export type PreviewTab =
  | "worksheet"
  | "lesson_plan"
  | "teacher_script"
  | "student_activity"
  | "answer_key"
  | "materials";

// Single tab model used by both legacy and standardized previews.
export type StandardizedPreviewTab = PreviewTabId | "student_activity" | "materials";
type ImproveTargetTab = "worksheet" | "lesson_plan" | "answer_key";

interface ImproveContext {
  projectId: string;
  versionId: string;
  onVersionChanged: (newVersionId: string) => void;
}

// Legacy props interface (kept for backward compatibility).
interface PreviewTabsProps {
  worksheetHtml: string;
  lessonPlanHtml: string;
  answerKeyHtml: string;
  teacherScriptHtml?: string;
  studentActivityHtml?: string;
  materialsListHtml?: string;
  projectTitle: string;
  projectId?: string;
  versionId?: string;
  onVersionChanged?: (newVersionId: string) => void;
}

interface StandardizedPreviewTabsProps {
  studentPageHtml?: string;
  teacherScriptHtml?: string;
  studentActivityHtml?: string;
  answerKeyHtml?: string;
  lessonPlanHtml?: string;
  materialsListHtml?: string;
  projectTitle: string;
  showPrintPack?: boolean;
  hideEmptyTabs?: boolean;
  defaultTab?: StandardizedPreviewTab;
  tabLabelOverrides?: Partial<Record<StandardizedPreviewTab, string>>;
  improveContext?: ImproveContext;
}

interface TabDefinition {
  id: StandardizedPreviewTab | "print_pack";
  label: string;
  icon: typeof FileText;
  content?: string;
}

/**
 * Legacy wrapper component.
 * Delegates rendering to StandardizedPreviewTabs so there is one preview source of truth.
 */
export function PreviewTabs({
  worksheetHtml,
  lessonPlanHtml,
  answerKeyHtml,
  teacherScriptHtml,
  studentActivityHtml,
  materialsListHtml,
  projectTitle,
  projectId,
  versionId,
  onVersionChanged,
}: PreviewTabsProps) {
  const improveContext =
    projectId && versionId && onVersionChanged
      ? { projectId, versionId, onVersionChanged }
      : undefined;

  return (
    <StandardizedPreviewTabs
      studentPageHtml={worksheetHtml}
      teacherScriptHtml={teacherScriptHtml}
      studentActivityHtml={studentActivityHtml}
      answerKeyHtml={answerKeyHtml}
      lessonPlanHtml={lessonPlanHtml}
      materialsListHtml={materialsListHtml}
      projectTitle={projectTitle}
      showPrintPack={false}
      hideEmptyTabs={true}
      defaultTab="student_page"
      improveContext={improveContext}
      tabLabelOverrides={{
        student_page: "Worksheet",
        lesson_plan: "Lesson Plan",
        teacher_script: "Teacher Script",
        student_activity: "Activity",
        answer_key: "Answer Key",
        materials: "Materials",
      }}
    />
  );
}

/**
 * Standardized Preview Tabs component.
 * Used by both the Library and legacy Project preview through the wrapper above.
 */
export function StandardizedPreviewTabs({
  studentPageHtml,
  teacherScriptHtml,
  studentActivityHtml,
  answerKeyHtml,
  lessonPlanHtml,
  materialsListHtml,
  projectTitle,
  showPrintPack = true,
  hideEmptyTabs = false,
  defaultTab = "student_page",
  tabLabelOverrides,
  improveContext,
}: StandardizedPreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<StandardizedPreviewTab | "print_pack">(defaultTab);
  const [isDownloading, setIsDownloading] = useState(false);
  const { session } = useAuthStore();

  const allTabs: TabDefinition[] = [
    {
      id: "student_page",
      label: tabLabelOverrides?.student_page || "Student Page",
      icon: FileText,
      content: studentPageHtml,
    },
    {
      id: "lesson_plan",
      label: tabLabelOverrides?.lesson_plan || "Lesson Plan",
      icon: ClipboardList,
      content: lessonPlanHtml,
    },
    {
      id: "teacher_script",
      label: tabLabelOverrides?.teacher_script || "Teacher Script",
      icon: MessageSquare,
      content: teacherScriptHtml,
    },
    {
      id: "student_activity",
      label: tabLabelOverrides?.student_activity || "Activity",
      icon: Users,
      content: studentActivityHtml,
    },
    {
      id: "answer_key",
      label: tabLabelOverrides?.answer_key || "Answer Key",
      icon: CheckSquare,
      content: answerKeyHtml,
    },
    {
      id: "materials",
      label: tabLabelOverrides?.materials || "Materials",
      icon: Package,
      content: materialsListHtml,
    },
  ];

  if (showPrintPack) {
    const hasAnyContent =
      !!studentPageHtml ||
      !!teacherScriptHtml ||
      !!studentActivityHtml ||
      !!answerKeyHtml ||
      !!lessonPlanHtml ||
      !!materialsListHtml;
    allTabs.push({
      id: "print_pack",
      label: "Print Pack",
      icon: BookOpen,
      content: hasAnyContent ? "print_pack" : undefined,
    });
  }

  const tabs = hideEmptyTabs ? allTabs.filter((tab) => !!tab.content) : allTabs;
  const firstAvailableTab = tabs.find((tab) => tab.content)?.id || "student_page";
  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const effectiveActiveTab = currentTab?.content ? activeTab : firstAvailableTab;
  const improveTargetTab = getImproveTargetTab(effectiveActiveTab);

  const currentContent =
    effectiveActiveTab === "print_pack"
      ? buildPrintPackContent(
          studentPageHtml,
          teacherScriptHtml,
          studentActivityHtml,
          answerKeyHtml,
          lessonPlanHtml,
          materialsListHtml,
          projectTitle
        )
      : allTabs.find((tab) => tab.id === effectiveActiveTab)?.content || "";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tabLabel = tabs.find((tab) => tab.id === effectiveActiveTab)?.label || "";
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
      const tabLabel = tabs.find((tab) => tab.id === effectiveActiveTab)?.label || "";
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
        onValueChange={(value) => setActiveTab(value as StandardizedPreviewTab | "print_pack")}
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
            {improveContext && improveTargetTab && (
              <ImproveMenu
                projectId={improveContext.projectId}
                versionId={improveContext.versionId}
                activeTab={improveTargetTab}
                onImproved={improveContext.onVersionChanged}
                disabled={!currentContent}
              />
            )}
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
              <HTMLRenderer html={tab.id === "print_pack" ? currentContent : tab.content} />
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

function getImproveTargetTab(
  tab: StandardizedPreviewTab | "print_pack"
): ImproveTargetTab | null {
  switch (tab) {
    case "student_page":
      return "worksheet";
    case "lesson_plan":
      return "lesson_plan";
    case "answer_key":
      return "answer_key";
    default:
      return null;
  }
}

/**
 * Build combined print pack HTML from all available content.
 */
function buildPrintPackContent(
  studentPageHtml?: string,
  teacherScriptHtml?: string,
  studentActivityHtml?: string,
  answerKeyHtml?: string,
  lessonPlanHtml?: string,
  materialsListHtml?: string,
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

  if (studentActivityHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Activity</h2>
        ${studentActivityHtml}
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
      <div class="page-break"></div>
    `);
  }

  if (materialsListHtml) {
    sections.push(`
      <div class="section">
        <h2 class="section-title">Materials</h2>
        ${materialsListHtml}
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
