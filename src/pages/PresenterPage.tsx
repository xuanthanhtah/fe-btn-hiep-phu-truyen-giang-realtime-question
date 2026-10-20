import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePresenterStore } from '../stores/presenter.store';
import { useConnectionStore } from '../stores/connection.store';
import { subscribeToRoomChannel, type RoomChannelSubscription } from '../realtime/room.channel';
import { createRoomSyncRequestEvent } from '../realtime/room.events';
import { PollResultsView } from '../components/PollResultsView';
import { RoomQrCard } from '../components/RoomQrCard';
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
    }, 400);

    return () => {
      clearTimeout(syncTimer);
      sub.unsubscribe();
      subRef.current = null;
    };
  }, [roomId, navigate, resetState, applySnapshot, applyVoteAccepted, applyPollOpened, applyPollClosed, applyQuestionChanged, applyRoomReset, setConnectionStatus, setTransportType]);

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
        {!activeQuestion ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="w-12 h-12 text-indigo-400 mb-4 animate-pulse" />
            <h2 className="text-3xl font-black text-white mb-2">Sẵn sàng trình chiếu</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Quét mã QR trên màn hình bằng điện thoại để tham gia bình chọn trực tiếp.
            </p>
            <RoomQrCard roomId={roomId || ''} size={220} />
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
        <span>Sự kiện Truyền Giảng • Trực tiếp tương tác</span>
        <span>Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">F</kbd> Toàn màn hình</span>
      </footer>
    </div>
  );
};
