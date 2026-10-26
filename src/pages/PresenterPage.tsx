import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePresenterStore } from '../stores/presenter.store';
import { useConnectionStore } from '../stores/connection.store';
import { subscribeToRoomChannel, type RoomChannelSubscription } from '../realtime/room.channel';
import { createRoomSyncRequestEvent, createRoomStateEvent } from '../realtime/room.events';
import { PollResultsView } from '../components/PollResultsView';
import { RoomQrCard } from '../components/RoomQrCard';
import { QRCodeSVG } from 'qrcode.react';
import { getAppConfig } from '../realtime/supabase.client';
import {
  Maximize,
  Minimize,
  ArrowLeft,
  Radio,
} from 'lucide-react';

export const PresenterPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Fine-grained selectors
  const isStarted = usePresenterStore((s) => s.isStarted);
  const activeQuestion = usePresenterStore((s) => s.currentQuestion);
  const currentQuestionIndex = usePresenterStore((s) => s.currentQuestionIndex);
  const totalQuestions = usePresenterStore((s) => s.totalQuestions);
  const pollStatus = usePresenterStore((s) => s.pollStatus);
  const voteCounts = usePresenterStore((s) => s.voteCounts);
  const totalAcceptedVotes = usePresenterStore((s) => s.totalAcceptedVotes);

  const resetState = usePresenterStore((s) => s.resetState);
  const applySnapshot = usePresenterStore((s) => s.applySnapshot);
  const applyVoteAccepted = usePresenterStore((s) => s.applyVoteAccepted);
  const applyPollOpened = usePresenterStore((s) => s.applyPollOpened);
  const applyPollClosed = usePresenterStore((s) => s.applyPollClosed);
  const applyQuestionChanged = usePresenterStore((s) => s.applyQuestionChanged);
  const applyRoomReset = usePresenterStore((s) => s.applyRoomReset);

  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const setTransportType = useConnectionStore((s) => s.setTransportType);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<RoomChannelSubscription | null>(null);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Realtime channel subscription & synchronization
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    resetState(roomId);

    const sub = subscribeToRoomChannel(roomId, {
      onEvent: (event) => {
        if (event.roomId !== roomId) return;

        if (event.type === 'room:state') {
          applySnapshot({
            roomId: event.roomId,
            revision: event.payload.revision,
            currentQuestionIndex: event.payload.currentQuestionIndex,
            totalQuestions: event.payload.totalQuestions,
            currentQuestion: event.payload.currentQuestion,
            pollStatus: event.payload.pollStatus,
            voteCounts: event.payload.voteCounts,
            totalAcceptedVotes: event.payload.totalAcceptedVotes,
          });
        } else if (event.type === 'vote:accepted') {
          applyVoteAccepted({
            questionId: event.payload.questionId,
            revision: event.payload.revision,
            voteCounts: event.payload.voteCounts,
            totalAcceptedVotes: event.payload.totalAcceptedVotes,
          });
        } else if (event.type === 'poll:opened') {
          applyPollOpened({
            questionId: event.payload.questionId,
            revision: event.payload.revision,
          });
        } else if (event.type === 'poll:closed') {
          applyPollClosed({
            questionId: event.payload.questionId,
            revision: event.payload.revision,
          });
        } else if (event.type === 'question:changed') {
          applyQuestionChanged({
            questionIndex: event.payload.questionIndex,
            totalQuestions: event.payload.totalQuestions,
            currentQuestion: event.payload.currentQuestion,
            revision: event.payload.revision,
          });
        } else if (event.type === 'room:reset') {
          applyRoomReset({
            revision: event.payload.revision,
          });
        } else if (event.type === 'room:sync_request') {
          const pres = usePresenterStore.getState();
          if (pres.currentQuestion && subRef.current) {
            const stateEvt = createRoomStateEvent(roomId, {
              roomId,
              revision: pres.revision,
              currentQuestionIndex: pres.currentQuestionIndex,
              totalQuestions: pres.totalQuestions,
              currentQuestion: pres.currentQuestion,
              pollStatus: pres.pollStatus,
              voteCounts: pres.voteCounts,
              totalAcceptedVotes: pres.totalAcceptedVotes,
            });
            subRef.current.broadcast(stateEvt);
          }
        }
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          const syncEvt = createRoomSyncRequestEvent(roomId);
          subRef.current?.broadcast(syncEvt);
        }
      },
    });

    subRef.current = sub;
    setTransportType(sub.getTransportType());

    // Send initial sync request
    const syncTimer = setTimeout(() => {
      const syncEvt = createRoomSyncRequestEvent(roomId);
      sub.broadcast(syncEvt);
    }, 200);

    // Keep polling until we get the active question
    const syncInterval = setInterval(() => {
      const state = usePresenterStore.getState();
      if (!state.currentQuestion && subRef.current) {
        const syncEvt = createRoomSyncRequestEvent(roomId);
        subRef.current.broadcast(syncEvt);
      }
    }, 2000);

    return () => {
      clearTimeout(syncTimer);
      clearInterval(syncInterval);
      sub.unsubscribe();
      subRef.current = null;
    };
  }, [roomId, navigate, resetState, applySnapshot, applyVoteAccepted, applyPollOpened, applyPollClosed, applyQuestionChanged, applyRoomReset, setConnectionStatus, setTransportType]);

  const config = getAppConfig();
  const baseUrl = config.publicAppUrl.replace(/\/+$/, '');
  const joinUrl = `${baseUrl}/join/${roomId || ''}`;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white"
    >
      {/* Stage Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/host/${roomId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-800 transition cursor-pointer"
            title="Open host controls"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Host Controls</span>
          </button>
        </div>

        {/* Right side: Compact QR & Fullscreen */}
        <div className="flex items-center gap-3">
          <RoomQrCard roomId={roomId || ''} compact={true} />

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
            title="Toggle fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Stage Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        {!isStarted || !activeQuestion ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs sm:text-sm font-bold uppercase tracking-widest mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang đón khán giả tham gia</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
              Quét mã QR để tham gia bình chọn
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mb-6">
              Mở camera điện thoại quét mã QR hoặc truy cập đường link để vào phòng.
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center max-w-sm sm:max-w-md w-full">
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-2xl ring-4 ring-indigo-500/20 mb-5">
                <QRCodeSVG
                  value={joinUrl}
                  size={280}
                  level="H"
                  includeMargin={true}
                  className="max-w-[70vw] w-auto h-auto"
                />
              </div>

              <div className="w-full">
                <div className="text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
                  Mã phòng
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-widest bg-slate-950 py-2 px-6 rounded-2xl border border-slate-800 shadow-inner mb-2">
                  {roomId}
                </div>
                <div className="text-xs text-indigo-300/80 font-mono break-all">
                  {joinUrl}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Màn hình sẽ tự động hiển thị câu hỏi khi người điều phối bấm bắt đầu</span>
            </div>
          </div>
        ) : !activeQuestion.options || activeQuestion.options.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl w-full mx-auto py-12 px-4">
            <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl flex flex-col items-center justify-center text-center backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-400">
                  Câu {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                {activeQuestion.category && (
                  <span className="text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeQuestion.category}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-relaxed text-center max-w-4xl">
                {activeQuestion.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Stage Question Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
                  Câu {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                {activeQuestion.category && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeQuestion.category}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                {activeQuestion.title}
              </h1>
            </div>

            {/* Results Component */}
            <PollResultsView
              question={activeQuestion}
              pollStatus={pollStatus}
              voteCounts={voteCounts}
              totalAcceptedVotes={totalAcceptedVotes}
              mode="stage"
            />
          </div>
        )}
      </main>

      {/* Subtle Stage Bar */}
      <footer className="px-6 py-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900">
        <span>Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">F</kbd> Toàn màn hình</span>
      </footer>
    </div>
  );
};
