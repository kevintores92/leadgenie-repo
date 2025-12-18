import { create } from 'zustand';

export interface Message {
  id: string;
  contactId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  channel: 'SMS' | 'MANUAL';
  fromNumber: string;
  toNumber: string;
  body?: string;
  sentAt?: string;
  twilioSid?: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  brandId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  status?: string;
  messages: Message[];
  unreadCount: number;
}

export interface ConversationsState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (contactId: string, message: Message) => void;
  updateMessage: (contactId: string, messageId: string, updates: Partial<Message>) => void;
  updateConversationStatus: (contactId: string, status: string) => void;
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  activeConversation: null,

  setConversations: (conversations) => {
    set({ conversations });
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
  },

  addMessage: (contactId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.contactId === contactId) {
          return {
            ...conv,
            messages: [...conv.messages, message],
          };
        }
        return conv;
      }),
      activeConversation:
        state.activeConversation?.contactId === contactId
          ? {
              ...state.activeConversation,
              messages: [...state.activeConversation.messages, message],
            }
          : state.activeConversation,
    }));
  },

  updateMessage: (contactId, messageId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.contactId === contactId) {
          return {
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          };
        }
        return conv;
      }),
      activeConversation:
        state.activeConversation?.contactId === contactId
          ? {
              ...state.activeConversation,
              messages: state.activeConversation.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            }
          : state.activeConversation,
    }));
  },

  updateConversationStatus: (contactId, status) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.contactId === contactId
          ? { ...conv, status }
          : conv
      ),
      activeConversation:
        state.activeConversation?.contactId === contactId
          ? { ...state.activeConversation, status }
          : state.activeConversation,
    }));
  },
}));
