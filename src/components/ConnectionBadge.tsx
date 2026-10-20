import React from 'react';
import { WifiOff, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import type { ConnectionStatus } from '../types/poll';
import { useConnectionStore } from '../stores/connection.store';

interface ConnectionBadgeProps {
  status?: ConnectionStatus;
  transportType?: 'supabase' | 'local';
  showDetails?: boolean;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  status: propStatus,
  transportType: propTransport,
  showDetails = false,
}) => {
  const storeStatus = useConnectionStore((s) => s.status);
  const storeTransport = useConnectionStore((s) => s.transportType);
  const isConfigured = useConnectionStore((s) => s.isConfigured);

  const status = propStatus ?? storeStatus;
  const transport = propTransport ?? storeTransport;

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500 animate-pulse',
          label: transport === 'supabase' ? 'Live Connected' : 'Local Connected',
          icon: <Radio className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'connecting':
        return {
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500 animate-ping',
          label: 'Connecting...',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />,
        };
      case 'reconnecting':
        return {
          color: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
          dot: 'bg-orange-500 animate-ping',
          label: 'Reconnecting...',
          icon: <RefreshCw className="w-3.5 h-3.5 text-orange-300 animate-spin" />,
        };
      case 'unavailable':
        return {
          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dot: 'bg-zinc-500',
          label: 'Session Unavailable',
          icon: <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />,
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          label: 'Disconnected',
          icon: <WifiOff className="w-3.5 h-3.5 text-rose-400" />,
        };
    }
  };

  const current = getStatusConfig();

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${current.color}`}
      >
        <span className={`w-2 h-2 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
      </div>

      {showDetails && !isConfigured && (
        <span className="text-[11px] text-amber-400/90 flex items-center gap-1 font-mono">
          <AlertCircle className="w-3 h-3 inline" />
          No Supabase keys set in .env (multi-window memory bus active)
        </span>
      )}
    </div>
  );
};
