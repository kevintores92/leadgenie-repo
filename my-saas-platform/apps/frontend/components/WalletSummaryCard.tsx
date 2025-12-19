/**
 * WalletSummaryCard Component
 * 
 * Displays wallet balance, subscription status, and sending eligibility.
 * Real-time updates on: WebSocket delivery, top-up success, subscription change
 */

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface WalletData {
  balanceCents: number;
  balanceUSD: string;
  isFrozen: boolean;
  subscriptionStatus: "ACTIVE" | "SUSPENDED" | "PAST_DUE" | "INACTIVE";
  nextRenewal: string | null;
  provider: string | null;
}

const MIN_ESTIMATED_COST = 5; // $0.05 minimum

export default function WalletSummaryCard() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet summary from API
  const fetchWalletSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/billing/wallet-summary");

      if (!res.ok) {
        throw new Error(`Failed to fetch wallet: ${res.statusText}`);
      }

      const data = await res.json();
      setWallet(data);
      setError(null);
    } catch (err) {
      console.error("[WalletSummaryCard] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWalletSummary();
  }, [fetchWalletSummary]);

  // Subscribe to wallet updates via WebSocket (optional - if your app has WebSocket)
  // For now, we'll just refresh on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchWalletSummary();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchWalletSummary]);

  // Listen for custom events from PayPal top-up completion
  useEffect(() => {
    const handleTopupSuccess = () => {
      console.log("[WalletSummaryCard] Top-up successful, refreshing...");
      fetchWalletSummary();
    };

    window.addEventListener("paypal-topup-success", handleTopupSuccess);
    return () => {
      window.removeEventListener("paypal-topup-success", handleTopupSuccess);
    };
  }, [fetchWalletSummary]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded"></div>
          <div className="h-8 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="rounded-lg border border-destructive bg-surface p-6">
        <p className="text-sm text-destructive">
          {error || "Failed to load wallet"}
        </p>
      </div>
    );
  }

  // Determine if user can send
  const canSend =
    wallet.subscriptionStatus === "ACTIVE" &&
    !wallet.isFrozen &&
    wallet.balanceCents > MIN_ESTIMATED_COST;

  // Status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "PAST_DUE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Balance styling - red if low
  const isLowBalance = wallet.balanceCents < 1000; // Less than $10

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="rounded-lg border border-border bg-surface p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Wallet</h2>
        </div>

        {/* Balance Display */}
        <div
          className={`mb-6 rounded-lg p-4 ${
            isLowBalance
              ? "bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800"
              : "bg-muted"
          }`}
        >
          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
          <p
            className={`text-3xl font-bold ${
              isLowBalance ? "text-red-600 dark:text-red-400" : "text-foreground"
            }`}
          >
            ${wallet.balanceUSD}
          </p>
          {isLowBalance && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              ⚠️ Low balance. Top up to continue sending.
            </p>
          )}
        </div>

        {/* Subscription Status */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Subscription Status
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                wallet.subscriptionStatus
              )}`}
            >
              {wallet.subscriptionStatus}
            </span>
            {wallet.isFrozen && (
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                🔒 Frozen
              </span>
            )}
          </div>
        </div>

        {/* Next Renewal */}
        {wallet.nextRenewal && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">Next Renewal</p>
            <p className="text-sm text-foreground">
              {new Date(wallet.nextRenewal).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Sending Eligibility */}
        <div className="mb-6 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-foreground mb-2">
            Sending Eligibility
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  wallet.subscriptionStatus === "ACTIVE"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></span>
              <span className="text-foreground">
                Subscription:{" "}
                <span
                  className={
                    wallet.subscriptionStatus === "ACTIVE"
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {wallet.subscriptionStatus === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  !wallet.isFrozen ? "bg-green-500" : "bg-red-500"
                }`}
              ></span>
              <span className="text-foreground">
                Wallet:{" "}
                <span
                  className={
                    !wallet.isFrozen
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {!wallet.isFrozen ? "Active" : "Frozen"}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  wallet.balanceCents > MIN_ESTIMATED_COST
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></span>
              <span className="text-foreground">
                Balance:{" "}
                <span
                  className={
                    wallet.balanceCents > MIN_ESTIMATED_COST
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {wallet.balanceCents > MIN_ESTIMATED_COST
                    ? "Sufficient"
                    : "Insufficient"}
                </span>
              </span>
            </li>
          </ul>
        </div>

        {/* Blocking Reasons */}
        {!canSend && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              ⛔ Sending Blocked
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
              {wallet.subscriptionStatus !== "ACTIVE" && (
                <li>
                  • Subscription is {wallet.subscriptionStatus.toLowerCase()}
                </li>
              )}
              {wallet.isFrozen && (
                <li>• Wallet is frozen (payment pending)</li>
              )}
              {wallet.balanceCents <= MIN_ESTIMATED_COST && (
                <li>• Balance too low</li>
              )}
            </ul>
          </div>
        )}

        {/* Add Credits Button */}
        <Link
          href="/settings?tab=billing"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
        >
          Add Credits via PayPal
        </Link>
      </div>

      {/* Info Banner */}
      {wallet.isFrozen && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800 p-4">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>🔒 Wallet Frozen:</strong> Your wallet is frozen pending
            payment. Complete the top-up in settings to resume sending.
          </p>
        </div>
      )}

      {wallet.subscriptionStatus !== "ACTIVE" && (
        <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>⚠️ Subscription Inactive:</strong> Your subscription is{" "}
            {wallet.subscriptionStatus.toLowerCase()}. Visit{" "}
            <Link href="/settings?tab=billing" className="underline font-medium">
              billing settings
            </Link>{" "}
            to reactivate.
          </p>
        </div>
      )}
    </div>
  );
}
