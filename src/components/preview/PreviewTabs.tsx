import { useState } from "react";
import { FileText, BookOpen, CheckSquare, Download, Printer, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HTMLRenderer } from "./HTMLRenderer";
import { generatePdf } from "@/services/generation-api";
import { useAuthStore } from "@/stores/authStore";

export type PreviewTab = "worksheet" | "lesson_plan" | "answer_key";

interface PreviewTabsProps {
  worksheetHtml: string;
  lessonPlanHtml: string;
  answerKeyHtml: string;
  projectTitle: string;
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
