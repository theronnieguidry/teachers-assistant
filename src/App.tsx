import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { AuthGuard } from "@/components/auth";
import { Dashboard } from "@/components/layout/Dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { PurchaseSuccessPage, PurchaseCancelPage } from "@/components/purchase";

// Wrapper component for purchase success to read URL params
function PurchaseSuccessRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id") ?? undefined;

  return (
    <PurchaseSuccessPage
      sessionId={sessionId}
      onContinue={() => navigate("/")}
    />
  );
}

// Wrapper component for purchase cancel
function PurchaseCancelRoute() {
  const navigate = useNavigate();
  return <PurchaseCancelPage onReturn={() => navigate("/")} />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/purchase/success"
            element={
              <AuthGuard>
                <PurchaseSuccessRoute />
              </AuthGuard>
            }
          />
          <Route
            path="/purchase/cancel"
            element={
              <AuthGuard>
                <PurchaseCancelRoute />
              </AuthGuard>
            }
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
