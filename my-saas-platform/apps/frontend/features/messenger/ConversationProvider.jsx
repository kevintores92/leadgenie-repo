import React, { createContext, useContext, useState, useEffect } from 'react';
import { conversations as initialConversations, activeConversation as initialActive } from './data';

const ConversationContext = createContext(null);

export function ConversationProvider({ children, initialData = null }) {
  const [conversations, setConversations] = useState(initialData?.contacts ? initialData.contacts.map(c => ({
    id: c.id || c.contact_id || c.contactId,
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    email: c.email1,
    phone: c.phone1
  })) : initialConversations);
  const [activeConversation, setActiveConversation] = useState(initialData?.contacts && initialData.contacts.length ? { contact: { name: `${initialData.contacts[0].first_name} ${initialData.contacts[0].last_name}`, email: initialData.contacts[0].email1, phone: initialData.contacts[0].phone1 }, messages: [] } : initialActive);

  useEffect(() => {
    // Try to load seed JSON produced by the worker seeder as a fallback for local dev
    if (!initialData) {
      fetch('/messenger-seed.json')
      .then((r) => {
        if (!r.ok) throw new Error('no seed JSON');
        return r.json();
      })
      .then((data) => {
        if (data?.contacts && data.contacts.length) {
          // attach messages per contact when available
          const msgs = data.messages || [];
          const convs = data.contacts.map(c => {
            const contactMsgs = msgs.filter(m => m.contactId === c.id).map(m => ({ ...m }));
            // derive last used from-number for conversation if available
            const lastFromMsg = [...contactMsgs].reverse().find(m => m.fromNumber || m.from);
            return {
              id: c.id || c.contact_id || c.contactId,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
              email: c.email1,
              phone: c.phone1,
              messages: contactMsgs,
              lastFrom: lastFromMsg ? (lastFromMsg.fromNumber || lastFromMsg.from) : undefined
            };
          });
          setConversations(convs);
          const first = convs[0];
          setActiveConversation({ contact: { name: first.name, email: first.email, phone: first.phone }, messages: first.messages || [] });
        }
      })
      .catch(() => {});
    }
  }, []);

  const value = {
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversation must be used within ConversationProvider');
  return ctx;
}

export default ConversationProvider;
