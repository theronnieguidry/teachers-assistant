import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {/* Logo and title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary rounded-lg">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Teacher's Assistant</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered teaching materials
          </p>
        </div>
      </div>

      {/* Auth forms */}
      {isLogin ? (
        <LoginForm onSwitchToSignUp={() => setIsLogin(false)} />
      ) : (
        <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
      )}

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-md">
        Generate worksheets, lesson plans, and answer keys for K-3 students in
        minutes. No design skills required.
      </p>
    </div>
  );
}
