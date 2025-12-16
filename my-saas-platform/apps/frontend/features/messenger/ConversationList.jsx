"use client";

import React, { useState } from 'react';
import { Search, Filter, Pencil, ChevronDown, Plus } from 'lucide-react';
import { StatusAvatar } from '../../components/status-avatar';
import { updateLeadStatus } from '../../lib/status';
import { useConversation } from './ConversationProvider.jsx';

export default function ConversationList({ className = '' }) {
  const { conversations, setActiveConversation } = useConversation();
  const [tab, setTab] = useState('Unread');
  const [q, setQ] = useState('');

  // Filter contacts by search query
  const filtered = (conversations || []).filter(c => {
    if (!q) return true;
    return `${c.name} ${c.email || ''}`.toLowerCase().includes(q.toLowerCase());
  });

  // Format time for display
  const fmtTime = (d) => {
    const dt = d ? new Date(d) : new Date();
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) {
      return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return dt.toLocaleString([], { month: 'short', day: '2-digit' });
  };

  const onSelect = (c) => {
    const withMessages = {
      ...c,
      messages: c.messages && c.messages.length ? c.messages : [
        { id: 'm1', direction: 'in', text: `Hey ${c.name.split(' ')[0]}, how's it going?`, time: new Date().toISOString() },
        { id: 'm2', direction: 'out', text: `Hi ${c.name.split(' ')[0]} — thanks for reaching out!`, time: new Date().toISOString() }
      ]
    };
    withMessages.lastFrom = c.fromNumber || c.lastFrom || c.last_from ||
      (withMessages.messages && withMessages.messages.slice().reverse().find(m => m.fromNumber)?.fromNumber) || null;

    setActiveConversation({
      contact: { id: c.id, name: c.name, email: c.email, phone: c.phone },
      messages: withMessages.messages || [],
      lastFrom: withMessages.lastFrom
    });
  };

  return (
    <div className={`${className} h-full bg-surface flex flex-col border-r border-border shrink-0 font-inter min-h-0`}>
      <div className="px-4 pt-4">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-3">
          {['Unread','Recents','Starred','All'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium pb-2 ${tab===t ? 'border-b-2 border-primary text-primary' : 'muted-text'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search + Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 bg-surface border border-border rounded px-3 py-2">
            <Search className="w-4 h-4 muted-text" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <button className="p-2 rounded ghost-btn">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 rounded ghost-btn">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between mt-3 text-xs muted-text">
          <div>{filtered.length} RESULTS</div>
          <div className="flex items-center gap-2">
            <div className="text-sm muted-text">Latest-All</div>
            <ChevronDown className="w-4 h-4 muted-text" />
          </div>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto mt-3">
        {filtered.map((c, idx) => (
          <div
            key={c.id || idx}
            onClick={() => onSelect(c)}
            className="flex items-center gap-3 px-2 py-2 cursor-pointer border-b border-border"
          >
            <div className="relative">
              <StatusAvatar
                name={c.name}
                status={c.status || 'no_status'}
                onStatusChange={(newStatus) => updateLeadStatus(c.id, newStatus)}
                className="w-8 h-8"
              />
              {c.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0">
                <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                <div className="text-xs muted-text ml-2">{fmtTime(c.updatedAt)}</div>
              </div>
              <div className="text-xs muted-text truncate">{c.preview || (c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : '—')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
