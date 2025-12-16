import React from 'react';
import { Flame, Sun, Sprout, Droplets, Ban, XCircle, Slash, CircleDashed } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useConversation } from './ConversationProvider.jsx';

const STATUS_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', label: 'Hot' },
  warm: { icon: Sun, color: 'text-yellow-500', label: 'Warm' },
  nurture: { icon: Sprout, color: 'text-green-500', label: 'Nurture' },
  drip: { icon: Droplets, color: 'text-blue-500', label: 'Drip' },
  not_interested: { icon: Ban, color: 'muted-text', label: 'Not interested' },
  wrong_number: { icon: XCircle, color: 'text-red-400', label: 'Wrong number' },
  dnc: { icon: Slash, color: 'text-red-600', label: 'DNC' },
  no_status: { icon: CircleDashed, color: 'muted-text', label: 'No status' }
};

export default function HoverStatusSelector({ contactId, currentStatus = 'no_status', className = '' }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { conversations, setConversations, activeConversation, setActiveConversation } = useConversation();

  const setStatusOptimistic = (newStatus) => {
    if (conversations && setConversations) {
      setConversations(conversations.map(c => c.id === contactId ? ({ ...c, status: newStatus }) : c));
    }
    if (activeConversation && activeConversation.contact && activeConversation.contact.id === contactId) {
      setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, status: newStatus } });
    }
  };

  const revertStatus = (oldStatus) => {
    if (conversations && setConversations) {
      setConversations(conversations.map(c => c.id === contactId ? ({ ...c, status: oldStatus }) : c));
    }
    if (activeConversation && activeConversation.contact && activeConversation.contact.id === contactId) {
      setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, status: oldStatus } });
    }
  };

  const updateStatus = async (newStatus) => {
    const oldStatus = currentStatus || 'no_status';
    setOpen(false);
    setStatusOptimistic(newStatus);
    try {
      const res = await fetch(`/contacts/${contactId}`, { method: 'PUT', headers: { 'content-type':'application/json', 'x-organization-id': 'demo-org-id', 'x-user-id': 'demo-user', 'x-user': 'Demo User' }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error('Update failed');
      const json = await res.json();
      // ensure canonical state from server
      if (conversations && setConversations) {
        setConversations(conversations.map(c => c.id === contactId ? ({ ...c, ...json }) : c));
      }
      if (activeConversation && activeConversation.contact && activeConversation.contact.id === contactId) {
        setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, ...json } });
      }
      toast({ title: 'Status updated', description: STATUS_CONFIG[newStatus]?.label || newStatus });
    } catch (e) {
      revertStatus(oldStatus);
      toast({ title: 'Update failed', description: e.message || 'Unable to update status' });
    }
  };

  const CurrentIcon = STATUS_CONFIG[currentStatus]?.icon || STATUS_CONFIG.no_status.icon;
  const currentColor = STATUS_CONFIG[currentStatus]?.color || STATUS_CONFIG.no_status.color;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Current status button */}
      <button
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded-full hover:bg-surface"
        title={STATUS_CONFIG[currentStatus]?.label || 'Status'}
      >
        <CurrentIcon className={`w-4 h-4 ${currentColor}`} />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute left-full top-1/2 ml-2 -translate-y-1/2
        bg-surface border border-border shadow-lg rounded-lg
        px-2 py-1 flex items-center gap-1
        transition-all duration-150 ease-out
        ${open
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 translate-x-2 pointer-events-none'
          }
      `}
      >
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
          const Icon = cfg.icon;

          return (
            <button
              key={k}
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(k);
              }}
              title={cfg.label}
              className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface transition ${k === currentStatus ? 'ring-1 ring-blue-200' : ''
                }`}
            >
              <Icon
                className={`w-4 h-4 ${cfg.color}`}
                strokeWidth={2.5}
              />
              <span className="text-xs muted-text whitespace-nowrap">
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { STATUS_CONFIG };
