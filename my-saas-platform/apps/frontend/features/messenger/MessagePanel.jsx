import React, { useState, useRef, useEffect } from 'react';
import { Star, Mail, Trash2, Filter, Send, PhoneCall } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useConversation } from './ConversationProvider.jsx';
import { StatusAvatar } from '../../components/status-avatar';
import { updateLeadStatus } from '../../lib/status';


const MessageMeta = ({ timeLabel, isOut }) => (
  <div
        className={`text-[10px] muted-text mt-0.5 ${
      isOut ? 'text-right' : 'text-left'
    }`}
  >
    {timeLabel}
  </div>
);

export default function MessagePanel({
    className = '',
    showHeader = true,
    compact = false,
    showComposer = true
}) {
    const { activeConversation, setActiveConversation } = useConversation();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [fromNumber, setFromNumber] = useState(null);
    const feedRef = useRef(null);
    const activeRef = useRef(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!compact && feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [activeConversation?.messages?.length, compact]);

    useEffect(() => {
        fetch('/api/sms/from')
            .then(r => r.json())
            .then(j => j?.from && setFromNumber(j.from))
            .catch(() => { });
    }, []);

    // Keep a ref to the active conversation to avoid stale closures inside SSE handler
    useEffect(() => {
        activeRef.current = activeConversation;
    }, [activeConversation]);

    // SSE client: listens for inbound messages and appends them to the active conversation
    useEffect(() => {
        let es;
        try {
            es = new EventSource('/api/sse/messages');
        } catch (e) {
            console.error('SSE init failed', e);
            return;
        }

        es.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data);
                if (!payload) return;

                // Expecting shape { type: 'message', payload: { id, contactId, from, to, body, twilioSid, createdAt } }
                if (payload.type !== 'message') return;
                const msg = payload.payload || payload.data || payload;
                const active = activeRef.current;
                if (!active || !active.contact) return;

                const contactIdMatch = msg.contactId && active.contact.id && msg.contactId === active.contact.id;
                const phoneMatch = (msg.from && active.contact.phone && msg.from === active.contact.phone) || (msg.to && active.contact.phone && msg.to === active.contact.phone);
                if (!contactIdMatch && !phoneMatch) return;

                const existing = active.messages || [];
                const exists = existing.find(m => (m.id && msg.id && m.id === msg.id) || (m.twilioSid && msg.twilioSid && m.twilioSid === msg.twilioSid));
                if (exists) return; // dedupe

                const newMsg = {
                    id: msg.id || (`m-${Date.now()}`),
                    direction: msg.direction || 'in',
                    text: msg.body || msg.text || '',
                    time: msg.createdAt || msg.time || new Date().toISOString(),
                    fromNumber: msg.from,
                    toNumber: msg.to,
                    twilioSid: msg.twilioSid || msg.sid
                };

                // Append message to active conversation
                setActiveConversation({
                    ...active,
                    messages: [...existing, newMsg]
                });
            } catch (err) {
                console.error('SSE message handler error', err);
            }
        };

        es.onerror = (err) => {
            // Let browser handle reconnects; log for debugging
            console.warn('SSE error', err);
        };

        return () => { try { es.close(); } catch (e) { } };
    }, [setActiveConversation]);

    const send = () => {
        if (!text.trim()) return;
        if (!activeConversation?.contact?.phone) {
            toast({ title: 'No recipient' });
            return;
        }

        setSending(true);
        const from = activeConversation.lastFrom || fromNumber;

        fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                to: activeConversation.contact.phone,
                from,
                body: text.trim()
            })
        })
            .then(() => {
                setActiveConversation({
                    ...activeConversation,
                    messages: [
                        ...(activeConversation.messages || []),
                        {
                            id: `m-${Date.now()}`,
                            direction: 'out',
                            text: text.trim(),
                            time: new Date().toISOString(),
                            fromNumber: from
                        }
                    ],
                    lastFrom: from
                });
                setText('');
            })
            .finally(() => setSending(false));
    };

    const contact = activeConversation?.contact;

    const ContactAvatar = (
        <StatusAvatar
            name={contact?.name || 'Contact'}
            status={contact?.status || 'no_status'}
            onStatusChange={s => updateLeadStatus(contact?.id, s)}
            className="w-8 h-8"
        />
    );

    const MyAvatar = (
        <StatusAvatar
            name="ME"
            status="connected"
            className="w-8 h-8"
        />
    );

    return (
        <div className={`${className} flex flex-col h-full bg-surface`}>
            {showHeader && (
                    <div className="p-4 border-b border-border flex justify-between">
                    <div className="flex items-center gap-3">
                        {ContactAvatar}
                        <div>
                            <div className="font-semibold">{contact?.name}</div>
                                <div className="text-sm muted-text">{contact?.phone}</div>
                        </div>
                    </div>
                    <ActionBar />
                </div>
            )}

            {/* Verification bar (22px tall) above composer */}
            <div className="px-4 py-2 border-b border-border bg-surface">
                <div className="flex items-center gap-2 h-[22px]">
                    <button onClick={async () => {
                        // mark verified for selected number
                        try {
                            const selected = activeConversation?.selectedNumber || activeConversation?.contact?.phone
                            if (!selected) return
                            await fetch(`/api/contacts/${activeConversation.contact.id}`, { method: 'PATCH', headers: { 'content-type':'application/json' }, body: JSON.stringify({ verifiedNumber: selected }) })
                            setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, verifiedNumber: selected } })
                        } catch (e) { console.error(e) }
                    }} className={`text-sm px-2 rounded h-[22px] btn-primary`}>Verified ✔</button>

                    <button onClick={async () => { if (!activeConversation?.contact?.id) return; await updateLeadStatus(activeConversation.contact.id, 'wrong_number'); setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, status: 'wrong_number' } }); }} className="text-sm px-2 rounded h-[22px] ghost-btn">Wrong number ❌</button>

                    <button onClick={async () => { if (!activeConversation?.contact?.id) return; await updateLeadStatus(activeConversation.contact.id, 'dnc'); setActiveConversation({ ...activeConversation, contact: { ...activeConversation.contact, status: 'dnc' } }); }} className="text-sm px-2 rounded h-[22px] ghost-btn">DNC ❗</button>
                </div>
            </div>

            {/* Messages Feed */}
            <div
                ref={feedRef}
                className={`flex-1 overflow-y-auto p-6 space-y-5 bg-surface min-h-0 ${compact ? 'pb-72' : ''
                    }`}
            >
                                {(() => {
                                    const msgs = compact ? (activeConversation?.messages || []).slice(-3) : (activeConversation?.messages || [])
                                    const sel = activeConversation?.selectedNumber
                                    return msgs.filter(m => {
                                        if (!sel) return true
                                        const from = m.fromNumber || m.from || ''
                                        const to = m.toNumber || m.to || ''
                                        return from === sel || to === sel
                                    }).map(m => m)
                                })().map(m => {
                    const isOut = m.direction === 'out';
                    const dt = new Date(m.time);
                    const timeLabel = dt.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                    });

                    const avatar = isOut ? null : ContactAvatar;

                    return (
                        <div key={m.id} className="flex w-full">
                            <div
                                className={`flex items-end gap-3 max-w-[70%] ${isOut
                                        ? 'flex-row-reverse ml-auto'
                                        : 'flex-row mr-auto'
                                    }`}
                            >
                                {/* Avatar */}
                                {avatar}

                                {/* Bubble + Meta */}
                                <div className="flex flex-col gap-1">
                                    <div
                                        className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${isOut
                                                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                                                : 'bg-surface border border-border text-foreground rounded-2xl rounded-bl-md'
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">
                                            {m.text}
                                        </div>
                                    </div>

                                    <MessageMeta
                                        timeLabel={timeLabel}
                                        campaignName={m.campaign?.name}
                                        fromNumber={m.fromNumber}
                                        isOut={isOut}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {(!activeConversation ||
                    (activeConversation.messages || []).length === 0) && (
                        <div
                            className={`text-center muted-text mt-10 ${compact ? 'text-sm' : 'text-base'
                                }`}
                        >
                            {compact
                                ? 'No messages'
                                : 'No messages yet — start the conversation.'}
                        </div>
                    )}
            </div>


            {showComposer && (
                <div className="border-t border-border bg-surface p-4">
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Type a message"
                            className="w-full min-h-[72px] p-3 pr-12 border rounded-xl focus:border-blue-500 outline-none resize-none"
                        />
                        <button
                            disabled={sending || !text.trim()}
                            onClick={send}
                            className="absolute right-3 bottom-3 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
