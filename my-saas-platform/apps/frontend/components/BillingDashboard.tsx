/**
 * BillingDashboard.tsx
 * Main billing dashboard component showing wallet balance, subscription status, and actions
 */

import React, { useEffect, useState } from 'react';

interface BillingStatus {
  wallet: {
    balanceCents: number;
    isFrozen: boolean;
  };
  subscription: {
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED';
    provider: 'PAYPAL' | 'STRIPE';
    currentPeriodEnd: string;
    planId: string;
  } | null;
  canSend: boolean;
}

export default function BillingDashboard() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBillingStatus();
    // Initialize PayPal buttons when component mounts
    initializePayPalButton();
  }, []);

  const initializePayPalButton = () => {
    if (window.paypal && window.paypal.HostedButtons) {
      try {
        window.paypal.HostedButtons({
          hostedButtonId: "T2G2M28MTFRHY"
        }).render("#paypal-container-T2G2M28MTFRHY");
      } catch (error) {
        console.warn('PayPal button already rendered or not available');
      }
    }
  };

  const fetchBillingStatus = async () => {
    try {
      const res = await fetch('/api/billing/status');
      if (!res.ok) throw new Error('Failed to fetch billing status');
      const data = await res.json();
      setBilling(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading billing');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading billing information...</div>;
  }

  if (!billing) {
    return <div className="p-6 text-center text-red-600">Failed to load billing data</div>;
  }

  const walletBalance = (billing.wallet.balanceCents / 100).toFixed(2);
  const renewalDate = billing.subscription
    ? new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()
    : 'N/A';

  const statusColor = {
    ACTIVE: 'text-green-600',
    PAST_DUE: 'text-orange-600',
    CANCELED: 'text-red-600',
    SUSPENDED: 'text-red-600',
  };

  return (
    <div className="space-y-6 p-6 bg-background">
      {/* Wallet Section */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Wallet Balance</h2>

        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">${walletBalance}</span>
          <span className="text-muted-text">USD</span>
        </div>

        {billing.wallet.isFrozen && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            ⚠️ Wallet is frozen due to non-payment. Messages cannot be sent.
          </div>
        )}

        {!billing.canSend && (
          <div className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-700">
            ⚠️ Messaging is currently blocked. Check your subscription and wallet balance.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleTopup('50')}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + $50
          </button>
          <button
            onClick={() => handleTopup('100')}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + $100
          </button>
          <button
            onClick={() => handleTopup('250')}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + $250
          </button>
        </div>

        {/* PayPal Hosted Button */}
        <div className="mt-6 border-t border-border pt-6">
          <p className="mb-4 text-sm font-medium text-muted-text">Or use PayPal:</p>
          <div id="paypal-container-T2G2M28MTFRHY" className="flex justify-center"></div>
        </div>
      </div>

      {/* Subscription Section */}
      {billing.subscription ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Subscription</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-text">Status:</span>
              <span className={`font-medium ${statusColor[billing.subscription.status]}`}>
                {billing.subscription.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-text">Plan:</span>
              <span className="font-medium text-foreground">{billing.subscription.planId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-text">Renewal Date:</span>
              <span className="font-medium text-foreground">{renewalDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-text">Provider:</span>
              <span className="font-medium text-foreground">{billing.subscription.provider}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover">
              Change Plan
            </button>
            <button className="rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              Cancel Subscription
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Subscription</h2>
          <p className="mb-4 text-sm text-muted-text">
            You don't have an active subscription. Subscribe to start sending messages.
          </p>
          <button
            onClick={handleCreateSubscription}
            className="rounded bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
          >
            Subscribe Now
          </button>
        </div>
      )}
    </div>
  );

  async function handleTopup(amount: string) {
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
  }

  async function handleCreateSubscription() {
    try {
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'STARTER' }),
      });

      if (!res.ok) throw new Error('Failed to create subscription');

      const data = await res.json();
      window.location.href = data.approvalLink;
    } catch (err) {
      alert(
        'Failed to start subscription: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  }
}
