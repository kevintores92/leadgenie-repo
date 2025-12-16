import { MessageSquare, Users, Megaphone, BarChart3, Settings, MessageCircle, Phone, Voicemail } from 'lucide-react';

export const currentUser = {
  name: 'Kevin Valenzuela',
  initials: 'KV',
  avatarColor: 'bg-indigo-600'
};

export const navigationItems = [
  { icon: MessageSquare, label: 'Messenger', id: 'messenger', href: '/app/messenger' },
  { icon: Users, label: 'Contacts', id: 'contacts', href: '/app/contacts' },
  { icon: Megaphone, label: 'Campaigns', id: 'campaigns', href: '/app/campaigns' },
  { icon: BarChart3, label: 'Reports', id: 'reports', href: '/app/reports' },
  { icon: Voicemail, label: 'Drip', id: 'drip', href: '/app/drip' },
  { icon: Settings, label: 'Settings', id: 'settings', href: '/app/settings' },
];

export const conversations = [];

export const activeConversation = {
  contact: {
    name: 'Dhairya staging',
    email: 'popeyaanehh@yandex.com',
    phone: '(844) 502-1526',
    initials: 'DS',
    avatarColor: 'bg-[#C5A572]',
    owner: 'Dhairya Raghav'
  },
  messages: [
    { id: 'm-call-1', type: 'call', status: 'outbound', direction: 'out', time: new Date().toISOString(), campaign: { name: '122324 C1 TLL 70%+ Equity' }, fromNumber: 'FL (727) 756-0779' },
    { id: 'm-call-2', type: 'call', status: 'outbound', direction: 'out', time: new Date().toISOString(), campaign: { name: '122324 C1 TLL 70%+ Equity' }, fromNumber: 'FL (727) 756-0779' },
    { id: 'm-missed-1', type: 'call', status: 'missed', direction: 'in', time: new Date(new Date().getTime() - 1000 * 60 * 120).toISOString() },
    { id: 'm-sms-1', direction: 'out', text: "Hey, quick update about the property.", time: new Date().toISOString(), fromNumber: 'FL (727) 756-0779' },
    { id: 'm-sms-2', direction: 'in', text: "Thanks — we're interested.", time: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 5).toISOString() }
  ]
};
