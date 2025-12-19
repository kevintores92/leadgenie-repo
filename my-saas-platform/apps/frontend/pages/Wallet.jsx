import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '../components/AppShell';

export default function Wallet() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(null);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState('');

  const fetchBalance = async () => {
    if (!session?.user?.orgId) return;
    try {
      const resp = await fetch('/api/wallet/balance', { 
        headers: { 
          'authorization': `Bearer ${session?.accessToken || ''}`,
          'x-organization-id': session.user.orgId 
        } 
      });
      const j = await resp.json();
      setBalance(j.balance);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchBalance(); }, [session]);

  const topup = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert('Enter valid amount');
    if (!session?.user?.orgId) return alert('Not authenticated');
    try {
      const resp = await fetch('/api/billing/create-topup', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'authorization': `Bearer ${session?.accessToken || ''}`,
          'x-organization-id': session.user.orgId
        }, 
        body: JSON.stringify({ amount: amt }) 
      });
      const j = await resp.json();
      if (resp.ok) {
        setBalance(j.balance);
        setShowTopup(false);
        setAmount('');
      } else {
        alert(j.error || 'topup failed');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Wallet</h1>
        <div className="card">
          <div className="text-sm muted-text">Current Balance</div>
          <div className="text-3xl font-mono mt-2">${balance === null ? '...' : balance.toFixed(2)}</div>
          {balance !== null && balance < 5 && (
            <div className="mt-3 text-sm text-red-600">Low balance — please top up to avoid interruptions.</div>
          )}

          <div className="mt-4">
            <button onClick={() => setShowTopup(true)} className="btn-primary px-4 py-2">Top-Up Wallet</button>
          </div>
        </div>

        {showTopup && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="card w-80 p-6">
              <h2 className="text-lg font-semibold mb-3">Top-Up Wallet</h2>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" placeholder="Amount in dollars" />
              <div className="flex gap-2">
                <button onClick={topup} className="btn-primary px-4 py-2">Top Up</button>
                <button onClick={() => setShowTopup(false)} className="ghost-btn px-4 py-2">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
