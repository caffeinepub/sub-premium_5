import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle2, Info, Loader2, Lock, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCheckUsernameAvailable,
  useGetExtendedProfile,
  useSaveExtendedProfile,
} from "../hooks/useQueries";

// ─── Image compression util ────────────────────────────────────────────────

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load error"));
    };
    img.src = objectUrl;
  });
}

// ─── Field component ────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-400 font-medium mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── EditProfilePanel ────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EditProfilePanel({ open, onClose }: Props) {
  const { data: extendedProfile } = useGetExtendedProfile();
  const saveExtendedProfile = useSaveExtendedProfile();
  const checkUsernameAvailable = useCheckUsernameAvailable();

  // Form state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [maskedCardDisplay, setMaskedCardDisplay] = useState<string>("");
  const [isEditingCard, setIsEditingCard] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const originalUsernameRef = useRef<string>("");

  // Pre-fill form when panel opens
  useEffect(() => {
    if (open && extendedProfile) {
      setAvatarUrl(extendedProfile.avatarUrl ?? "");
      setName(extendedProfile.name ?? "");
      const rawUsername = (extendedProfile.username ?? "").replace(/^@/, "");
      setUsername(rawUsername);
      originalUsernameRef.current = rawUsername;
      setBio(extendedProfile.bio ?? "");
      setCardholderName(extendedProfile.cardholderName ?? "");
      setExpiryDate(extendedProfile.expiryDate ?? "");
      setMaskedCardDisplay(extendedProfile.maskedCardNumber ?? "");
      setCardNumber("");
      setCvv("");
      setIsEditingCard(false);
      setErrors({});
      setUsernameStatus("idle");
    } else if (open && !extendedProfile) {
      // No existing profile — start fresh
      setAvatarUrl("");
      setName("");
      setUsername("");
      originalUsernameRef.current = "";
      setBio("");
      setCardholderName("");
      setExpiryDate("");
      setMaskedCardDisplay("");
      setCardNumber("");
      setCvv("");
      setIsEditingCard(false);
      setErrors({});
      setUsernameStatus("idle");
    }
  }, [open, extendedProfile]);

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setAvatarUrl(compressed);
    } catch {
      toast.error("Failed to process image");
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // Username check on blur with debounce
  const handleUsernameChange = (value: string) => {
    // Strip @ if user types it
    const stripped = value.replace(/^@+/, "");
    setUsername(stripped);
    setUsernameStatus("idle");
    setErrors((prev) => ({ ...prev, username: "" }));

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
    }
    if (!stripped) return;

    usernameDebounceRef.current = setTimeout(async () => {
      // Don't check if it's the same as the current username
      if (stripped === originalUsernameRef.current) {
        setUsernameStatus("available");
        return;
      }
      setUsernameStatus("checking");
      try {
        const available = await checkUsernameAvailable.mutateAsync(stripped);
        setUsernameStatus(available ? "available" : "taken");
        if (!available) {
          setErrors((prev) => ({
            ...prev,
            username: "Username is taken",
          }));
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 600);
  };

  // Expiry date auto-format MM/YY
  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      setExpiryDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setExpiryDate(digits);
    }
  };

  // Card number: only digits, max 19
  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    setCardNumber(digits);
  };

  // Validate
  const validate = useCallback(() => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = "Name is required";

    if (!username.trim()) {
      errs.username = "Username is required";
    } else if (usernameStatus === "taken") {
      errs.username = "Username is taken";
    }

    if (bio.length > 160) errs.bio = "Bio must be 160 characters or less";

    // Card validation — only if user is entering new card data
    if (isEditingCard || cardNumber) {
      if (cardNumber && (cardNumber.length < 13 || cardNumber.length > 19)) {
        errs.cardNumber = "Card number must be 13–19 digits";
      }
      if (expiryDate && !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        errs.expiryDate = "Use MM/YY format";
      }
      if (cvv && (cvv.length < 3 || cvv.length > 4)) {
        errs.cvv = "CVV must be 3–4 digits";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [
    name,
    username,
    bio,
    usernameStatus,
    isEditingCard,
    cardNumber,
    expiryDate,
    cvv,
  ]);

  const handleSave = async () => {
    if (!validate()) return;

    // Build masked card number from new input if provided
    let maskedCardNumber = extendedProfile?.maskedCardNumber ?? undefined;
    if (cardNumber && cardNumber.length >= 4) {
      maskedCardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
    }

    const profile = {
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl || undefined,
      cardholderName: cardholderName.trim() || undefined,
      maskedCardNumber,
      expiryDate: expiryDate || undefined,
    };

    try {
      await saveExtendedProfile.mutateAsync(profile);
      toast.success("Profile updated successfully");
      onClose();
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const avatarInitials = name
    ? name.slice(0, 2).toUpperCase()
    : username
      ? username.slice(0, 2).toUpperCase()
      : "??";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="edit-profile-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "#0f0f0f" }}
          data-ocid="edit_profile.panel"
        >
          {/* ── Top bar ── */}
          <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-white/8">
            <h2 className="text-base font-bold text-white tracking-tight">
              Edit Profile
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors active:scale-95"
              aria-label="Close edit profile"
              data-ocid="edit_profile.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="px-4 py-6 space-y-6 pb-32">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Upload profile image"
                  data-ocid="edit_profile.avatar.upload_button"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-white/60">
                      {avatarInitials}
                    </span>
                  )}
                  {/* Camera overlay */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-semibold">
                      Change
                    </span>
                  </div>
                </button>
                <p className="text-xs text-white/40 font-medium">
                  Tap to change photo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void handleFileChange(e)}
                  tabIndex={-1}
                />
              </div>

              {/* ── Profile fields ── */}
              <div className="space-y-4">
                {/* Name */}
                <Field label="Name" error={errors.name}>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Your full name"
                    className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 text-sm focus:border-primary focus:ring-0"
                    autoComplete="name"
                    data-ocid="edit_profile.name.input"
                  />
                </Field>

                {/* Username */}
                <Field label="Username" error={errors.username}>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/50 font-medium select-none pointer-events-none">
                      @
                    </span>
                    <Input
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="username"
                      className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl pl-8 pr-10 text-sm focus:border-primary focus:ring-0"
                      autoComplete="username"
                      autoCapitalize="none"
                      data-ocid="edit_profile.username.input"
                    />
                    {/* Status indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && (
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                      )}
                      {usernameStatus === "available" && username && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  </div>
                </Field>

                {/* Bio */}
                <Field label="Bio" error={errors.bio}>
                  <div className="relative">
                    <Textarea
                      value={bio}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 160) setBio(val);
                        if (errors.bio) setErrors((p) => ({ ...p, bio: "" }));
                      }}
                      placeholder="Tell the world about yourself..."
                      rows={3}
                      maxLength={160}
                      className="bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 py-3 text-sm resize-none focus:border-primary focus:ring-0 min-h-[88px]"
                      data-ocid="edit_profile.bio.textarea"
                    />
                    <span
                      className={`absolute bottom-3 right-3 text-[10px] font-medium tabular-nums ${
                        bio.length > 150 ? "text-red-400" : "text-white/30"
                      }`}
                    >
                      {bio.length} / 160
                    </span>
                  </div>
                </Field>
              </div>

              {/* ── Payment Information ── */}
              <div className="space-y-4">
                {/* Section divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                      Payment Information
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaymentInfoOpen(true)}
                      className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                      aria-label="Payment info"
                      data-ocid="edit_profile.payment_info.button"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Security note */}
                <div className="flex items-start gap-2 bg-white/4 rounded-2xl px-4 py-3">
                  <Lock className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    Payment details are encrypted and used for creator payouts
                    only.
                  </p>
                </div>

                {/* Cardholder Name */}
                <Field label="Cardholder Name" error={errors.cardholderName}>
                  <Input
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Name as it appears on card"
                    className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 text-sm focus:border-primary focus:ring-0"
                    autoComplete="cc-name"
                    data-ocid="edit_profile.cardholder_name.input"
                  />
                </Field>

                {/* Card Number */}
                <Field label="Card Number" error={errors.cardNumber}>
                  {maskedCardDisplay && !isEditingCard ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 bg-white/6 border border-white/12 rounded-2xl px-4 flex items-center text-sm text-white/60 font-mono tracking-wider">
                        {maskedCardDisplay}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingCard(true)}
                        className="h-12 px-4 rounded-2xl bg-white/8 text-white/60 hover:text-white hover:bg-white/12 text-xs font-semibold transition-colors"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <Input
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      placeholder="Card number (digits only)"
                      inputMode="numeric"
                      className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 text-sm font-mono tracking-wider focus:border-primary focus:ring-0"
                      autoComplete="cc-number"
                      data-ocid="edit_profile.card_number.input"
                    />
                  )}
                </Field>

                {/* Expiry + CVV row */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry Date" error={errors.expiryDate}>
                    <Input
                      value={expiryDate}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 text-sm font-mono focus:border-primary focus:ring-0"
                      autoComplete="cc-exp"
                      data-ocid="edit_profile.expiry_date.input"
                    />
                  </Field>
                  <Field label="CVV" error={errors.cvv}>
                    <Input
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      type="password"
                      placeholder="•••"
                      inputMode="numeric"
                      className="h-12 bg-white/6 border-white/12 text-white placeholder:text-white/30 rounded-2xl px-4 text-sm font-mono focus:border-primary focus:ring-0"
                      autoComplete="cc-csc"
                      data-ocid="edit_profile.cvv.input"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fixed bottom buttons ── */}
          <div
            className="shrink-0 px-4 pt-3 pb-6 border-t border-white/8 flex gap-3"
            style={{ background: "#0f0f0f" }}
          >
            <Button
              type="button"
              onClick={handleCancel}
              disabled={saveExtendedProfile.isPending}
              className="flex-1 h-13 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border-0 transition-colors"
              data-ocid="edit_profile.cancel.button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                saveExtendedProfile.isPending || usernameStatus === "taken"
              }
              className="flex-1 h-13 rounded-2xl font-bold text-sm text-white border-0 transition-all active:scale-[0.98]"
              style={{
                background: saveExtendedProfile.isPending
                  ? "oklch(0.35 0.1 27)"
                  : "linear-gradient(135deg, #FF2D2D 0%, #CC1010 100%)",
                boxShadow: saveExtendedProfile.isPending
                  ? "none"
                  : "0 4px 20px oklch(0.57 0.26 27 / 0.4)",
              }}
              data-ocid="edit_profile.save.button"
            >
              {saveExtendedProfile.isPending ? (
                <span
                  className="flex items-center gap-2"
                  data-ocid="edit_profile.save.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>

          {/* ── Payment Info Dialog ── */}
          <Dialog open={paymentInfoOpen} onOpenChange={setPaymentInfoOpen}>
            <DialogContent
              className="bg-[#1a1a1a] border-white/10 rounded-3xl max-w-xs mx-auto"
              data-ocid="edit_profile.payment_info.dialog"
            >
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <DialogTitle className="text-sm font-bold text-white">
                    Payment Security
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-white/60 leading-relaxed pt-1">
                  Your payment details are securely encrypted and used for
                  creator payouts only. We never share your financial
                  information with third parties.
                </DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                onClick={() => setPaymentInfoOpen(false)}
                className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border-0 mt-2"
                data-ocid="edit_profile.payment_info.close_button"
              >
                Got it
              </Button>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
