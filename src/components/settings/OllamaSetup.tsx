import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  checkOllamaStatus,
  installOllama,
  startOllama,
  stopOllama,
  pullOllamaModel,
  listOllamaModels,
  getRecommendedModels,
  isTauriContext,
  type OllamaStatus,
  type OllamaModel,
  type RecommendedModel,
} from "@/services/tauri-bridge";

interface OllamaSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SetupStep = "checking" | "not-installed" | "not-running" | "no-models" | "ready";

export function OllamaSetup({ open, onOpenChange }: OllamaSetupProps) {
  const [step, setStep] = useState<SetupStep>("checking");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const checkStatus = useCallback(async () => {
    setStep("checking");
    setError(null);
    try {
      const ollamaStatus = await checkOllamaStatus();
      setStatus(ollamaStatus);

      if (!ollamaStatus.installed) {
        setStep("not-installed");
      } else if (!ollamaStatus.running) {
        setStep("not-running");
      } else if (ollamaStatus.models.length === 0) {
        setStep("no-models");
        // Load recommended models
        const recommended = await getRecommendedModels();
        setRecommendedModels(recommended);
      } else {
        setStep("ready");
        const modelList = await listOllamaModels();
        setModels(modelList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check Ollama status");
      setStep("not-installed");
    }
  }, []);

  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open, checkStatus]);

  const handleInstall = async () => {
    setLoading(true);
    setError(null);
    setProgress("Downloading Ollama installer...");
    try {
      await installOllama();
      setProgress("Installation complete!");
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setProgress("Starting Ollama server...");
    try {
      await startOllama();
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Ollama");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopOllama();
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop Ollama");
    } finally {
      setLoading(false);
    }
  };

  const handlePullModel = async (modelName: string) => {
    setLoading(true);
    setError(null);
    setProgress(`Downloading ${modelName}... This may take a few minutes.`);
    try {
      await pullOllamaModel(modelName);
      setProgress("Model downloaded successfully!");
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download model");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const renderContent = () => {
    if (step === "checking") {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Checking Ollama status...</p>
        </div>
      );
    }

    if (step === "not-installed") {
      const inTauri = isTauriContext();
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Install Ollama</CardTitle>
              <CardDescription>
                Ollama is a free, local AI that runs on your computer. No API keys or
                internet connection required after setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Benefits of using Ollama:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Completely free to use</li>
                  <li>Your data stays on your computer</li>
                  <li>Works offline after initial setup</li>
                  <li>Great for K-6 educational content</li>
                </ul>
              </div>
              {progress && (
                <p className="text-sm text-primary">{progress}</p>
              )}
              {inTauri ? (
                <Button onClick={handleInstall} disabled={loading} className="w-full">
                  {loading ? "Installing..." : "Install Ollama"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600">
                    Running in browser mode. Please install Ollama manually:
                  </p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Download from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-primary underline">ollama.com/download</a></li>
                    <li>Run the installer</li>
                    <li>Open a terminal and run: <code className="bg-muted px-1 rounded">ollama serve</code></li>
                  </ol>
                  <Button onClick={checkStatus} variant="outline" className="w-full mt-2">
                    Check Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (step === "not-running") {
      const inTauri = isTauriContext();
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Start Ollama</CardTitle>
              <CardDescription>
                Ollama is installed but not running. Start the server to begin
                generating content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.version && (
                <p className="text-sm text-muted-foreground">
                  Version: {status.version}
                </p>
              )}
              {progress && (
                <p className="text-sm text-primary">{progress}</p>
              )}
              {inTauri ? (
                <Button onClick={handleStart} disabled={loading} className="w-full">
                  {loading ? "Starting..." : "Start Ollama Server"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600">
                    Running in browser mode. Please start Ollama manually:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Open a terminal and run: <code className="bg-muted px-1 rounded">ollama serve</code>
                  </p>
                  <Button onClick={checkStatus} variant="outline" className="w-full mt-2">
                    Check Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (step === "no-models") {
      const inTauri = isTauriContext();
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download a Model</CardTitle>
              <CardDescription>
                Ollama is running, but you need to download a model to generate
                content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {progress && (
                <p className="text-sm text-primary mb-4">{progress}</p>
              )}
              {inTauri ? (
                <>
                  <Button
                    onClick={() => handlePullModel("llama3.2")}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Downloading..." : "Download Recommended Model (llama3.2)"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    ~2GB download, works great for K-6 educational content
                  </p>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or choose another model
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {recommendedModels
                      .filter(([name]) => name !== "llama3.2")
                      .map(([name, size, description]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {size} - {description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePullModel(name)}
                          disabled={loading}
                        >
                          {loading ? "..." : "Download"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600">
                    Running in browser mode. Please download a model manually:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Open a terminal and run: <code className="bg-muted px-1 rounded">ollama pull llama3.2</code>
                  </p>
                  <Button onClick={checkStatus} variant="outline" className="w-full mt-2">
                    Check Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Ready state
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Ollama is Ready
            </CardTitle>
            <CardDescription>
              You can now generate content using your local AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.version && (
              <p className="text-sm text-muted-foreground">
                Version: {status.version}
              </p>
            )}
            <div>
              <p className="text-sm font-medium mb-2">Installed Models:</p>
              <div className="space-y-1">
                {models.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="text-sm">{model.name}</span>
                    {model.size && (
                      <span className="text-xs text-muted-foreground">
                        {model.size}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("no-models")}
                className="flex-1"
              >
                Add Model
              </Button>
              <Button
                variant="outline"
                onClick={handleStop}
                disabled={loading}
                className="flex-1"
              >
                Stop Server
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Local AI Setup</DialogTitle>
          <DialogDescription>
            Configure Ollama for free, private AI content generation.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        {renderContent()}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
