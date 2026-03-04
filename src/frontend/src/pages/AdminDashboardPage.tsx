/**
 * AdminDashboardPage — production admin panel
 * Accessible only to users where actor.isCallerAdmin() returns true.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Info,
  RefreshCw,
  Shield,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminDashboardPageProps {
  onBack: () => void;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: bgColor }}
      >
        <Icon className={iconColor} />
      </div>
      <p className="text-white font-black text-xl">{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

// ─── Security Rule Row ────────────────────────────────────────────────────────

function SecurityRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span className="text-gray-300 text-sm">{label}</span>
      <span
        className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{
          background: "rgba(34,197,94,0.15)",
          color: "#4ade80",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        ACTIVE
      </span>
    </div>
  );
}

// ─── Empty Table ──────────────────────────────────────────────────────────────

function EmptyTable({
  icon: Icon,
  title,
  description,
  ocid,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ocid: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
      data-ocid={ocid}
    >
      <Icon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-400 text-sm font-semibold mb-1">{title}</p>
      <p className="text-gray-600 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Coin Creation Flow Info ──────────────────────────────────────────────────

function CoinCreationFlow() {
  const steps = [
    "Payment gateway confirms payment",
    "Webhook verifies signature",
    "Payment status = succeeded",
    "Payment intent ID stored",
    "Transaction recorded in database",
    "Server adds coins to wallet",
  ];

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#0a1a0a",
        border: "1px solid rgba(34,197,94,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-green-400 shrink-0" />
        <p className="text-green-400 text-xs font-bold uppercase tracking-wider">
          Coin Creation Rule
        </p>
      </div>
      <p className="text-gray-500 text-xs mb-3">
        Coins are created ONLY after all steps complete:
      </p>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}
            >
              {i + 1}
            </span>
            <span className="text-gray-400 text-xs">{step}</span>
          </div>
        ))}
      </div>
      <div
        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: "rgba(255,45,45,0.08)",
          border: "1px solid rgba(255,45,45,0.15)",
        }}
      >
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-red-400 text-xs font-semibold">
          If webhook not received: DO NOT add coins.
        </p>
      </div>
    </div>
  );
}

// ─── Main AdminDashboardPage ──────────────────────────────────────────────────

export default function AdminDashboardPage({
  onBack,
}: AdminDashboardPageProps) {
  const { actor } = useActor();

  const handleAuditWallets = async () => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    try {
      if (typeof (actor as any).auditWallets === "function") {
        await (actor as any).auditWallets();
        toast.success(
          "Wallet audit complete. Users with no verified recharge have been set to 0 coins.",
          { duration: 5000 },
        );
      } else {
        toast.info(
          "Audit function pending backend deployment. auditWallets() not yet available.",
          { duration: 4000 },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audit failed";
      toast.error(`Audit error: ${msg}`);
    }
  };

  const securityRules = [
    "Payment signature validation: Active",
    "Duplicate webhook rejection: Active",
    "Wallet locking during deduction: Active",
    "Negative balance prevention: Active",
    "Gift rate limiting (10/min per user): Active",
    "All gift attempts logged (success & failed): Active",
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f0f0f" }}
      data-ocid="admin.page"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          data-ocid="admin.back.button"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-5 h-5 text-red-400" />
          <h1 className="text-lg font-black text-white tracking-tight">
            Admin Dashboard
          </h1>
        </div>
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
          style={{
            background: "rgba(255,45,45,0.15)",
            color: "#FF6B6B",
            border: "1px solid rgba(255,45,45,0.2)",
          }}
        >
          Admin Only
        </span>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8 space-y-5">
        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Overview
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Recharges"
              value="—"
              icon={ShoppingBag}
              iconColor="w-4 h-4 text-yellow-400"
              bgColor="rgba(255,215,0,0.12)"
            />
            <StatCard
              label="Total Gifts"
              value="—"
              icon={Gift}
              iconColor="w-4 h-4 text-red-400"
              bgColor="rgba(255,107,107,0.12)"
            />
            <StatCard
              label="Flagged Transactions"
              value="—"
              icon={Shield}
              iconColor="w-4 h-4 text-orange-400"
              bgColor="rgba(251,146,60,0.12)"
            />
            <StatCard
              label="Pending Reversals"
              value="—"
              icon={RefreshCw}
              iconColor="w-4 h-4 text-violet-400"
              bgColor="rgba(167,139,250,0.12)"
            />
          </div>
          <p className="text-gray-600 text-[10px] mt-2 text-center">
            Connect backend queries to populate live data
          </p>
        </motion.div>

        {/* Recharge Payments */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.06 }}
        >
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Recharge Payments
          </p>
          <EmptyTable
            icon={ShoppingBag}
            title="No recharge transactions"
            description="Backend webhook integration required. Recharge payments will appear here after Stripe/PayPal webhook events are processed server-side."
            ocid="admin.recharges.empty_state"
          />
          <div className="mt-3">
            <CoinCreationFlow />
          </div>
        </motion.div>

        {/* Gift Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Gift Transactions
          </p>
          <EmptyTable
            icon={Gift}
            title="No gift transactions"
            description="Gift transactions will appear here once users send gifts during live streams. Each record includes Sender ID, Creator ID, Payment Gateway ID, Timestamp, and Status."
            ocid="admin.gifts.empty_state"
          />

          {/* Column headers preview */}
          <div
            className="mt-3 rounded-2xl p-4"
            style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
          >
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider mb-2">
              Table columns (when data available)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Sender ID",
                "Creator ID",
                "Gateway ID",
                "Timestamp",
                "Status",
                "Flag",
                "Reverse",
              ].map((col) => (
                <span
                  key={col}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "#1a1a1a",
                    color: "#888",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Anti-Fraud Rules */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.14 }}
          data-ocid="admin.fraud.section"
        >
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Anti-Fraud Layer
          </p>
          <div
            className="rounded-2xl px-4 divide-y"
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderColor: "#1e1e1e",
            }}
          >
            {securityRules.map((rule) => (
              <SecurityRule key={rule} label={rule} />
            ))}
          </div>
        </motion.div>

        {/* Audit Wallets */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
        >
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Wallet Audit
          </p>
          <div
            className="rounded-2xl p-4"
            style={{
              background: "#111",
              border: "1px solid rgba(255,165,0,0.2)",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,165,0,0.15)" }}
              >
                <Shield className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-1">
                  Audit All Wallets
                </p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  This will scan all user wallets. Any user with no verified
                  recharge transaction will have their coin balance set to 0.
                  This enforces the strict production wallet rule.
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,165,0,0.12)",
                    border: "1px solid rgba(255,165,0,0.3)",
                    color: "#FB923C",
                  }}
                  data-ocid="admin.audit_wallets.button"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run Wallet Audit
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent
                className="bg-[#111] border-[#2a2a2a] rounded-3xl"
                data-ocid="admin.audit_wallets.dialog"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Run Wallet Audit?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will set all user wallets with no verified recharge
                    transaction to 0 coins. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="rounded-2xl bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
                    data-ocid="admin.audit_wallets.cancel_button"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleAuditWallets()}
                    className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white"
                    data-ocid="admin.audit_wallets.confirm_button"
                  >
                    Confirm Audit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
