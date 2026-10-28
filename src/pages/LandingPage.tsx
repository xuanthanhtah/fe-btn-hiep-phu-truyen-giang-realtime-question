import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHostStore, generateRoomCode } from '../stores/host.store';
import { Zap, ArrowRight, Play, QrCode } from 'lucide-react';
import { ConnectionBadge } from '../components/ConnectionBadge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const initRoom = useHostStore((s) => s.initRoom);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    const roomId = generateRoomCode();
    initRoom(roomId);
    navigate(`/host/${roomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a room code');
      return;
    }
    navigate(`/join/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Minimal Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">HiepPhuPoll</span>
        </div>

        <ConnectionBadge showDetails={false} />
      </header>

      {/* Hero / Action Center */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <QrCode className="w-3.5 h-3.5" />
            <span>Bình chọn ABCD Khán giả Trực tiếp</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            Tương Tác Khán Giả Thời Gian Thực
          </h1>

          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8">
            Quét mã QR bằng điện thoại để bình chọn A, B, C hoặc D. Kết quả hiển thị và phân tích trực tiếp trên màn hình sân khấu.
          </p>

          {/* Primary Action: Create Room */}
          <button
            onClick={handleCreateRoom}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-base transition shadow-xl shadow-indigo-600/25 cursor-pointer mb-6"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Tạo phòng bình chọn mới</span>
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-xs uppercase tracking-widest text-slate-500 font-semibold absolute">
              hoặc tham gia phòng có sẵn
            </span>
          </div>

          {/* Secondary Action: Join by Code */}
          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setError('');
              }}
              placeholder="Nhập mã phòng"
              maxLength={8}
              className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-center font-mono font-bold uppercase text-white tracking-widest placeholder:text-slate-600 placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition border border-slate-700 flex items-center justify-center cursor-pointer"
              title="Vào phòng"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {error && <p className="text-rose-400 text-xs font-semibold mt-3">{error}</p>}

          <div className="mt-8 pt-6 border-t border-slate-800/60 text-xs text-slate-500">
            Không cần tài khoản &bull; Bộ 9 câu hỏi Truyền Giảng 31/10 nạp sẵn
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        HiepPhuPoll &bull; Nền tảng bình chọn sân khấu tương tác
      </footer>
    </div>
  );
};
