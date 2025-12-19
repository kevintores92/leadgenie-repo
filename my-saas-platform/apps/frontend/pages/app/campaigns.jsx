import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '../../components/AppShell';

// Mock data — replace with API calls
const mockCampaigns = [
  { id: '1', name: 'Holiday Blast', status: 'QUEUED', createdAt: '2025-12-10' },
  { id: '2', name: 'Winter Promo', status: 'COMPLETED', createdAt: '2025-12-01' },
];

const mockLists = [
  { id: 'list1', name: 'December Leads' },
  { id: 'list2', name: 'Uploaded Contacts' },
];

const mockTemplates = [
  { id: 'tpl1', name: 'Default Template' },
  { id: 'tpl2', name: 'Holiday Greeting' },
];

export default function Campaigns() {
  const { data: session } = useSession();
  const [campaigns] = useState(mockCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [interval, setInterval] = useState('30min');
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [importedCount, setImportedCount] = useState(null);
  const balance = 0; // dummy balance available to the UI

  React.useEffect(()=>{
    try {
      const c = sessionStorage.getItem('importedContactCount');
      if (c) setImportedCount(Number(c));
    } catch(e) {}
  }, []);

  const startCampaign = async (campaignId) => {
    if (!session?.user?.orgId) return alert('Not authenticated');
    
    // Determine interval minutes
    let intervalMinutes = 30;
    if (interval === '30min') intervalMinutes = 30;
    if (interval === '45min') intervalMinutes = 45;
    if (interval === '1hr') intervalMinutes = 60;

    const payload = { batchSize, intervalMinutes };

    // Fetch current balance and estimate campaign cost (rough: contacts * $0.01)
    try {
      const respBal = await fetch('/api/wallet/balance', { 
        headers: { 
          'authorization': `Bearer ${session?.accessToken || ''}`,
          'x-organization-id': session.user.orgId 
        } 
      });
      const jb = await respBal.json();
      const balance = jb.balance || 0;
      
      const contacts = await fetch('/api/contacts', { 
        headers: { 
          'authorization': `Bearer ${session?.accessToken || ''}`,
          'x-organization-id': session.user.orgId 
        } 
      }).then(r => r.json()).catch(() => []);
      
      const estimatedCost = (contacts?.length || 0) * 0.01;
      if (estimatedCost > balance) {
        if (!confirm('Estimated campaign cost exceeds your balance. Campaign will start but will stop when balance reaches $0. Proceed?')) return;
      }

      // Call backend to enqueue campaign
      await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'authorization': `Bearer ${session?.accessToken || ''}`,
          'x-organization-id': session.user.orgId
        },
        body: JSON.stringify(payload),
      });
      alert('Campaign queued');
    } catch (err) {
      console.error(err);
      alert('Failed to start campaign');
    }

    setShowModal(false);
  };

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <div className="flex items-center gap-3">
            {importedCount ? (
              <div className="bg-surface border border-green-200 text-green-800 px-3 py-2 rounded">{importedCount} contacts imported — ready to start a campaign</div>
            ) : null}
            <button
              onClick={() => {
                const hasImported = sessionStorage.getItem('importedContactIds');
                if (hasImported) setSelectedList('list2');
                setShowModal(true);
              }}
              className="btn-primary px-4 py-2"
            >
              Create New Campaign
            </button>
          </div>
        </div>

        {/* Campaigns Table */}
        <table className="min-w-full bg-surface border border-border rounded shadow">
          <thead>
            <tr className="bg-surface text-left">
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="py-2 px-4">{c.name}</td>
                <td className="py-2 px-4">{c.status}</td>
                <td className="py-2 px-4">{c.createdAt}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => { setSelectedCampaignId(c.id); setShowScheduleModal(true); }}
                    className="btn-primary px-3 py-1 rounded mr-2"
                  >
                    Start
                  </button>
                  <button
                    onClick={async () => {
                      if (!session?.user?.orgId) return alert('Not authenticated');
                      try {
                        await fetch(`/api/campaigns/${c.id}/pause`, { 
                          method: 'POST', 
                          headers: { 
                            'authorization': `Bearer ${session?.accessToken || ''}`,
                            'x-organization-id': session.user.orgId 
                          } 
                        });
                        alert('Campaign paused');
                      } catch (err) {
                        console.error(err);
                        alert('Failed to pause');
                      }
                    }}
                    className="ghost-btn px-3 py-1 rounded text-foreground"
                  >
                    Pause
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Create Campaign Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="card w-96 p-6">
              <h2 className="text-xl font-semibold mb-4">Create Campaign</h2>

              {/* Campaign Name */}
              <label className="block mb-2 font-medium">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
                placeholder="Enter campaign name"
              />

              {/* Select Contacts List */}
              <label className="block mb-2 font-medium">Select Your Contacts</label>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
              >
                <option value="">Select List</option>
                {mockLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>

              {/* Select Template */}
              <label className="block mb-2 font-medium">Select Your Message</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
              >
                <option value="">Select Template</option>
                {mockTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>

              {/* Schedule Campaign */}
              <button
                onClick={() => { setSelectedCampaignId(null); setShowScheduleModal(true); }}
                className="ghost-btn px-3 py-2 rounded mb-4"
              >
                Schedule Your Campaign
              </button>

              {/* Start Campaign */}
              <button
                onClick={startCampaign}
                className="btn-primary px-4 py-2 rounded w-full"
              >
                Start Campaign
              </button>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="card w-80 p-6">
              <h2 className="text-lg font-semibold mb-4">Schedule Campaign</h2>

              {/* Batch Size */}
              <label className="block mb-2 font-medium">Batch Size</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 mb-4"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
              </select>

              {/* Interval */}
              <label className="block mb-2 font-medium">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
              >
                <option value="30min">Every 30 min</option>
                <option value="45min">Every 45 min</option>
                <option value="1hr">Every 1 hour</option>
              </select>

              <button
                onClick={async () => {
                  if (balance <= 0) {
                    alert("You don't have enough balance to start this campaign.");
                    return;
                  }

                  if (!selectedCampaignId) {
                    alert('No campaign selected in this mock; create one first.');
                    return;
                  }

                  try {
                    setSending(true);
                    const resp = await fetch(`/api/campaigns/${selectedCampaignId}/send`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json', 
                        'authorization': `Bearer ${session?.accessToken || ''}`,
                        'x-organization-id': session.user.orgId
                      },
                      body: JSON.stringify({ batchSize, interval }),
                    });
                    const jb = await resp.json();
                    if (!resp.ok) throw new Error(jb.error || 'Failed to start campaign');
                    alert(jb.message || 'Campaign started successfully');
                  } catch (err) {
                    console.error(err);
                    alert('Error starting campaign: ' + (err?.message || err));
                  } finally {
                    setSending(false);
                    setShowScheduleModal(false);
                  }
                }}
                disabled={sending || balance <= 0}
                className={`w-full px-4 py-2 rounded ${sending || balance <= 0 ? 'bg-gray-400 text-white cursor-not-allowed' : 'btn-primary'}`}
              >
                {sending ? 'Starting...' : 'Start Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}