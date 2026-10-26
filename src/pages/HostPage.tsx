import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHostStore } from '../stores/host.store';
import { useConnectionStore } from '../stores/connection.store';
import { subscribeToRoomChannel, type RoomChannelSubscription } from '../realtime/room.channel';
import {
  createRoomStateEvent,
  createPollOpenedEvent,
  createPollClosedEvent,
  createQuestionChangedEvent,
  createVoteAcceptedEvent,
  createRoomResetEvent,
} from '../realtime/room.events';
import type { RealtimeEvent } from '../realtime/room.protocol';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { RoomQrCard } from '../components/RoomQrCard';
import { PollResultsView } from '../components/PollResultsView';
import { QuestionEditor } from '../components/QuestionEditor';
import { ResetModal } from '../components/ResetModal';
import { SettingsModal } from '../components/SettingsModal';
import { ReorderOptionsModal } from '../components/ReorderOptionsModal';
import { useSettingsStore } from '../stores/settings.store';
import type { OptionId, PollQuestion } from '../types/poll';
import {
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Zap,
  QrCode,
  Settings,
  MoveVertical,
} from 'lucide-react';

export const HostPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Zustand selectors
  const hostRoomId = useHostStore((s) => s.roomId);
  const questions = useHostStore((s) => s.questions);
  const currentQuestionIndex = useHostStore((s) => s.currentQuestionIndex);
  const pollStatus = useHostStore((s) => s.pollStatus);
  const isStarted = useHostStore((s) => s.isStarted);

  const initRoom = useHostStore((s) => s.initRoom);
  const startSession = useHostStore((s) => s.startSession);
  const showQrLobby = useHostStore((s) => s.showQrLobby);
  const openPoll = useHostStore((s) => s.openPoll);
  const closePoll = useHostStore((s) => s.closePoll);
  const goToQuestion = useHostStore((s) => s.goToQuestion);
  const resetCurrentPoll = useHostStore((s) => s.resetCurrentPoll);
  const addQuestion = useHostStore((s) => s.addQuestion);
  const updateQuestion = useHostStore((s) => s.updateQuestion);
  const deleteQuestion = useHostStore((s) => s.deleteQuestion);
  const reorderQuestions = useHostStore((s) => s.reorderQuestions);
  const importQuestions = useHostStore((s) => s.importQuestions);

  const connectionStatus = useConnectionStore((s) => s.status);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const setTransportType = useConnectionStore((s) => s.setTransportType);

  // Channel reference
  const channelSubRef = useRef<RoomChannelSubscription | null>(null);
  const syncDebounceRef = useRef<number | null>(null);

  // Local UI state
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  const hostQuestionFontSize = useSettingsStore((s) => s.hostQuestionFontSize);

  // Broadcast current room snapshot helper
  const broadcastCurrentState = useCallback(async () => {
    if (!channelSubRef.current) return;
    const currentHost = useHostStore.getState();
    if (!currentHost.roomId) return;
    const snapshot = currentHost.getPublicSnapshot();
    const event = createRoomStateEvent(currentHost.roomId, snapshot);
    await channelSubRef.current.broadcast(event);
  }, []);

  // Handle incoming realtime events as authoritative host
  const handleHostIncomingEvent = useCallback(
    async (event: RealtimeEvent) => {
      const currentHost = useHostStore.getState();

      if (event.type === 'room:sync_request') {
        if (event.roomId !== currentHost.roomId) return;
        broadcastCurrentState();
        return;
      }

      if (event.type === 'vote:cast') {
        if (event.roomId !== currentHost.roomId) return;
        const { questionId, participantId, optionId } = event.payload;

        const result = currentHost.processVote({
          questionId,
          participantId,
          optionId,
        });

        if (result.accepted && result.updatedCounts && channelSubRef.current) {
          const acceptedEvent = createVoteAcceptedEvent(
            currentHost.roomId,
            questionId,
            participantId,
            optionId,
            useHostStore.getState().revision,
            result.updatedCounts,
            result.totalVotes!
          );
          await channelSubRef.current.broadcast(acceptedEvent);
        }
      }
    },
    [broadcastCurrentState]
  );

  // Initialize room & channel lifecycle
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    const currentRoomId = initRoom(roomId);

    const sub = subscribeToRoomChannel(currentRoomId, {
      onEvent: (event) => handleHostIncomingEvent(event),
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          broadcastCurrentState();
        }
      },
    });

    channelSubRef.current = sub;
    setTransportType(sub.getTransportType());

    // Initial broadcast
    const timer = setTimeout(() => {
      broadcastCurrentState();
    }, 200);

    // Periodic heartbeat every 4 seconds to sync any newly connected participants/presenters
    const heartbeatTimer = setInterval(() => {
      broadcastCurrentState();
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
      const debounceTimer = syncDebounceRef.current;
      if (debounceTimer) clearTimeout(debounceTimer);
      sub.unsubscribe();
      channelSubRef.current = null;
    };
  }, [roomId, navigate, initRoom, handleHostIncomingEvent, setConnectionStatus, setTransportType, broadcastCurrentState]);

  // Warning on refresh or closing tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Leaving or reloading will terminate the host session and lose in-memory votes!';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleStartSession = async () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'unavailable') return;
    startSession();
    await broadcastCurrentState();
  };

  const handleShowQrLobby = async () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'unavailable') return;
    showQrLobby();
    await broadcastCurrentState();
  };

  const handleOpenPoll = async () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'unavailable') return;
    openPoll();
    const currentQ = questions[currentQuestionIndex];
    if (channelSubRef.current && currentQ) {
      const openEvent = createPollOpenedEvent(hostRoomId, currentQ.id, useHostStore.getState().revision);
      await channelSubRef.current.broadcast(openEvent);
      await broadcastCurrentState();
    }
  };

  const handleClosePoll = async () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'unavailable') return;
    closePoll();
    const currentQ = questions[currentQuestionIndex];
    if (channelSubRef.current && currentQ) {
      const closeEvent = createPollClosedEvent(hostRoomId, currentQ.id, useHostStore.getState().revision);
      await channelSubRef.current.broadcast(closeEvent);
      await broadcastCurrentState();
    }
  };

  const handleGoToQuestion = async (index: number) => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'unavailable') return;
    goToQuestion(index);
    const newQ = questions[index];
    if (channelSubRef.current) {
      const changeEvent = createQuestionChangedEvent(
        hostRoomId,
        index,
        questions.length,
        newQ ?? null,
        useHostStore.getState().revision
      );
      await channelSubRef.current.broadcast(changeEvent);
      await broadcastCurrentState();
    }
  };

  const handleResetPollConfirm = async () => {
    setResetModalOpen(false);
    resetCurrentPoll();
    if (channelSubRef.current) {
      const resetEvent = createRoomResetEvent(hostRoomId, useHostStore.getState().revision);
      await channelSubRef.current.broadcast(resetEvent);
      await broadcastCurrentState();
    }
  };

  const handleUpdateActiveQuestion = (updatedQ: PollQuestion) => {
    updateQuestion(currentQuestionIndex, updatedQ);
    broadcastCurrentState();
  };

  const handleMoveActiveOption = (fromIndex: number, toIndex: number) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;
    const options = currentQ.options;
    if (fromIndex < 0 || fromIndex >= options.length || toIndex < 0 || toIndex >= options.length) return;
    const optionIds: OptionId[] = ['A', 'B', 'C', 'D'];
    const cloned = [...options];
    const [moved] = cloned.splice(fromIndex, 1);
    cloned.splice(toIndex, 0, moved);
    const updatedOptions = cloned.map((opt, idx) => ({
      id: optionIds[idx] || opt.id,
      text: opt.text,
    }));
    handleUpdateActiveQuestion({ ...currentQ, options: updatedOptions });
  };

  const activeQuestion = questions[currentQuestionIndex] ?? null;
  const snapshot = useHostStore.getState().getPublicSnapshot();
  const isControlsDisabled = connectionStatus === 'disconnected' || connectionStatus === 'unavailable';

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-500 transition shadow"
            title="Return Home"
          >
            <Zap className="w-4 h-4 fill-current" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Host Controller</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-300 font-mono font-bold">
              {hostRoomId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionBadge showDetails={false} />

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer"
            title="Cài đặt cỡ chữ và bố cục"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Cài đặt</span>
          </button>

          <a
            href={`/present/${hostRoomId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
            title="Open stage screen in new tab"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Presenter Stage</span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </a>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {isControlsDisabled && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Connection unavailable. Host controls temporarily paused.</span>
          </div>
        )}

        {/* Live Question Action Bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                  Câu {currentQuestionIndex + 1} / {questions.length}
                </span>
                {activeQuestion?.category && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeQuestion.category}
                  </span>
                )}
              </div>
              <h1
                style={{ fontSize: `${hostQuestionFontSize}px` }}
                className="font-black text-white leading-snug"
              >
                {activeQuestion?.title || 'Chưa chọn câu hỏi'}
              </h1>
            </div>

            {/* Prev / Next Question */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={isControlsDisabled || currentQuestionIndex === 0}
                onClick={() => handleGoToQuestion(currentQuestionIndex - 1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white transition border border-slate-700 cursor-pointer"
                title="Câu trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-400 px-1">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              <button
                disabled={isControlsDisabled || currentQuestionIndex === questions.length - 1}
                onClick={() => handleGoToQuestion(currentQuestionIndex + 1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white transition border border-slate-700 cursor-pointer"
                title="Câu tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Core Actions: Open/Close Poll, Reset, Toggle Deck Editor */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            {!isStarted ? (
              <div className="flex-1 flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Sân khấu đang hiện mã QR</span>
                </div>
                <button
                  disabled={isControlsDisabled}
                  onClick={handleStartSession}
                  className="flex-1 min-h-[46px] flex items-center justify-center gap-2 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Bắt đầu</span>
                </button>
              </div>
            ) : (!activeQuestion?.options || activeQuestion.options.length === 0) ? (
              <div className="flex-1 min-h-[46px] flex items-center justify-center px-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs font-semibold">
                Câu hỏi mở • Không cần mở bình chọn (Hiển thị chính giữa màn hình)
              </div>
            ) : pollStatus !== 'open' ? (
              <button
                disabled={isControlsDisabled}
                onClick={handleOpenPoll}
                className="flex-1 min-h-[46px] flex items-center justify-center gap-2 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Mở bình chọn</span>
              </button>
            ) : (
              <button
                disabled={isControlsDisabled}
                onClick={handleClosePoll}
                className="flex-1 min-h-[46px] flex items-center justify-center gap-2 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-rose-600/30 cursor-pointer active:scale-[0.99]"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Khóa bình chọn</span>
              </button>
            )}

            {isStarted && (
              <button
                disabled={isControlsDisabled}
                onClick={handleShowQrLobby}
                className="flex items-center gap-1.5 px-4 min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                title="Tạm dừng hiển thị câu hỏi và chiếu lại mã QR cho khán giả vào thêm"
              >
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>Hiện QR sân khấu</span>
              </button>
            )}

            {activeQuestion?.options && activeQuestion.options.length > 0 && (
              <>
                <button
                  disabled={isControlsDisabled}
                  onClick={() => setReorderModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                  title="Điều chỉnh thứ tự hiển thị của các đáp án A, B, C, D"
                >
                  <MoveVertical className="w-4 h-4 text-indigo-400" />
                  <span>Vị trí đáp án</span>
                </button>

                <button
                  disabled={isControlsDisabled}
                  onClick={() => setResetModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                  title="Xóa lượt bình chọn của câu hiện tại"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset câu này</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowQuestionEditor(!showQuestionEditor)}
              className={`flex items-center gap-1.5 px-4 min-h-[46px] rounded-2xl font-semibold text-xs border transition cursor-pointer ${
                showQuestionEditor
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{showQuestionEditor ? 'Đóng quản lý' : `Danh sách câu hỏi (${questions.length})`}</span>
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
              title="Cài đặt cỡ chữ và bố cục hiển thị"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Cài đặt</span>
            </button>
          </div>
        </div>

        {/* Question Editor (Collapsible) */}
        {showQuestionEditor && (
          <QuestionEditor
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            onSelectQuestion={(idx) => handleGoToQuestion(idx)}
            onAddQuestion={(q) => addQuestion(q)}
            onUpdateQuestion={(idx, q) => updateQuestion(idx, q)}
            onDeleteQuestion={(idx) => deleteQuestion(idx)}
            onReorderQuestion={(from, to) => reorderQuestions(from, to)}
            onImportQuestions={(qList) => {
              const ok = importQuestions(qList);
              if (ok) broadcastCurrentState();
              return ok;
            }}
          />
        )}

        {/* Live Stage Results & QR Code Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
            {(!activeQuestion?.options || activeQuestion.options.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-400 mb-2.5">
                  Hiển thị chính giữa màn hình chiếu
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white max-w-2xl mb-3 leading-relaxed text-center">
                  {activeQuestion?.title}
                </h3>
                <p className="text-xs text-slate-400 max-w-md text-center">
                  Câu hỏi thảo luận / đúc kết không có đáp án bình chọn ABCD.
                </p>
              </div>
            ) : (
              <PollResultsView
                question={activeQuestion}
                pollStatus={pollStatus}
                voteCounts={snapshot.voteCounts}
                totalAcceptedVotes={snapshot.totalAcceptedVotes}
                mode="host"
                onMoveOption={(from, to) => handleMoveActiveOption(from, to)}
                onOpenReorderModal={() => setReorderModalOpen(true)}
              />
            )}
          </div>

          <div className="flex flex-col gap-4">
            <RoomQrCard roomId={hostRoomId} size={160} />
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-3 text-center text-xs text-slate-600 border-t border-slate-900">
        HiepPhuPoll &bull; In-Memory Host Session
      </footer>

      {/* Reset Confirmation Modal */}
      <ResetModal
        isOpen={resetModalOpen}
        title="Xóa kết quả câu này?"
        message="Thao tác này sẽ đặt lại số phiếu của câu hỏi hiện tại về 0 trên cả màn hình sân khấu và điện thoại khán giả."
        confirmLabel="Xác nhận xóa phiếu"
        onConfirm={handleResetPollConfirm}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Display & Font Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        targetMode="host"
      />

      {/* Reorder Options Modal */}
      <ReorderOptionsModal
        isOpen={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        question={activeQuestion}
        onUpdateQuestion={handleUpdateActiveQuestion}
      />
    </div>
  );
};
