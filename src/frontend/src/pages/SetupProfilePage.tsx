import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

export default function SetupProfilePage() {
  const [username, setUsername] = useState("");
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    try {
      await saveProfile.mutateAsync(trimmed);
      toast.success("Profile created!");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-3xl p-8 border border-border/50"
        >
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-1">
            Choose a username
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-8">
            This is how others will see you on SUB PREMIUM
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@yourname"
                className="bg-secondary border-border/50 rounded-xl h-12 focus-visible:ring-primary"
                maxLength={32}
                autoFocus
                data-ocid="setup.input"
              />
            </div>

            <Button
              type="submit"
              disabled={!username.trim() || saveProfile.isPending}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base glow-primary transition-all"
              data-ocid="setup.submit_button"
            >
              {saveProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
