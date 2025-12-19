/**
 * pages/app/billing.tsx
 * Main billing page
 */

import React, { useState } from 'react';
import BillingDashboard from '../../components/BillingDashboard';
import { useRouter } from 'next/router';

export default function BillingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  // Handle PayPal redirects
  React.useEffect(() => {
    if (router.query.success === 'topup') {
      setMessage('✓ Wallet top-up completed successfully!');
      setTimeout(() => setMessage(''), 5000);
    } else if (router.query.success === 'subscription') {
      setMessage('✓ Subscription activated! Your account is now active.');
      setTimeout(() => setMessage(''), 5000);
    } else if (router.query.error === 'subscription') {
      setMessage('✗ Subscription creation was cancelled or failed.');
      setTimeout(() => setMessage(''), 5000);
    }
  }, [router.query]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="border-b border-border bg-surface px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground">Billing & Payments</h1>
          <p className="mt-2 text-muted-text">
            Manage your subscription and wallet balance
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {message}
            </div>
          )}

          <BillingDashboard />

          {/* Info Section */}
          <div className="mt-8 space-y-6 rounded-lg border border-border bg-surface p-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">How Billing Works</h3>
              <p className="text-sm text-muted-text">
                Your SMS sending is controlled by two independent layers:
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Subscription */}
              <div className="rounded border border-border p-4">
                <h4 className="mb-2 font-semibold text-foreground">Subscription</h4>
                <ul className="space-y-2 text-sm text-muted-text">
                  <li>✓ Monthly billing (fixed cost)</li>
                  <li>✓ Phone number rental</li>
                  <li>✓ Platform access</li>
                  <li>✓ Campaign infrastructure</li>
                </ul>
              </div>

              {/* Wallet */}
              <div className="rounded border border-border p-4">
                <h4 className="mb-2 font-semibold text-foreground">Wallet</h4>
                <ul className="space-y-2 text-sm text-muted-text">
                  <li>✓ Pay-as-you-go (variable cost)</li>
                  <li>✓ Per SMS/MMS charges</li>
                  <li>✓ Carrier surcharges</li>
                  <li>✓ Top up anytime</li>
                </ul>
              </div>
            </div>

            <div className="rounded bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Required:</strong> Both subscription AND wallet balance are required to send
              messages. Messages will be blocked if either is inactive or insufficient.
            </div>
          </div>

          {/* Pricing Info */}
          <div className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Pricing Details</h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-text">SMS Base Cost:</span>
                <span className="font-medium text-foreground">$0.0079 - $0.0475 per message</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-text">Platform Markup:</span>
                <span className="font-medium text-foreground">30% (configurable)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Final Cost:</span>
                <span className="font-medium text-foreground">Base Cost + Markup</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-text">
              All charges are applied only after successful delivery. Failed messages are not
              charged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
