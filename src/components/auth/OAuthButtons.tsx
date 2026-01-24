import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleIcon, AppleIcon } from "@/components/icons/OAuthIcons";
import { useAuth } from "@/hooks/useAuth";
import type { OAuthProvider } from "@/stores/authStore";

interface OAuthButtonsProps {
  onOAuthStart?: () => void;
  onOAuthError?: (error: string) => void;
  disabled?: boolean;
}

export function OAuthButtons({
  onOAuthStart,
  onOAuthError,
  disabled,
}: OAuthButtonsProps) {
  const { signInWithOAuth, isLoading } = useAuth();
  const [oauthLoading, setOAuthLoading] = useState<OAuthProvider | null>(null);

  const handleOAuth = async (provider: OAuthProvider) => {
    setOAuthLoading(provider);
    onOAuthStart?.();

    try {
      await signInWithOAuth(provider);
    } catch (error) {
      let message = "Sign in failed. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("access_denied")) {
          message = "Sign in was cancelled.";
        } else if (error.message.includes("network")) {
          message = "Check your internet connection and try again.";
        } else {
          message = error.message;
        }
      }

      onOAuthError?.(message);
      setOAuthLoading(null);
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
        onClick={() => handleOAuth("google")}
        disabled={isDisabled}
      >
        {oauthLoading === "google" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-5 w-5" />
        )}
        Continue with Google
      </Button>

      <Button
        type="button"
        className="w-full bg-black hover:bg-gray-900 text-white"
        onClick={() => handleOAuth("apple")}
        disabled={isDisabled}
      >
        {oauthLoading === "apple" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <AppleIcon className="mr-2 h-5 w-5" />
        )}
        Continue with Apple
      </Button>
    </div>
  );
}
