import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDialogOpen(true)}
              aria-label="Send feedback"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Send Feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
