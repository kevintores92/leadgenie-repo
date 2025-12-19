/**
 * BillingGuard.tsx
 * Component that blocks sending if billing requirements aren't met
 */

import React, { useEffect, useState } from 'react';
import InsufficientBalanceModal from './InsufficientBalanceModal';

interface BillingGuardProps {
  onBillingStatusChange: (canSend: boolean, reason?: string) => void;
  children: React.ReactNode;
  requiredAmount?: number; // Required wallet amount in cents
}

export default function BillingGuard({
  onBillingStatusChange,
  children,
  requiredAmount = 0,
}: BillingGuardProps) {
  const [status, setStatus] = useState<{
    canSend: boolean;
    reason?: string;
    walletBalance?: number;
    subscriptionStatus?: string;
  }>({ canSend: false });

  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  useEffect(() => {
    checkBillingStatus();
    const interval = setInterval(checkBillingStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkBillingStatus = async () => {
    try {
      const res = await fetch('/api/billing/status');
      if (!res.ok) throw new Error('Failed to check billing');

      const data = await res.json();
      const newStatus = {
        canSend: data.canSend,
        reason: data.canSend
          ? undefined
          : `Sending blocked: ${
              data.subscription?.status !== 'ACTIVE'
                ? 'Subscription inactive'
                : data.wallet.isFrozen
                  ? 'Wallet frozen'
                  : 'Insufficient balance'
            }`,
        walletBalance: data.wallet.balanceCents,
        subscriptionStatus: data.subscription?.status,
      };

      setStatus(newStatus);
      onBillingStatusChange(newStatus.canSend, newStatus.reason);

      // Check if insufficient balance and show modal
      if (
        requiredAmount > 0 &&
        data.wallet.balanceCents < requiredAmount &&
        data.subscription?.status === 'ACTIVE'
      ) {
        setShowInsufficientModal(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({
        canSend: false,
        reason: `Billing check failed: ${errorMessage}`,
      });
      onBillingStatusChange(false, `Billing check failed: ${errorMessage}`);
    }
  };

  return (
    <div>
      {!status.canSend && (
        <div className="mb-4 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-semibold">⚠️ Sending Disabled</p>
          <p>{status.reason}</p>
          <a href="/billing" className="mt-2 inline-block font-semibold hover:underline">
            Go to Billing →
          </a>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {status.walletBalance !== undefined && requiredAmount > 0 && (
        <InsufficientBalanceModal
          isOpen={
            showInsufficientModal &&
            status.walletBalance < requiredAmount &&
            status.subscriptionStatus === 'ACTIVE'
          }
          onClose={() => setShowInsufficientModal(false)}
          currentBalance={status.walletBalance}
          requiredAmount={requiredAmount}
        />
      )}

      {children}
    </div>
  );
}
