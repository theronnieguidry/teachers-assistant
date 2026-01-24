import { AuthGuard } from "@/components/auth";
import { Dashboard } from "@/components/layout/Dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
