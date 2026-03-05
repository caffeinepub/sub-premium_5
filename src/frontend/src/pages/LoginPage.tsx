import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Play } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const [showPassword, setShowPassword] = useState(false);

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

          {/* Demo email/password fields — visual only, actual auth via Internet Identity */}
          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-secondary border-border/50 rounded-xl h-12 focus-visible:ring-primary"
                data-ocid="login.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-secondary border-border/50 rounded-xl h-12 pr-12 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
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
            disabled={isLoggingIn}
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8 opacity-50">
          © {new Date().getFullYear()}.{" "}
          <span>Built with love using caffeine.ai</span>
        </p>
      </div>
    </div>
  );
}
