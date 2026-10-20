import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { getAppConfig } from '../realtime/supabase.client';

interface RoomQrCardProps {
  roomId: string;
  size?: number;
  compact?: boolean;
}

export const RoomQrCard: React.FC<RoomQrCardProps> = ({
  roomId,
  size = 180,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const config = getAppConfig();

  // Clean trailing slashes
  const baseUrl = config.publicAppUrl.replace(/\/+$/, '');
  const joinUrl = `${baseUrl}/join/${roomId}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Copy to clipboard failed:', err);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 p-2.5 rounded-xl shadow-lg">
        <div className="bg-white p-1.5 rounded-lg">
          <QRCodeSVG value={joinUrl} size={64} level="M" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Mã phòng</span>
          <span className="text-xl font-black text-white font-mono tracking-widest">{roomId}</span>
          <button
            onClick={handleCopy}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-3 text-indigo-400">
        <QrCode className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-widest">Quét mã để bình chọn</span>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-inner mb-4">
        <QRCodeSVG value={joinUrl} size={size} level="Q" includeMargin={true} />
      </div>

      <div className="w-full">
        <div className="text-xs text-slate-400 mb-1">Mã tham gia</div>
        <div className="text-3xl font-extrabold text-white font-mono tracking-widest bg-slate-950/60 py-1.5 px-4 rounded-xl border border-slate-800">
          {roomId}
        </div>
      </div>

      <div className="w-full mt-4 flex items-center justify-center gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-xl text-xs font-semibold text-indigo-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Đã sao chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Sao chép link</span>
            </>
          )}
        </button>

        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
          title="Open participant screen in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
