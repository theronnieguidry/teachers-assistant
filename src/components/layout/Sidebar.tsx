import { CreationPanel } from "@/components/panels/CreationPanel";
import { ProjectsPanel } from "@/components/panels/ProjectsPanel";
import { InspirationPanel } from "@/components/panels/InspirationPanel";

export function Sidebar() {
  return (
    <aside className="w-80 border-r bg-muted/30 flex flex-col overflow-hidden">
      {/* Creation Panel */}
      <div className="p-4 border-b">
        <CreationPanel />
      </div>

      {/* Projects Panel */}
      <div className="flex-1 overflow-auto border-b">
        <ProjectsPanel />
      </div>

      {/* Inspiration Panel */}
      <div className="p-4">
        <InspirationPanel />
      </div>
    </aside>
  );
}
