import { create } from 'zustand';
import type { ConnectionStatus } from '../types/poll';
import { getAppConfig } from '../realtime/supabase.client';

interface ConnectionState {
  status: ConnectionStatus;
  transportType: 'supabase' | 'local';
  isConfigured: boolean;
  error: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setTransportType: (type: 'supabase' | 'local') => void;
  setError: (error: string | null) => void;
}

const config = getAppConfig();

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  transportType: config.isConfigured ? 'supabase' : 'local',
  isConfigured: config.isConfigured,
  error: null,
  setStatus: (status) => set({ status }),
  setTransportType: (transportType) => set({ transportType }),
  setError: (error) => set({ error }),
}));
