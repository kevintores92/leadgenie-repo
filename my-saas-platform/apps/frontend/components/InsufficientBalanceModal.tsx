/**
 * InsufficientBalanceModal.tsx
 * Modal shown when user tries to send a campaign but doesn't have sufficient balance
 */

import React, { useState } from 'react';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number; // in cents
  requiredAmount: number; // in cents
}

export default function InsufficientBalanceModal({
  isOpen,
  onClose,
  currentBalance,
  requiredAmount,
}: InsufficientBalanceModalProps) {
  const [topupAmount, setTopupAmount] = useState('50');

  if (!isOpen) return null;

  const currentBalanceUSD = (currentBalance / 100).toFixed(2);
  const requiredAmountUSD = (requiredAmount / 100).toFixed(2);
  const shortfallUSD = ((requiredAmount - currentBalance) / 100).toFixed(2);

  const handleTopup = async (amount: string) => {
    try {
      const res = await fetch('/api/billing/create-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) throw new Error('Failed to create checkout');

      const data = await res.json();
      window.location.href = data.approveLink;
    } catch (err) {
      alert('Failed to start checkout: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-text hover:text-foreground"
        >
          ✕
        </button>

        {/* Content */}
        <h2 className="mb-4 text-xl font-bold text-foreground">Insufficient Balance</h2>

        <div className="mb-6 space-y-3 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Your wallet balance is too low to send this campaign.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-red-600">Current Balance:</span>
              <span className="font-semibold text-red-700">${currentBalanceUSD}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Required Amount:</span>
              <span className="font-semibold text-red-700">${requiredAmountUSD}</span>
            </div>
            <div className="border-t border-red-200 pt-2">
              <div className="flex justify-between">
                <span className="text-red-700">Shortfall:</span>
                <span className="font-bold text-red-700">${shortfallUSD}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up Options */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-foreground">Top up your wallet:</p>
          <div className="grid grid-cols-3 gap-2">
            {['50', '100', '250'].map((amount) => (
              <button
                key={amount}
                onClick={() => setTopupAmount(amount)}
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  topupAmount === amount
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-surface text-foreground hover:bg-surface-hover'
                }`}
              >
                +${amount}
              </button>
            ))}
          </div>
        </div>

        {/* PayPal Button Container */}
        <div className="mb-6 rounded-lg border border-border bg-background p-4">
          <div id="paypal-container-topup-modal" className="flex justify-center"></div>
        </div>

        {/* Manual Topup Button */}
        <button
          onClick={() => handleTopup(topupAmount)}
          className="w-full rounded bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
        >
          Top Up Wallet with ${topupAmount}
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-3 w-full rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-hover"
        >
          Cancel
        </button>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-muted-text">
          Your campaign will be ready to send once your balance is sufficient.
        </p>
      </div>
    </>
  );
}
