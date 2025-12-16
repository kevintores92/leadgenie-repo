
"use client";

import React from 'react';
import Toolbar from '../../components/Toolbar';
import {
   UserCircle,
   Calendar,
   CheckSquare,
   FileText,
   Mail,
   Phone,
   ChevronDown,
   ChevronUp,
   ExternalLink,
   Plus,
   CircleOff,
   Voicemail,
   MessageSquare,
   AlertCircle,
   Star,
   Trash2,
   Filter
} from "lucide-react";
import MessagePanel from './MessagePanel.jsx';
import { useConversation } from './ConversationProvider.jsx';
import { useToast } from '../../hooks/use-toast';

function SidebarComposer() {
   const { activeConversation, setActiveConversation } = useConversation();
   const { toast } = useToast();
   const [text, setText] = React.useState('');
   const [sending, setSending] = React.useState(false);

   React.useEffect(() => {
      // debug mount
   }, [activeConversation]);

   const send = async () => {
      if (!text.trim()) return;
      if (!activeConversation || !activeConversation.contact || !activeConversation.contact.phone) {
         toast({ title: 'No recipient', description: 'Select a conversation with a phone number to send.' });
         return;
      }
      setSending(true);
      const from = activeConversation?.lastFrom || undefined;
      try {
         const res = await fetch('/api/sms/send', { method: 'POST', headers: { 'content-type':'application/json', 'x-organization-id': 'demo-org-id', 'x-user-id': 'demo-user', 'x-user': 'Demo User' }, body: JSON.stringify({ to: activeConversation.contact.phone, from, body: text.trim() }) });
         const json = await res.json();
         if (!res.ok) throw new Error((json && json.error && JSON.stringify(json.error)) || 'Send failed');
         const msg = { id: `m-${Date.now()}`, direction: 'out', text: text.trim(), time: new Date().toISOString(), sid: json.sid, fromNumber: from };
         setActiveConversation({ ...activeConversation, messages: [...(activeConversation.messages||[]), msg], lastFrom: from });
         setText('');
         toast({ title: 'Message sent', description: 'SMS was sent successfully.' });
      } catch (e) {
         console.error('Send error', e);
         toast({ title: 'Send failed', description: e.message || 'Unknown error' });
      } finally { setSending(false); }
   };

   return (
      <div className="flex items-center gap-3" data-debug="sidebar-composer">
         <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type a message" className="flex-1 min-h-[72px] text-sm p-3 resize-none border border-gray-100 rounded outline-none" />
         <button disabled={sending} onClick={send} aria-label="Send" className={`w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center ${sending ? 'opacity-60' : 'hover:bg-blue-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9 22 2z"/></svg>
         </button>
      </div>
   );
}

export default function ContactSidebar() {
   const { activeConversation, setActiveConversation, conversations, setConversations } = useConversation();
   // Hide sidebar by default when no conversation is active
   if (!activeConversation) return null;
   const contact = activeConversation?.contact || (activeConversation && { name: activeConversation.name, email: activeConversation.email, phone: activeConversation.phone }) || {};
   const [form, setForm] = React.useState({});
   const [saving, setSaving] = React.useState(false);
   const [fieldStatus, setFieldStatus] = React.useState({});
   const [activeTab, setActiveTab] = React.useState('messages');
   const { toast } = useToast();

   React.useEffect(() => {
         // If active conversation doesn't include contact object, attempt to fetch it
         if (activeConversation && !activeConversation.contact && (activeConversation.contactId || activeConversation.contact_id)) {
            const cid = activeConversation.contactId || activeConversation.contact_id;
            fetch(`/contacts/${cid}`, { headers: { 'x-organization-id': 'demo-org-id', 'x-user-id': 'demo-user', 'x-user': 'Demo User' } }).then(r => r.json()).then(json => {
               setActiveConversation({ ...activeConversation, contact: json });
            }).catch(() => {});
         }
      setForm({
            firstName: contact.firstName || contact.first_name || (contact.name || '').split(' ')[0] || '',
            lastName: contact.lastName || contact.last_name || (contact.name || '').split(' ').slice(1).join(' ') || '',
            phone: contact.phone || contact.phone1 || '',
            email: contact.email || contact.email1 || '',
         propertyAddress: contact.propertyAddress || '',
         mailingAddress: contact.mailingAddress || '',
            owner: contact.owner || contact.ownerName || '',
         apn: contact.apn || '',
         timeZone: contact.timeZone || '',
         newField: contact.newField || '',
         beds: contact.beds || contact.bed || '',
         baths: contact.baths || '',
         zillowEstimate: contact.zillowEstimate || '',
         ac: contact.ac || '',
         taxAssessment: contact.taxAssessment || '',
         roof: contact.roof || '',
         garage: contact.garage || '',
         propertyType: contact.propertyType || '',
         pool: contact.pool || '',
         repairs: contact.repairs || '',
         rent: contact.rent || '',
         lastSoldDate: contact.lastSoldDate || '',
      });
   }, [activeConversation]);

   const initials = contact.initials || (contact.name ? contact.name.split(' ').map(s => s[0]).slice(0, 2).join('') : '');
   const avatarColor = contact.avatarColor || 'bg-indigo-600';

   const onChange = (k, v) => setForm(s => ({ ...s, [k]: v }));

   const validateField = (k, v) => {
      if (k === 'phone') {
         const digits = (v || '').replace(/[^0-9]/g, '');
         if (digits.length < 10) return 'Enter at least 10 digits';
      }
      if (k === 'email' && v) {
         // simple email regex
         const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
         if (!re.test(v)) return 'Invalid email';
      }
      if ((k === 'firstName' || k === 'lastName') && v && v.length > 100) return 'Too long';
      return null;
   };

   const saveField = async (k) => {
      if (!contact || !contact.id) return;
      const value = form[k];
      const err = validateField(k, value);
      setFieldStatus(s => ({ ...s, [k]: { saving: !!(!err), error: err } }));
      if (err) return;
      try {
         setFieldStatus(s => ({ ...s, [k]: { ...(s[k] || {}), saving: true } }));
         const res = await fetch(`/contacts/${contact.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-organization-id': 'demo-org-id', 'x-user-id': 'demo-user', 'x-user': 'Demo User' }, body: JSON.stringify({ [k]: value }) });
         if (!res.ok) throw new Error('Save failed');
         const json = await res.json();
         setActiveConversation({ ...activeConversation, contact: json });
         if (conversations && setConversations) {
            setConversations(conversations.map(c => c.id === contact.id ? ({ ...c, name: `${json.firstName} ${json.lastName}`.trim(), email: json.email, phone: json.phone }) : c));
         }
         setFieldStatus(s => ({ ...s, [k]: { saving: false, error: null } }));
         // small success toast
         toast({ title: 'Saved', description: `${k} saved.` });
      } catch (e) {
         console.error('save field error', e);
         setFieldStatus(s => ({ ...s, [k]: { saving: false, error: e.message || 'Save failed' } }));
         toast({ title: 'Save failed', description: e.message || 'Unable to save field' });
      }
   };

   return (
      <div className="relative w-[300px] px-4 bg-surface h-screen flex flex-col border-l border-border shrink-0 overflow-hidden font-inter">
         {/* Contact Profile Header */}
         <div onClick={() => setActiveTab('info')} className="p-5 flex flex-col items-center border-b border-border bg-surface cursor-pointer">
            <div className={`w-[72px] h-[72px] rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-medium mb-2.5`}>
               {initials}
            </div>
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
               {contact.name || 'No contact selected'}
            </h3>

            <div className="flex gap-3 mt-3">
               <div className="text-xs muted-text">{contact.email || contact.email1 || ''}</div>
               <div className="text-xs muted-text">{contact.phone || contact.phone1 || ''}</div>
            </div>
         </div>

         {/* Tabs */}
            <div className="flex h-10 border-b border-border bg-surface">
         <button
            title="Messages"
            onClick={() => setActiveTab('messages')}
            className={`flex-1 flex items-center justify-center transition duration-200 ease-in-out relative ${activeTab === 'messages' ? 'bg-surface text-primary' : 'muted-text hover:bg-surface'}`}
         >
            <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4">
               <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 transition-opacity duration-200 ease-in-out z-10 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0'}`} />
             </button>

         <button
            title="Info"
            onClick={() => setActiveTab('info')}
               className={`flex-1 flex items-center justify-center transition duration-200 ease-in-out relative ${activeTab === 'info' ? 'bg-surface text-primary' : 'muted-text hover:bg-surface'}`}
         >
            <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4">
               <circle cx="12" cy="12" r="10"/>
               <circle cx="12" cy="10" r="3"/>
               <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
            </svg>
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 transition-opacity duration-200 ease-in-out z-10 ${activeTab === 'info' ? 'opacity-100' : 'opacity-0'}`} />
             </button>

         <button
            title="Notes"
            onClick={() => setActiveTab('notes')}
               className={`flex-1 flex items-center justify-center transition duration-200 ease-in-out relative ${activeTab === 'notes' ? 'bg-surface text-primary' : 'muted-text hover:bg-surface'}`}
         >
            <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4">
               <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
               <polyline points="14 2 14 8 20 8"/>
               <line x1="16" y1="13" x2="8" y2="13"/>
               <line x1="16" y1="17" x2="8" y2="17"/>
               <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 transition-opacity duration-200 ease-in-out z-10 ${activeTab === 'notes' ? 'opacity-100' : 'opacity-0'}`} />
             </button>
         </div>

            {/* Phone number strip (scrollable) */}
             <div className="h-[22px] border-b border-border bg-surface overflow-x-auto whitespace-nowrap px-2 flex items-center gap-2">
                  {(() => {
                     const nums = [contact?.phone, contact?.phoneNumber, contact?.phone2, contact?.phone3, contact?.phone4, contact?.phone5].filter(Boolean)
                     if (!nums.length) return <div className="muted-text text-xs">No numbers</div>
                     return nums.map((num, idx) => {
                        const isSelected = activeConversation?.selectedNumber === num || (idx === 0 && !activeConversation?.selectedNumber)
                        return (
                           <button key={num+idx} onClick={() => {
                                 setActiveConversation({ ...activeConversation, selectedNumber: num, contact: { ...activeConversation.contact, phone: num } });
                              }} className={`px-3 text-xs h-[18px] rounded ${isSelected ? 'bg-primary text-primary-foreground' : 'muted-text hover:bg-surface'}`}>
                                 {num}
                           </button>
                        )
                     })
                  })()}
             </div>


         {/* Accordion Sections */}
         <div className="flex-1 bg-background min-h-0 flex flex-col">
            {/* Top action bar (Toolbar only visible for messages; placeholder for other tabs) */}
            <div className="h-[60px] px-5 border-b border-border bg-surface shrink-0">
               {activeTab === 'messages' ? <Toolbar /> : null}
            </div>

            {/* Tab content area */}
            <div className="flex-1 bg-surface min-h-0 overflow-y-auto flex flex-col">
                      {activeTab === 'messages' && (
                         <>
                            <div className="flex-1 min-h-0">
                               <MessagePanel className="h-full" showHeader={false} compact showComposer={false} />
                            </div>
                         </>
                      )}

               {activeTab === 'info' && (
                  <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-4 bg-[#F9FAFB]">
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[11px] muted-text mb-1 block">First name</label>
                           <div>
                              <input value={form.firstName || ''} onChange={(e) => onChange('firstName', e.target.value)} onBlur={() => saveField('firstName')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.firstName?.error ? 'border-red-400' : ''}`} />
                              {fieldStatus.firstName?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                              {fieldStatus.firstName?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.firstName.error}</div>}
                           </div>
                        </div>
                        <div>
                           <label className="text-[11px] muted-text mb-1 block">Last name</label>
                           <div>
                              <input value={form.lastName || ''} onChange={(e) => onChange('lastName', e.target.value)} onBlur={() => saveField('lastName')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.lastName?.error ? 'border-red-400' : ''}`} />
                              {fieldStatus.lastName?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                              {fieldStatus.lastName?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.lastName.error}</div>}
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Phone number</label>
                        <div className="flex items-center gap-3">
                           <div className="flex-1">
                              <input value={form.phone || ''} onChange={(e) => onChange('phone', e.target.value)} onBlur={() => saveField('phone')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.phone?.error ? 'border-red-400' : ''}`} />
                              {fieldStatus.phone?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                              {fieldStatus.phone?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.phone.error}</div>}
                           </div>
                           <button className="rounded px-3 py-2 ghost-btn muted-text hover:bg-surface" title="Call">
                              <Phone className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Email</label>
                        <div>
                           <input value={form.email || ''} onChange={(e) => onChange('email', e.target.value)} onBlur={() => saveField('email')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.email?.error ? 'border-red-400' : ''}`} />
                           {fieldStatus.email?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                           {fieldStatus.email?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.email.error}</div>}
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Property address</label>
                        <div className="flex items-center gap-2">
                           <div className="flex-1">
                              <input value={form.propertyAddress || ''} onChange={(e) => onChange('propertyAddress', e.target.value)} onBlur={() => saveField('propertyAddress')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.propertyAddress?.error ? 'border-red-400' : ''}`} />
                              {fieldStatus.propertyAddress?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                              {fieldStatus.propertyAddress?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.propertyAddress.error}</div>}
                           </div>
                           <button className="p-2 rounded-full ghost-btn muted-text hover:bg-surface" title="Edit"><Plus className="w-4 h-4" /></button>
                           <button className="p-2 rounded-full ghost-btn muted-text hover:bg-surface" title="Map"><ExternalLink className="w-4 h-4" /></button>
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Mailing address</label>
                        <div className="flex items-center gap-2">
                           <div className="flex-1">
                              <input value={form.mailingAddress || ''} onChange={(e) => onChange('mailingAddress', e.target.value)} onBlur={() => saveField('mailingAddress')} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus.mailingAddress?.error ? 'border-red-400' : ''}`} />
                              {fieldStatus.mailingAddress?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                              {fieldStatus.mailingAddress?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus.mailingAddress.error}</div>}
                           </div>
                           <button className="p-2 rounded-full ghost-btn muted-text hover:bg-surface" title="Edit"><Plus className="w-4 h-4" /></button>
                        </div>
                     </div>


                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Labels</label>
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="muted-badge text-sm">Price...</span>
                           <select className="rounded-full border px-3 py-1 text-sm">
                              <option>Select label</option>
                           </select>
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] muted-text mb-1 block">Campaigns</label>
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="muted-badge text-sm">Ohio · Absentee Owners - Part 1</span>
                        </div>
                     </div>

                     {/* Property details grid */}
                     <div className="grid grid-cols-3 gap-3 mt-2">
                        {[
                           ['Bed', 'beds'], ['Bath', 'baths'], ['Zillow estimate', 'zillowEstimate'],
                           ['AC', 'ac'], ['Tax assessment', 'taxAssessment'], ['Roof', 'roof'],
                           ['Garage', 'garage'], ['Property type', 'propertyType'], ['Pool', 'pool'],
                           ['Repairs', 'repairs'], ['Rent', 'rent'], ['Last sold date', 'lastSoldDate']
                        ].map(([label, key]) => (
                           <div key={key}>
                              <label className="text-[11px] muted-text mb-1 block">{label}</label>
                              <div>
                                 <input value={form[key] || ''} onChange={(e) => onChange(key, e.target.value)} onBlur={() => saveField(key)} className={`w-full rounded-full border px-3 py-2 text-sm ${fieldStatus[key]?.error ? 'border-red-400' : ''}`} />
                                 {fieldStatus[key]?.saving && <div className="text-[11px] muted-text mt-1">Saving...</div>}
                                 {fieldStatus[key]?.error && <div className="text-[11px] text-red-500 mt-1">{fieldStatus[key].error}</div>}
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="mt-4 flex gap-3">
                        <button onClick={async () => {
                           // save
                           if (!contact || !contact.id) return;
                           setSaving(true);
                           try {
                              const res = await fetch(`/contacts/${contact.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-organization-id': 'demo-org-id', 'x-user-id': 'demo-user', 'x-user': 'Demo User' }, body: JSON.stringify(form) });
                              if (!res.ok) throw new Error('Save failed');
                              const json = await res.json();
                              setActiveConversation({ ...activeConversation, contact: json });
                              if (conversations && setConversations) {
                                 setConversations(conversations.map(c => c.id === contact.id ? ({ ...c, name: `${json.firstName} ${json.lastName}`.trim(), email: json.email, phone: json.phone }) : c));
                              }
                              toast({ title: 'Saved', description: 'Contact updated.' });
                           } catch (e) {
                              console.error('Save error', e);
                              toast({ title: 'Save failed', description: e.message || 'Unable to save contact' });
                           } finally { setSaving(false); }
                        }} disabled={saving} className="flex-1 btn-primary px-4 py-3 rounded text-sm">{saving ? 'Saving...' : 'Save changes'}</button>
                        <button onClick={() => {
                           // cancel local edits
                           setForm({
                              firstName: contact.firstName || (contact.name || '').split(' ')[0] || '',
                              lastName: contact.lastName || (contact.name || '').split(' ').slice(1).join(' ') || '',
                              phone: contact.phone || '',
                              email: contact.email || '',
                              propertyAddress: contact.propertyAddress || '',
                              mailingAddress: contact.mailingAddress || ''
                           });
                        }} disabled={saving} className="flex-1 ghost-btn border-border text-foreground px-4 py-3 rounded text-sm">Cancel</button>
                     </div>
                  </div>
               )}


                 

            </div>
         </div>
         {/* Composer pinned to bottom of sidebar (inside sidebar root) */}
             <div className="absolute left-0 right-0 bottom-6 px-4 py-6 bg-surface border-t border-border z-50 shadow-sm min-h-[96px]">
            <SidebarComposer />
         </div>
      </div>
   );
}
