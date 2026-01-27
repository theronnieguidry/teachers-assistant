import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { ProjectPreview } from "@/components/preview/ProjectPreview";
import { WelcomeScreen } from "./WelcomeScreen";
import { TodayView, LearningPathView } from "@/components/learning-path";
import { LibraryView } from "@/components/library";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Map, FolderOpen, BookOpen } from "lucide-react";

type MainTab = "today" | "learning-path" | "library" | "projects";

export function MainContent() {
  const [activeTab, setActiveTab] = useState<MainTab>("today");
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();

  const currentProject = useProjectStore((state) => state.currentProject);

  const handleNavigateToLearningPath = (subject?: string) => {
    setSelectedSubject(subject);
    setActiveTab("learning-path");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b px-4 pt-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)}>
          <TabsList className="bg-transparent border-none gap-1">
            <TabsTrigger
              value="today"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger
              value="learning-path"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <Map className="h-4 w-4" />
              Learning Path
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "today" && (
          <TodayView onNavigateToLearningPath={handleNavigateToLearningPath} />
        )}
        {activeTab === "learning-path" && (
          <LearningPathView initialSubject={selectedSubject} />
        )}
        {activeTab === "library" && <LibraryView />}
        {activeTab === "projects" && (
          currentProject ? (
            <ProjectPreview project={currentProject} />
          ) : (
            <WelcomeScreen />
          )
        )}
      </div>
    </div>
  );
}
