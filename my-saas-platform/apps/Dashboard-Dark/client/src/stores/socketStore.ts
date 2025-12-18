import { create } from 'zustand';

export interface SocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  send: (event: string, data: any) => void;
  onMessage: ((event: string, data: any) => void) | null;
  setOnMessage: (callback: (event: string, data: any) => void) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onMessage: null,

  connect: async (url: string) => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          set({ socket: ws, isConnected: true });
          console.log('WebSocket connected');
          resolve();
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const callback = get().onMessage;
            if (callback) {
              callback(data.event || 'message', data);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          set({ isConnected: false });
          reject(error);
        };
        
        ws.onclose = () => {
          set({ socket: null, isConnected: false });
          console.log('WebSocket disconnected');
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  send: (event: string, data: any) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.send(JSON.stringify({ event, ...data }));
    } else {
      console.warn('WebSocket not connected');
    }
  },

  setOnMessage: (callback) => {
    set({ onMessage: callback });
  },
}));
