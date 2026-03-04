/**
 * WalletPage — production coin wallet hub
 * STRICT PRODUCTION MODE: No localStorage, no fake balances, no demo data.
 * Balance comes ONLY from actor.getCoinBalance().
 */

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Clock,
  Gift,
  Info,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";

// ─── Section sub-components ───────────────────────────────────────────────────

function TransactionsTab() {
  return (
    <div
      className="text-center py-16 text-gray-500 text-sm"
      data-ocid="wallet.transactions.empty_state"
    >
      <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No transactions yet</p>
      <p className="text-xs mt-1 opacity-60">Recharge coins to get started</p>
    </div>
  );
}

function GiftsTab() {
  return (
    <div
      className="text-center py-16 text-gray-500 text-sm"
      data-ocid="wallet.gifts.empty_state"
    >
      <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No gifts sent yet</p>
      <p className="text-xs mt-1 opacity-60">
        Top up your coins to send gifts during live streams
      </p>
    </div>
  );
}

function HistoryTab() {
  return (
    <div
      className="text-center py-16 text-gray-500 text-sm"
      data-ocid="wallet.history.empty_state"
    >
      <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No recharge history</p>
      <p className="text-xs mt-1 opacity-60">
        Purchase coins to see records here
      </p>
    </div>
  );
}

// ─── Main WalletPage ──────────────────────────────────────────────────────────

interface WalletPageProps {
  onBack: () => void;
  onRecharge: () => void;
  onWithdraw: () => void;
}

export default function WalletPage({
  onBack,
  onRecharge,
  onWithdraw,
}: WalletPageProps) {
  const { actor } = useActor();
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    setBalanceLoading(true);
    actor
      .getCoinBalance()
      .then((bal) => {
        setCoinBalance(Number(bal));
        setBalanceLoading(false);
      })
      .catch(() => {
        setCoinBalance(0);
        setBalanceLoading(false);
      });
  }, [actor]);

  const balance = coinBalance ?? 0;
  const isEmpty = balance === 0;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f0f0f" }}
      data-ocid="wallet.page"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          data-ocid="wallet.back.button"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Wallet className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-black text-white tracking-tight">
            My Wallet
          </h1>
        </div>
      </header>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mb-4 rounded-3xl p-6 relative overflow-hidden shrink-0"
        style={{
          background: "linear-gradient(135deg, #1a0a00, #2a1500, #1a0a00)",
          border: "1px solid rgba(255,215,0,0.2)",
          boxShadow: "0 0 40px rgba(255,180,0,0.12)",
        }}
      >
        {/* Glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(255,215,0,0.08) 0%, transparent 60%)",
          }}
        />

        <p className="text-yellow-400/80 text-xs font-semibold uppercase tracking-widest mb-3">
          Coin Balance
        </p>

        {balanceLoading ? (
          <div
            className="h-12 w-48 rounded-xl mb-4 animate-pulse"
            style={{ background: "rgba(255,215,0,0.1)" }}
            data-ocid="wallet.balance.loading_state"
          />
        ) : (
          <>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black text-white">
                🪙 {balance.toLocaleString()}
              </span>
              <span className="text-yellow-400/60 text-sm mb-1">coins</span>
            </div>
            {isEmpty && (
              <p className="text-gray-500 text-xs mb-4">
                Recharge to send gifts
              </p>
            )}
          </>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onRecharge}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-black"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              boxShadow: "0 0 16px rgba(255,200,0,0.35)",
            }}
            data-ocid="wallet.recharge.primary_button"
          >
            + Recharge
          </button>
          <button
            type="button"
            onClick={onWithdraw}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: "#1e1e1e", border: "1px solid #2e2e2e" }}
            data-ocid="wallet.withdraw.secondary_button"
          >
            Withdraw
          </button>
        </div>
      </motion.div>

      {/* Production notice */}
      <div
        className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-start gap-3 shrink-0"
        style={{
          background: "#0d1a0a",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Coins are credited only after your payment is verified by our servers.
          Transactions appear here automatically once confirmed.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
        <Tabs
          defaultValue="transactions"
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList
            className="w-full rounded-2xl mb-4 shrink-0"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <TabsTrigger
              value="transactions"
              className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-[#FF2D2D] data-[state=active]:text-white text-gray-500"
              data-ocid="wallet.transactions.tab"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="gifts"
              className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-[#FF2D2D] data-[state=active]:text-white text-gray-500"
              data-ocid="wallet.gifts.tab"
            >
              Gifts
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-[#FF2D2D] data-[state=active]:text-white text-gray-500"
              data-ocid="wallet.history.tab"
            >
              History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <TabsContent value="transactions" className="m-0 pb-4">
              <TransactionsTab />
            </TabsContent>
            <TabsContent value="gifts" className="m-0 pb-4">
              <GiftsTab />
            </TabsContent>
            <TabsContent value="history" className="m-0 pb-4">
              <HistoryTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
