import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { useSession } from 'next-auth/react';

export default function Settings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [aiRepliesEnabled, setAiRepliesEnabled] = useState(false);
  const [aiCallsEnabled, setAiCallsEnabled] = useState(false);
  const [reenqueueDeferred, setReenqueueDeferred] = useState(true);
  const [duplicateWindowHours, setDuplicateWindowHours] = useState(24);
  const [migrationApplied, setMigrationApplied] = useState(null);
  const [migrationError, setMigrationError] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const orgId = session?.user?.orgId || 'unknown';
        const resp = await fetch(`/api/settings`, {
          headers: {
            'authorization': `Bearer ${session?.accessToken || ''}`,
            'x-organization-id': orgId
          }
        });
        if (!resp.ok) throw new Error('Failed to load settings');
        const j = await resp.json();
        setAiRepliesEnabled(!!j.aiRepliesEnabled);
        setAiCallsEnabled(!!j.aiCallsEnabled);
        setReenqueueDeferred(j.reenqueueDeferred === undefined ? true : !!j.reenqueueDeferred);
        setDuplicateWindowHours(Number(j.duplicateWindowHours || 24));
        
        const support = await fetch(`/api/settings/feature-support`, {
          headers: {
            'authorization': `Bearer ${session?.accessToken || ''}`,
            'x-organization-id': orgId
          }
        }).then(r=>r.json()).catch(()=>({ migrationApplied: false }));
        setMigrationApplied(!!support.migrationApplied);
        if (!support.migrationApplied && support.error) setMigrationError(support.error);
      } catch (e) { 
        console.error('Failed to load settings:', e);
      }
      setLoading(false);
    })();
  }, [session]);

  if (!session) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Settings</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
            Please sign in to access settings
          </div>
        </div>
      </AppShell>
    );
  }

  const toggleReplies = async (value) => {
    // Check wallet sufficiency before enabling
    if (value) {
      try {
        const resp = await fetch('/api/wallet/balance', {
          headers: { 'authorization': `Bearer ${session?.accessToken || ''}` }
        });
        if (!resp.ok) throw new Error('Failed to check balance');
        const j = await resp.json();
        const balance = Number(j.balance || 0);
        const estimatedPerReply = 0.01 * 2; // markup
        if (balance < estimatedPerReply * 1.1) {
          setAiRepliesEnabled(false);
          return alert('Insufficient wallet balance to enable AI Replies');
        }
      } catch (e) {
        console.error('Failed to check wallet:', e);
        return alert('Unable to verify wallet balance');
      }
    }
    setAiRepliesEnabled(value);
    try {
      await fetch('/api/settings/ai-replies-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session?.accessToken || ''}`
        },
        body: JSON.stringify({ enabled: value })
      });
    } catch (e) {
      console.error('Failed to toggle AI replies:', e);
      alert('Failed to save setting');
    }
  };
 
  const toggleCalls = async (value) => {
    if (value) {
      try {
        const resp = await fetch('/api/wallet/balance', {
          headers: { 'authorization': `Bearer ${session?.accessToken || ''}` }
        });
        if (!resp.ok) throw new Error('Failed to check balance');
        const j = await resp.json();
        const balance = Number(j.balance || 0);
        const estimatedPerCall = 0.25 * 2; // markup
        if (balance < estimatedPerCall * 1.1) {
          setAiCallsEnabled(false);
          return alert('Insufficient wallet balance to enable AI Calls');
        }
      } catch (e) {
        console.error('Failed to check wallet:', e);
        return alert('Unable to verify wallet balance');
      }
    }
    try {
      await fetch('/api/settings/ai-calls-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session?.accessToken || ''}`
        },
        body: JSON.stringify({ enabled: value })
      });
      setAiCallsEnabled(value);
    } catch (e) {
      console.error('Failed to toggle AI calls:', e);
      alert('Failed to save setting');
    }
  };

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>

        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable AI Replies</div>
              <div className="text-sm muted-text">Estimated replies: 15%–25%. Cost per reply: ${(0.01 * 2).toFixed(2)} (markup included).</div>
            </div>
            <div>
              <label className="switch">
                <input type="checkbox" checked={aiRepliesEnabled} onChange={(e) => toggleReplies(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">De-duplicate Sends (24h window)</div>
              <div className="text-sm muted-text">If a contact was sent to within the last window, it will be deferred and retried after the window.</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">Window:</div>
              <input 
                type="number" 
                min={1} 
                value={duplicateWindowHours} 
                onChange={(e)=>setDuplicateWindowHours(Number(e.target.value))} 
                className="w-20 border rounded px-2 py-1" 
              />
              <button 
                onClick={async()=>{ 
                  try {
                    const orgId = session?.user?.orgId || 'unknown';
                    await fetch('/api/settings/duplicate-window', { 
                      method: 'POST', 
                      headers: { 
                        'Content-Type':'application/json', 
                        'authorization': `Bearer ${session?.accessToken || ''}`,
                        'x-organization-id': orgId
                      }, 
                      body: JSON.stringify({ hours: duplicateWindowHours }) 
                    }); 
                    alert('Saved'); 
                  } catch (e) {
                    console.error('Failed to save duplicate window:', e);
                    alert('Failed to save setting');
                  }
                }} 
                className="btn-primary px-3 py-1"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto Re-enqueue Deferred Contacts</div>
              <div className="text-sm muted-text">When enabled, deferred contacts will be processed automatically once their retry window expires.</div>
              {migrationApplied === false && <div className="text-sm text-red-600 mt-2">Migration not applied: advanced duplicate features unavailable. {migrationError ? <span className="block text-xs muted-text">{migrationError}</span> : null}</div>}
            </div>
            <div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={reenqueueDeferred} 
                  onChange={async (e) => { 
                    setReenqueueDeferred(e.target.checked); 
                    try {
                      const orgId = session?.user?.orgId || 'unknown';
                      await fetch('/api/settings/reenqueue-toggle', { 
                        method: 'POST', 
                        headers: { 
                          'Content-Type':'application/json',
                          'authorization': `Bearer ${session?.accessToken || ''}`,
                          'x-organization-id': orgId
                        }, 
                        body: JSON.stringify({ enabled: e.target.checked }) 
                      }); 
                    } catch (err) {
                      console.error('Failed to toggle reenqueue:', err);
                      alert('Failed to save setting');
                      setReenqueueDeferred(!e.target.checked);
                    }
                  }} 
                  disabled={migrationApplied === false} 
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
        {migrationApplied === false && (
          <div className="bg-surface border-l-4 border-primary p-4 text-sm text-primary rounded">
            To enable advanced duplicate handling, apply the DB migration locally:
            <pre className="bg-surface p-2 rounded mt-2 text-xs">npx prisma migrate dev --name add_nextEligibleAt_contact</pre>
            Ensure your `DATABASE_URL` environment variable points to your dev database before running the command.
          </div>
        )}

        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable AI Calls</div>
              <div className="text-sm muted-text">Estimated calls: 1%–5%. Cost per call: ${(0.25 * 2).toFixed(2)} (markup included).</div>
            </div>
            <div>
              <label className="switch">
                <input type="checkbox" checked={aiCallsEnabled} onChange={(e) => toggleCalls(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Billing / Payment Section */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Billing & Payments</div>
              <div className="text-sm muted-text">Manage your subscription and payment methods</div>
            </div>
            <button onClick={() => window.location.href = '/billing'} className="btn-primary px-4 py-2">Manage Billing</button>
          </div>
        </div>

        {/* The Start Campaign button area */}
        <div className="mt-6">
          <button onClick={() => window.location.href = '/campaigns'} className="btn-primary px-4 py-2">Start Campaign</button>
        </div>

        <style jsx>{`
          .switch { position: relative; display: inline-block; width: 44px; height: 26px; }
          .switch input { opacity: 0; width: 0; height: 0; }
          .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .2s; border-radius: 999px; }
          .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .2s; border-radius: 50%; }
          input:checked + .slider { background-color: #2563eb; }
          input:checked + .slider:before { transform: translateX(18px); }
        `}</style>
      </div>
    </AppShell>
  );
}
