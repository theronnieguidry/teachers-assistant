import { useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { CreationPanel } from "@/components/panels/CreationPanel";
import { ProjectsPanel } from "@/components/panels/ProjectsPanel";
import { InspirationPanel } from "@/components/panels/InspirationPanel";
import { DesignPacksPanel } from "@/components/design-packs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function Sidebar() {
  const [designPacksOpen, setDesignPacksOpen] = useState(false);

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
      <div className="p-4 border-b">
        <InspirationPanel />
      </div>

      {/* Design Packs Panel (Issue #20) */}
      <Collapsible open={designPacksOpen} onOpenChange={setDesignPacksOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-medium hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Design Packs
          </div>
          {designPacksOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <DesignPacksPanel />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
