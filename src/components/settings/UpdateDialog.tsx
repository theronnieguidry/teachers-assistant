import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UpdateInfo {
  version: string;
  body: string;
  date?: string;
}

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: UpdateInfo | null;
  onUpdate: () => Promise<void>;
}

export function UpdateDialog({
  open,
  onOpenChange,
  updateInfo,
  onUpdate,
}: UpdateDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setDownloading(true);
    setError(null);
    setProgress(0);

    // Simulate progress for better UX (actual download progress is not easily available)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await onUpdate();
      setProgress(100);
      // App will restart automatically
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Update failed");
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={downloading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Available</DialogTitle>
          <DialogDescription>
            A new version of TA Teachers Assistant is available.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {updateInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Version:</span>
                <span className="text-sm text-primary font-semibold">
                  v{updateInfo.version}
                </span>
              </div>
              {updateInfo.date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Release Date:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(updateInfo.date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {updateInfo.body && (
                <div className="mt-3">
                  <span className="text-sm font-medium">What's New:</span>
                  <div className="mt-1 text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {updateInfo.body}
                  </div>
                </div>
              )}
            </div>
          )}

          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Downloading update...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                The app will restart automatically after the update is installed.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {!downloading && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Later
            </Button>
          )}
          <Button onClick={handleUpdate} disabled={downloading}>
            {downloading ? "Installing..." : "Update Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
