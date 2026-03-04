# SUB PREMIUM

## Current State

- Backend `getUserBalance()` returns a **hardcoded default of 1,000 coins** for new users.
- `addCoins()` is a public function that can be called directly from the frontend without any payment verification.
- `sendLiveGift()` deducts coins and appends the gift in one step, no transactional safeguards.
- No payment transaction records exist in the backend.
- No webhook verification, no duplicate-rejection, no wallet locking.
- No admin dashboard functions for viewing recharge/gift transactions or flagging/reversing them.
- Frontend `RechargePage` simulates payment client-side (setTimeout + direct `addCoins` call); stores recharge/transaction history in **localStorage**.
- Frontend `WalletPage` reads all history from **localStorage**.
- Frontend `WithdrawPage` stores withdrawal history in **localStorage**.
- Frontend `LiveWatchPage` triggers gift broadcast animation locally before backend confirms success.
- Frontend `WalletPage` shows live coin balance from backend but all history is mock.

## Requested Changes (Diff)

### Add

- Backend: `PaymentTransaction` type — stores paymentIntentId, amount, coins, provider, status, webhook-verified flag, timestamp, userId.
- Backend: `GiftTransaction` type — stores txId, streamId, senderId, creatorId, giftType, coinValue, timestamp, status.
- Backend: `rechargeTransactions` and `giftTransactions` maps.
- Backend: `webhookAddCoins(userId, amount, paymentIntentId, webhookSignature)` — admin-only function that verifies payment signature, rejects duplicate paymentIntentId, then credits coins. This is the **only** way coins are created.
- Backend: `sendGiftVerified(streamId, giftType, coinValue)` — atomic gift send: verify balance, deduct coins in same update, insert gift transaction, update creator pending balance, return unique txId. Traps on any failure.
- Backend: `getRechargeTransactions()` — admin-only, returns all recharge records.
- Backend: `getGiftTransactions()` — admin-only, returns all gift records.
- Backend: `flagTransaction(txId, reason)` — admin-only, marks a transaction as flagged.
- Backend: `reverseGiftTransaction(txId)` — admin-only, refunds coins to sender, marks gift transaction as reversed.
- Backend: `auditWallets()` — admin-only, sets all users with no recharge transaction to 0 coins.
- Backend: `creatorPendingBalance` map — tracks per-creator gift earnings not yet withdrawn.
- Backend: `getCreatorPendingBalance()` — returns caller's pending balance.
- Frontend: `AdminDashboardPage` — shows all recharge payments, all gift transactions, sender ID, creator ID, payment gateway ID, timestamp, status; flag and reverse buttons.
- Frontend: Payment provider selector on RechargePage — Visa/Mastercard (Stripe), PayPal, Cash App (Stripe), Bank Transfer; shows real provider logos/labels; no card fields stored.
- Frontend: Strict gift send flow in LiveWatchPage — call `sendGiftVerified`, only show animation/chat message after confirmed success, show error toast on failure.

### Modify

- Backend `getUserBalance()`: return `0` if no entry found (remove hardcoded 1000 default).
- Backend `addCoins()`: make admin-only so it can no longer be called from the frontend. Rename to internal use only, keep for admin webhook flow.
- Frontend `RechargePage`: remove all localStorage writes, remove direct `addCoins` call, remove simulated payment. After payment form submission show "Awaiting payment confirmation" state; poll `getCoinBalance` for update. Display provider selector.
- Frontend `WalletPage`: remove all localStorage reads for transaction/gift/recharge history. Show only data from backend queries. Show "0 Coins" and "Recharge to send gifts" message if balance is 0.
- Frontend `WithdrawPage`: remove localStorage writes/reads for withdrawal history.
- Frontend `LiveWatchPage`: replace fire-and-forget gift with `sendGiftVerified`; block animation until backend returns success txId.
- Backend `sendLiveGift()`: keep for backward compat but delegate to `sendGiftVerified` logic (or deprecate).

### Remove

- Backend: hardcoded `1000` default in `getUserBalance()`.
- Frontend: all `localStorage.getItem/setItem` calls for `wallet_transactions`, `gift_history`, `recharge_history`, `withdrawal_history`.
- Frontend: direct `actor.addCoins()` call in `RechargePage`.
- Frontend: simulated `setTimeout` payment processing in `RechargePage`.
- Frontend: local gift animation trigger before server confirmation.

## Implementation Plan

1. **Backend changes**:
   - Add `PaymentTransaction`, `GiftTransaction` types and maps.
   - Add `creatorPendingBalance` map.
   - Fix `getUserBalance` to return 0 for new users.
   - Make `addCoins` admin-only.
   - Add `webhookAddCoins` (admin-only, dedup by paymentIntentId).
   - Replace `sendLiveGift` body with atomic balance-check + deduction + gift-insert + creator-balance-update, returning unique txId.
   - Add `sendGiftVerified` wrapper that the frontend calls.
   - Add admin query functions: `getRechargeTransactions`, `getGiftTransactions`.
   - Add `flagTransaction`, `reverseGiftTransaction`, `auditWallets`.
   - Add `getCreatorPendingBalance`.

2. **Frontend changes**:
   - `RechargePage`: add payment provider selector (Stripe/PayPal/CashApp/Bank), update UI to show "pending webhook" state after form submit, remove localStorage, remove direct addCoins.
   - `WalletPage`: remove all localStorage helpers, load transaction/gift/recharge history from backend queries, show 0 balance state with "Recharge to send gifts".
   - `WithdrawPage`: remove localStorage, use backend balance.
   - `LiveWatchPage`: wrap gift send in `sendGiftVerified`, only dispatch animation on success.
   - `AdminDashboardPage`: new page under Profile > Admin (admin-only) showing all transactions with flag/reverse actions.
