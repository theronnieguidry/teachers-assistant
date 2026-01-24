import { useProjectStore } from "@/stores/projectStore";
import { ProjectPreview } from "@/components/preview/ProjectPreview";
import { WelcomeScreen } from "./WelcomeScreen";

export function MainContent() {
  const currentProject = useProjectStore((state) => state.currentProject);

  if (!currentProject) {
    return <WelcomeScreen />;
  }

  return <ProjectPreview project={currentProject} />;
}
