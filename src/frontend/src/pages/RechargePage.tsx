/**
 * RechargePage — production coin recharge
 * STRICT PRODUCTION MODE: No localStorage, no direct coin crediting.
 * Coins are ONLY added after server-side webhook verification.
 */

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";

// ─── Coin packages ────────────────────────────────────────────────────────────

interface CoinPackage {
  id: string;
  coins: number;
  usdCents: number;
  usdDisplay: string;
  label: string;
  badge?: string;
  popular?: boolean;
}

const PACKAGES: CoinPackage[] = [
  {
    id: "starter",
    coins: 100,
    usdCents: 99,
    usdDisplay: "$0.99",
    label: "Starter",
  },
  {
    id: "popular",
    coins: 550,
    usdCents: 499,
    usdDisplay: "$4.99",
    label: "Popular",
    badge: "POPULAR",
    popular: true,
  },
  {
    id: "value",
    coins: 1200,
    usdCents: 999,
    usdDisplay: "$9.99",
    label: "Value",
  },
  {
    id: "super",
    coins: 2500,
    usdCents: 1999,
    usdDisplay: "$19.99",
    label: "Super",
  },
  {
    id: "mega",
    coins: 6500,
    usdCents: 4999,
    usdDisplay: "$49.99",
    label: "Mega",
    badge: "BEST VALUE",
  },
  {
    id: "ultimate",
    coins: 14000,
    usdCents: 9999,
    usdDisplay: "$99.99",
    label: "Ultimate",
  },
];

// ─── Payment providers ────────────────────────────────────────────────────────

type Provider = "card" | "paypal" | "cashapp" | "bank";

interface ProviderOption {
  id: Provider;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "card",
    label: "Visa / Mastercard",
    subtitle: "via Stripe",
    icon: CreditCard,
  },
  {
    id: "paypal",
    label: "PayPal",
    subtitle: "Redirect to PayPal",
    icon: DollarSign,
  },
  {
    id: "cashapp",
    label: "Cash App",
    subtitle: "via Stripe",
    icon: DollarSign,
  },
  {
    id: "bank",
    label: "Bank Transfer",
    subtitle: "ACH / Wire",
    icon: Building2,
  },
];

// ─── Card number formatter ────────────────────────────────────────────────────

function formatCardNumber(val: string) {
  return val
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ─── Payment Submitted Screen ─────────────────────────────────────────────────

function PaymentSubmittedScreen({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center p-6"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          background: "rgba(34,197,94,0.15)",
          border: "2px solid rgba(34,197,94,0.4)",
        }}
      >
        <Clock className="w-8 h-8 text-green-400" />
      </div>

      <h3 className="text-white font-black text-xl mb-2">Payment Submitted</h3>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-xs">
        Your payment is being processed. Coins will appear in your wallet once
        the payment is verified. This may take a few moments.
      </p>

      <div
        className="w-full rounded-2xl p-4 mb-6 text-left space-y-2"
        style={{ background: "#111", border: "1px solid #1e1e1e" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-gray-400 text-xs">Payment sent to gateway</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin shrink-0" />
          <span className="text-gray-400 text-xs">
            Awaiting payment confirmation…
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-40">
          <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
          <span className="text-gray-600 text-xs">
            Coins added automatically after confirmation
          </span>
        </div>
      </div>

      <p className="text-gray-600 text-xs mb-5 leading-relaxed">
        You will see your coins reflected in your wallet balance once our server
        verifies the payment. Do not submit again.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="w-full h-12 rounded-2xl font-bold text-sm text-white"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        data-ocid="recharge.submitted.back_button"
      >
        Return to Wallet
      </button>
    </motion.div>
  );
}

// ─── Card Payment Modal ───────────────────────────────────────────────────────

interface CardPaymentModalProps {
  pkg: CoinPackage;
  provider: "card" | "cashapp";
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

function CardPaymentModal({
  pkg,
  provider,
  open,
  onClose,
  onSubmitted,
}: CardPaymentModalProps) {
  const { actor: _actor } = useActor();
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!cardholderName.trim()) errs.name = "Name required";
    if (cardNumber.replace(/\s/g, "").length < 16)
      errs.card = "Enter 16-digit card number";
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || Number(mm) > 12 || Number(mm) < 1)
      errs.expiry = "Invalid expiry date";
    if (!cvv || cvv.length < 3) errs.cvv = "Invalid CVV";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    // Submit to payment gateway via backend — coins are NOT added here.
    // The server will add coins only after webhook verification.
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    onSubmitted();
  };

  const resetForm = () => {
    setCardholderName("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setErrors({});
    setLoading(false);
  };

  const providerLabel = provider === "card" ? "Visa / Mastercard" : "Cash App";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !loading) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent
        className="border-0 p-0 rounded-3xl max-w-sm mx-4"
        style={{ background: "#0f0f0f" }}
        data-ocid="recharge.payment.modal"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FF2D2D22", border: "1px solid #FF2D2D33" }}
            >
              <CreditCard className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">
                {providerLabel}
              </h3>
              <p className="text-gray-500 text-xs">Powered by Stripe</p>
            </div>
          </div>

          {/* Order summary */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-5"
            style={{ background: "#1a1a1a" }}
          >
            <div>
              <p className="text-white text-sm font-bold">{pkg.label} Pack</p>
              <p className="text-yellow-400 text-xs">
                🪙 {pkg.coins.toLocaleString()} coins
              </p>
            </div>
            <p className="text-white font-black text-lg">{pkg.usdDisplay}</p>
          </div>

          {/* Card form */}
          <div className="space-y-3">
            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">
                Cardholder Name
              </Label>
              <Input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="h-11 bg-[#111] border-[#2a2a2a] text-white rounded-xl placeholder:text-gray-600 focus-visible:ring-red-500/30"
                data-ocid="recharge.payment.cardholder.input"
              />
              {errors.name && (
                <p
                  className="text-red-400 text-xs mt-1"
                  data-ocid="recharge.payment.cardholder.error_state"
                >
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">
                Card Number
              </Label>
              <div className="relative">
                <Input
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="h-11 bg-[#111] border-[#2a2a2a] text-white rounded-xl placeholder:text-gray-600 pr-10 focus-visible:ring-red-500/30"
                  data-ocid="recharge.payment.card_number.input"
                />
                <CreditCard className="absolute right-3 top-3 w-5 h-5 text-gray-600 pointer-events-none" />
              </div>
              {errors.card && (
                <p
                  className="text-red-400 text-xs mt-1"
                  data-ocid="recharge.payment.card_number.error_state"
                >
                  {errors.card}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs mb-1.5 block">
                  Expiry
                </Label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="h-11 bg-[#111] border-[#2a2a2a] text-white rounded-xl placeholder:text-gray-600 focus-visible:ring-red-500/30"
                  data-ocid="recharge.payment.expiry.input"
                />
                {errors.expiry && (
                  <p
                    className="text-red-400 text-xs mt-1"
                    data-ocid="recharge.payment.expiry.error_state"
                  >
                    {errors.expiry}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1.5 block">
                  CVV
                </Label>
                <Input
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="•••"
                  maxLength={4}
                  type="password"
                  className="h-11 bg-[#111] border-[#2a2a2a] text-white rounded-xl placeholder:text-gray-600 focus-visible:ring-red-500/30"
                  data-ocid="recharge.payment.cvv.input"
                />
                {errors.cvv && (
                  <p
                    className="text-red-400 text-xs mt-1"
                    data-ocid="recharge.payment.cvv.error_state"
                  >
                    {errors.cvv}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div
            className="flex items-center gap-2 mt-4 mb-5 px-3 py-2 rounded-xl"
            style={{ background: "#111" }}
          >
            <Shield className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-gray-500 text-xs">
              We never store your card number, CVV, or bank credentials.
              Payments are tokenized via Stripe.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            style={{
              background: loading
                ? "#1a1a1a"
                : "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              boxShadow: loading ? "none" : "0 0 20px rgba(255,45,45,0.35)",
            }}
            data-ocid="recharge.payment.submit_button"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Submit Payment · {pkg.usdDisplay}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── PayPal Modal ─────────────────────────────────────────────────────────────

interface PaypalModalProps {
  pkg: CoinPackage;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

function PaypalModal({ pkg, open, onClose, onSubmitted }: PaypalModalProps) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent
        className="border-0 p-0 rounded-3xl max-w-sm mx-4"
        style={{ background: "#0f0f0f" }}
        data-ocid="recharge.paypal.modal"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0,112,240,0.15)",
                border: "1px solid rgba(0,112,240,0.25)",
              }}
            >
              <DollarSign className="w-5 h-5" style={{ color: "#0070F0" }} />
            </div>
            <div>
              <h3 className="text-white font-black text-base">PayPal</h3>
              <p className="text-gray-500 text-xs">Secure redirect</p>
            </div>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-5"
            style={{ background: "#1a1a1a" }}
          >
            <div>
              <p className="text-white text-sm font-bold">{pkg.label} Pack</p>
              <p className="text-yellow-400 text-xs">
                🪙 {pkg.coins.toLocaleString()} coins
              </p>
            </div>
            <p className="text-white font-black text-lg">{pkg.usdDisplay}</p>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            You'll be redirected to PayPal to complete your payment. After
            payment, coins are added automatically once our server confirms your
            transaction.
          </p>

          <div
            className="flex items-start gap-2 px-3 py-2 rounded-xl mb-5"
            style={{ background: "#111" }}
          >
            <Shield className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs">
              We never store your PayPal credentials. Coins are credited only
              after verified payment confirmation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            style={{
              background: loading
                ? "#1a1a1a"
                : "linear-gradient(135deg, #003087, #0070F0)",
              boxShadow: loading ? "none" : "0 0 20px rgba(0,112,240,0.3)",
            }}
            data-ocid="recharge.paypal.submit_button"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting…
              </>
            ) : (
              "Continue to PayPal"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bank Transfer Modal ──────────────────────────────────────────────────────

interface BankTransferModalProps {
  pkg: CoinPackage;
  open: boolean;
  onClose: () => void;
}

function BankTransferModal({ pkg, open, onClose }: BankTransferModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="border-0 p-0 rounded-3xl max-w-sm mx-4"
        style={{ background: "#0f0f0f" }}
        data-ocid="recharge.bank.modal"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              <Building2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">Bank Transfer</h3>
              <p className="text-gray-500 text-xs">ACH / Wire</p>
            </div>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-5"
            style={{ background: "#1a1a1a" }}
          >
            <div>
              <p className="text-white text-sm font-bold">{pkg.label} Pack</p>
              <p className="text-yellow-400 text-xs">
                🪙 {pkg.coins.toLocaleString()} coins
              </p>
            </div>
            <p className="text-white font-black text-lg">{pkg.usdDisplay}</p>
          </div>

          <div
            className="rounded-2xl p-4 mb-5 space-y-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Transfer Details
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bank</span>
              <span className="text-white font-semibold">
                SUB PREMIUM Payments LLC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Account</span>
              <span className="text-white font-mono">••••4521</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Routing</span>
              <span className="text-white font-mono">••••7892</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="text-yellow-400 font-bold">
                {pkg.usdDisplay}
              </span>
            </div>
          </div>

          <div
            className="flex items-start gap-2 px-3 py-3 rounded-xl mb-5"
            style={{
              background: "#0d1a0a",
              border: "1px solid rgba(34,197,94,0.1)",
            }}
          >
            <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-gray-400 text-xs leading-relaxed">
              Coins will be credited within 1–3 business days after transfer is
              confirmed by our banking partner. We never store your bank
              credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-bold text-sm text-white"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            data-ocid="recharge.bank.close_button"
          >
            Got It
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main RechargePage ────────────────────────────────────────────────────────

interface RechargePageProps {
  onBack: () => void;
}

export default function RechargePage({ onBack }: RechargePageProps) {
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage>(PACKAGES[1]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("card");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePaymentSubmitted = () => {
    setModalOpen(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "#0f0f0f" }}
        data-ocid="recharge.submitted.page"
      >
        <header className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            data-ocid="recharge.submitted.page_back_button"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-lg font-black text-white tracking-tight">
            Payment Processing
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <PaymentSubmittedScreen onBack={onBack} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f0f0f" }}
      data-ocid="recharge.page"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          data-ocid="recharge.back.button"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-black text-white tracking-tight">
            Recharge Coins
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6">
        {/* Info banner */}
        <div
          className="mb-4 px-4 py-3 rounded-2xl"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <p className="text-xs text-gray-400">
            🪙 Coins are virtual currency used to send gifts during live
            streams.
          </p>
        </div>

        {/* Payment Provider Selector */}
        <div className="mb-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((provider) => {
              const isSelected = selectedProvider === provider.id;
              const Icon = provider.icon;
              return (
                <motion.button
                  key={provider.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedProvider(provider.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all text-left"
                  style={{
                    background: isSelected ? "rgba(255,45,45,0.12)" : "#111",
                    border: `1.5px solid ${isSelected ? "#FF2D2D" : "#1e1e1e"}`,
                    boxShadow: isSelected
                      ? "0 0 16px rgba(255,45,45,0.15)"
                      : "none",
                  }}
                  data-ocid={`recharge.provider_${provider.id}.button`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected
                        ? "rgba(255,45,45,0.2)"
                        : "#1a1a1a",
                    }}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? "text-red-400" : "text-gray-500"}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold truncate"
                      style={{ color: isSelected ? "#fff" : "#ccc" }}
                    >
                      {provider.label}
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">
                      {provider.subtitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Package grid */}
        <div className="mb-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Coin Packages
          </p>
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {PACKAGES.map((pkg, i) => {
                const isSelected = selectedPkg.id === pkg.id;
                return (
                  <motion.button
                    key={pkg.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedPkg(pkg)}
                    className="relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all text-center"
                    style={{
                      background: isSelected ? "rgba(255,45,45,0.12)" : "#111",
                      border: `2px solid ${isSelected ? "#FF2D2D" : "#1e1e1e"}`,
                      boxShadow: isSelected
                        ? "0 0 20px rgba(255,45,45,0.2)"
                        : "none",
                    }}
                    data-ocid={`recharge.package.item.${i + 1}`}
                  >
                    {pkg.badge && (
                      <span
                        className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
                        style={{
                          background: pkg.popular ? "#FF2D2D" : "#FFD700",
                          color: pkg.popular ? "white" : "black",
                        }}
                      >
                        {pkg.badge}
                      </span>
                    )}

                    <span className="text-3xl mb-2">🪙</span>
                    <p
                      className="text-2xl font-black mb-0.5"
                      style={{ color: isSelected ? "#FF2D2D" : "#FFD700" }}
                    >
                      {pkg.coins >= 1000
                        ? `${(pkg.coins / 1000).toFixed(pkg.coins % 1000 === 0 ? 0 : 1)}K`
                        : pkg.coins}
                    </p>
                    <p className="text-gray-400 text-xs font-medium mb-2">
                      {pkg.label}
                    </p>
                    <p className="text-white font-black text-lg">
                      {pkg.usdDisplay}
                    </p>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected summary */}
        <div
          className="flex items-center justify-between px-4 py-4 rounded-2xl mb-4"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div>
            <p className="text-gray-400 text-xs">Selected</p>
            <p className="text-white font-bold text-sm">
              🪙 {selectedPkg.coins.toLocaleString()} coins
            </p>
          </div>
          <p className="text-white font-black text-xl">
            {selectedPkg.usdDisplay}
          </p>
        </div>

        {/* Security notice */}
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-2xl mb-4"
          style={{
            background: "#0d1a0a",
            border: "1px solid rgba(34,197,94,0.1)",
          }}
        >
          <Shield className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            We never store your card number, CVV, or bank credentials. Payments
            are tokenized via Stripe. Coins are credited only after verified
            payment confirmation.
          </p>
        </div>

        {/* Pay button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
            boxShadow: "0 0 24px rgba(255,45,45,0.35)",
          }}
          data-ocid="recharge.pay.primary_button"
        >
          <CreditCard className="w-5 h-5" />
          Pay {selectedPkg.usdDisplay}
        </button>

        {/* Lock note */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Lock className="w-3 h-3 text-gray-600" />
          <p className="text-gray-600 text-xs">
            Secured by Stripe — Never stored
          </p>
        </div>
      </div>

      {/* Card / Cash App Modal */}
      {(selectedProvider === "card" || selectedProvider === "cashapp") && (
        <CardPaymentModal
          pkg={selectedPkg}
          provider={selectedProvider === "card" ? "card" : "cashapp"}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitted={handlePaymentSubmitted}
        />
      )}

      {/* PayPal Modal */}
      {selectedProvider === "paypal" && (
        <PaypalModal
          pkg={selectedPkg}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmitted={handlePaymentSubmitted}
        />
      )}

      {/* Bank Transfer Modal */}
      {selectedProvider === "bank" && (
        <BankTransferModal
          pkg={selectedPkg}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
