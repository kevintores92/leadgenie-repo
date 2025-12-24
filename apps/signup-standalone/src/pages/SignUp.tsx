import React, { useState, useRef, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const PAYPAL_PLAN_ID = import.meta.env.VITE_PAYPAL_PLAN_ID || '';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaypal, setShowPaypal] = useState(false);
  const [paypalRendered, setPaypalRendered] = useState(false);
  const paypalRef = useRef<HTMLDivElement | null>(null);

  // Load PayPal SDK when needed
  useEffect(() => {
    if (!showPaypal) return;
    if ((window as any).paypal) return renderButtons();

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => renderButtons();
    script.onerror = () => setError('Failed to load PayPal SDK');
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaypal]);

  const renderButtons = () => {
    if (paypalRendered) return;
    if (!paypalRef.current || !(window as any).paypal) return;
    setPaypalRendered(true);

    (window as any).paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' },
      createSubscription: function (_data: any, actions: any) {
        return actions.subscription.create({ plan_id: PAYPAL_PLAN_ID });
      },
      onApprove: async function (data: any) {
        // subscription created — now create account with subscription attached
        setLoading(true);
        setError('');
        try {
          const body = {
            username: email.split('@')[0],
            email,
            password,
            organizationName: businessName,
            subscription: { provider: 'paypal', providerSubscriptionId: data.subscriptionID, planId: PAYPAL_PLAN_ID }
          } as any;

          const res = await fetch(`${API}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error('Signup failed: ' + res.status);
          const json = await res.json();
          if (json.token) localStorage.setItem('auth_token', json.token);
          if (json.user?.orgId) localStorage.setItem('organization_id', json.user.orgId);
          // redirect to dashboard (app domain should be used in production)
          window.location.href = '/campaigns';
        } catch (e: any) {
          setError(e.message || 'Signup with subscription failed');
        } finally {
          setLoading(false);
        }
      },
      onError: function (err: any) {
        setError('PayPal error: ' + (err && (err.message || JSON.stringify(err))));
      }
    }).render(paypalRef.current);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    // Show PayPal subscription flow — on approval we'll create account + subscription
    setShowPaypal(true);
  };

  return (
    <div>
      <h1>Sign Up</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!showPaypal && (
        <form onSubmit={handleStart} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <input placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Create Account & Subscribe'}</button>
          <div style={{ marginTop: 8 }}>
            Already have an account? <a href="/signin">Go to Login →</a>
          </div>
        </form>
      )}

      {showPaypal && (
        <div>
          <p>Complete subscription to finish account creation:</p>
          <div ref={paypalRef} />
        </div>
      )}
    </div>
  );
}
