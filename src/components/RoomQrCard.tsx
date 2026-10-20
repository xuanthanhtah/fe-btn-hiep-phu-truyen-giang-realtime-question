import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode, X, ZoomIn } from 'lucide-react';
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
  const [isZoomed, setIsZoomed] = useState(false);
  const config = getAppConfig();

  // Clean trailing slashes
  const baseUrl = config.publicAppUrl.replace(/\/+$/, '');
  const joinUrl = `${baseUrl}/join/${roomId}`;

  // Close zoom modal on ESC
  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const renderZoomModal = () => {
    if (!isZoomed || typeof document === 'undefined') return null;

    const modal = (
      <div
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
        onClick={() => setIsZoomed(false)}
      >
        <div
          className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-1 text-indigo-400">
            <QrCode className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Quét mã tham gia</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Dùng camera điện thoại quét mã QR để vào phòng bình chọn
          </p>

          {/* Large High-Res QR code */}
          <div className="bg-white p-3.5 rounded-2xl shadow-2xl mb-4">
            <QRCodeSVG value={joinUrl} size={240} level="H" includeMargin={true} />
          </div>

          {/* Room Code */}
          <div className="w-full mb-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">
              Mã phòng tham gia
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-widest bg-slate-950/80 py-2 px-5 rounded-2xl border border-slate-800">
              {roomId}
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Đã sao chép link!</span>
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
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              title="Mở màn hình người chơi trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );

    return createPortal(modal, document.body);
  };

  if (compact) {
    return (
      <>
        <div
          onClick={() => setIsZoomed(true)}
          className="group flex items-center gap-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/60 hover:border-indigo-500/60 p-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
          title="Bấm để phóng to mã QR"
        >
          <div className="relative bg-white p-1 rounded-lg shadow group-hover:ring-2 group-hover:ring-indigo-400/60 transition">
            <QRCodeSVG value={joinUrl} size={56} level="M" />
            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <ZoomIn className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Mã phòng</span>
              <ZoomIn className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-black text-white font-mono tracking-widest">{roomId}</span>
            <button
              onClick={handleCopy}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5 cursor-pointer text-left"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
            </button>
          </div>
        </div>

        {renderZoomModal()}
      </>
    );
  }

  return (
    <>
      <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-3 text-indigo-400">
          <QrCode className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Quét mã để bình chọn</span>
        </div>

        <div
          onClick={() => setIsZoomed(true)}
          className="group relative bg-white p-3 rounded-2xl shadow-inner mb-4 cursor-pointer hover:ring-4 hover:ring-indigo-500/40 transition-all duration-200"
          title="Bấm để phóng to mã QR"
        >
          <QRCodeSVG value={joinUrl} size={size} level="Q" includeMargin={true} />
          <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
            <ZoomIn className="w-8 h-8 mb-1" />
            <span className="text-xs font-bold bg-black/70 px-2.5 py-1 rounded-full">Bấm để phóng to</span>
          </div>
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

      {renderZoomModal()}
    </>
  );
};
