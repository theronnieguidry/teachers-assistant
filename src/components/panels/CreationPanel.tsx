import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/wizardStore";

export function CreationPanel() {
  const [prompt, setPrompt] = useState("");
  const openWizard = useWizardStore((state) => state.openWizard);

  const handleCreate = () => {
    if (prompt.trim().length < 10) return;
    openWizard(prompt.trim());
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleCreate();
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        What are we creating today?
      </h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to create...&#10;&#10;Example: Create a worksheet about adding two-digit numbers with regrouping for 2nd graders"
        className="w-full h-24 px-3 py-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
      />
      <Button
        onClick={handleCreate}
        disabled={prompt.trim().length < 10}
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Create
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Ctrl+Enter to create
      </p>
    </div>
  );
}
