import { Button } from "@/components/ui/button";
import { Loader2, Play, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function clearAllSessions() {
  try {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Clear cookies (best-effort, cannot clear HttpOnly cookies)
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  } catch {
    // Ignore errors
  }
}

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const [clearing, setClearing] = useState(false);

  const handleClearSession = async () => {
    setClearing(true);
    clearAllSessions();
    toast.success("Session cleared. You can now sign in fresh.");
    // Short delay then hard reload to ensure a completely clean state
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/8 blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,45,45,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,45,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center glow-primary">
              <Play className="w-7 h-7 text-white fill-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            SUB <span className="text-primary">PREMIUM</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Your exclusive streaming platform
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card rounded-3xl p-6 border border-border/50"
        >
          <h2 className="text-xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Sign in to access your content
          </p>

          {/* Sign-in explanation — no password needed, auth via Internet Identity */}
          <div className="mb-6 text-center">
            <p className="text-sm text-muted-foreground">
              Tap the button below to sign in securely using Internet Identity —
              no password needed.
            </p>
          </div>

          {isLoginError && (
            <div
              className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive"
              data-ocid="login.error_state"
            >
              {loginError?.message ?? "Login failed. Please try again."}
            </div>
          )}

          <Button
            onClick={login}
            disabled={isLoggingIn || clearing}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base glow-primary transition-all"
            data-ocid="login.submit_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting…
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Secured by Internet Identity
          </p>
        </motion.div>

        {/* Clear Session section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-4"
        >
          <div className="bg-card/50 rounded-2xl p-4 border border-border/30">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Having trouble signing in? Clear your session to start fresh.
            </p>
            <Button
              variant="outline"
              onClick={handleClearSession}
              disabled={clearing || isLoggingIn}
              className="w-full h-10 rounded-xl border-border/50 text-muted-foreground hover:text-foreground hover:border-border text-sm font-medium transition-all"
              data-ocid="login.clear_session_button"
            >
              {clearing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Clearing…
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Clear Session
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 opacity-50">
          © {new Date().getFullYear()}.{" "}
          <span>Built with love using caffeine.ai</span>
        </p>
      </div>
    </div>
  );
}
