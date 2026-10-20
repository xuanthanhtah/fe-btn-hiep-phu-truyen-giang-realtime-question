import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParticipantStore } from '../stores/participant.store';
import { useConnectionStore } from '../stores/connection.store';
import { subscribeToRoomChannel, type RoomChannelSubscription } from '../realtime/room.channel';
import {
  createVoteCastEvent,
  createRoomSyncRequestEvent,
} from '../realtime/room.events';
import type { OptionId } from '../types/poll';
import {
  Check,
  Lock,
  Clock,
  RefreshCw,
  Radio,
} from 'lucide-react';

const OPTION_STYLES: Record<
  OptionId,
  {
    bgDefault: string;
    bgSelected: string;
    border: string;
    badgeBg: string;
  }
> = {
  A: {
    bgDefault: 'bg-slate-900/80 border-slate-800 hover:border-rose-500/50',
    bgSelected: 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/20 ring-1 ring-rose-500',
    border: 'border-rose-500',
    badgeBg: 'bg-rose-500 text-white',
  },
  B: {
    bgDefault: 'bg-slate-900/80 border-slate-800 hover:border-blue-500/50',
    bgSelected: 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-500 text-white',
  },
  C: {
    bgDefault: 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50',
    bgSelected: 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500 text-slate-950',
  },
  D: {
    bgDefault: 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50',
    bgSelected: 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-500 text-white',
  },
};

export const ParticipantPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Zustand selectors
  const participantId = useParticipantStore((s) => s.participantId);
  const currentQuestion = useParticipantStore((s) => s.currentQuestion);
  const currentQuestionIndex = useParticipantStore((s) => s.currentQuestionIndex);
  const totalQuestions = useParticipantStore((s) => s.totalQuestions);
  const pollStatus = useParticipantStore((s) => s.pollStatus);
  const selectedOption = useParticipantStore((s) => s.selectedOption);
  const acceptedOption = useParticipantStore((s) => s.acceptedOption);
  const isPendingAck = useParticipantStore((s) => s.isPendingAck);

  const initParticipant = useParticipantStore((s) => s.initParticipant);
  const selectOption = useParticipantStore((s) => s.selectOption);
  const setPendingAck = useParticipantStore((s) => s.setPendingAck);
  const confirmAcceptedVote = useParticipantStore((s) => s.confirmAcceptedVote);
  const applyRoomSnapshot = useParticipantStore((s) => s.applyRoomSnapshot);
  const applyPollOpened = useParticipantStore((s) => s.applyPollOpened);
  const applyPollClosed = useParticipantStore((s) => s.applyPollClosed);
  const applyQuestionChanged = useParticipantStore((s) => s.applyQuestionChanged);
  const resetVoteState = useParticipantStore((s) => s.resetVoteStateForNewQuestion);

  const connectionStatus = useConnectionStore((s) => s.status);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const setTransportType = useConnectionStore((s) => s.setTransportType);

  const channelSubRef = useRef<RoomChannelSubscription | null>(null);

  // Initialize participant and realtime channel
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    initParticipant(roomId);

    const sub = subscribeToRoomChannel(roomId, {
      onEvent: (event) => {
        if (event.roomId !== roomId) return;

        if (event.type === 'room:state') {
          applyRoomSnapshot({
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
          const currentPid = useParticipantStore.getState().participantId;
          if (event.payload.participantId === currentPid) {
            confirmAcceptedVote(
              event.payload.optionId,
              event.payload.questionId
            );
          }
        } else if (event.type === 'poll:opened') {
          applyPollOpened(
            event.payload.questionId,
            event.payload.revision
          );
        } else if (event.type === 'poll:closed') {
          applyPollClosed(
            event.payload.questionId,
            event.payload.revision
          );
        } else if (event.type === 'question:changed') {
          applyQuestionChanged(
            event.payload.currentQuestion,
            event.payload.questionIndex,
            event.payload.totalQuestions,
            event.payload.revision
          );
        } else if (event.type === 'room:reset') {
          resetVoteState();
        }
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          const syncEvt = createRoomSyncRequestEvent(roomId, useParticipantStore.getState().participantId);
          sub.broadcast(syncEvt);
        }
      },
    });

    channelSubRef.current = sub;
    setTransportType(sub.getTransportType());

    // Send immediate sync request
    const syncEvt = createRoomSyncRequestEvent(roomId, useParticipantStore.getState().participantId);
    sub.broadcast(syncEvt);

    // Keep requesting sync every 1.5 seconds if currentQuestion is still null
    const syncInterval = setInterval(() => {
      const state = useParticipantStore.getState();
      if (!state.currentQuestion && channelSubRef.current) {
        channelSubRef.current.broadcast(createRoomSyncRequestEvent(roomId, state.participantId));
      }
    }, 1500);

    return () => {
      clearInterval(syncInterval);
      sub.unsubscribe();
      channelSubRef.current = null;
    };
  }, [roomId, navigate, initParticipant, applyRoomSnapshot, confirmAcceptedVote, applyPollOpened, applyPollClosed, applyQuestionChanged, resetVoteState, setConnectionStatus, setTransportType]);

  // Handle participant casting a vote
  const handleVote = async (optionId: OptionId) => {
    if (!currentQuestion) return;
    if (pollStatus !== 'open') return;
    if (connectionStatus !== 'connected') return;

    selectOption(optionId);
    setPendingAck(optionId);

    if (channelSubRef.current) {
      const event = createVoteCastEvent(
        roomId || '',
        currentQuestion.id,
        participantId,
        optionId
      );
      await channelSubRef.current.broadcast(event);
    }
  };

  const isVotingOpen = pollStatus === 'open';

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Sleek Minimal Header */}
      <header className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono font-bold text-slate-400">Room</span>
          <span className="text-sm font-black text-white font-mono tracking-wider bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(!currentQuestion?.options || currentQuestion.options.length === 0) ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <span>Lắng nghe</span>
            </span>
          ) : pollStatus === 'open' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang mở</span>
            </span>
          ) : pollStatus === 'closed' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Lock className="w-3 h-3" />
              <span>Đã khóa</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3" />
              <span>Chờ mở</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Voting Pad */}
      <main
        className={`flex-1 w-full mx-auto px-4 py-6 flex flex-col justify-center transition-all duration-300 ${
          !currentQuestion || (currentQuestion.options && currentQuestion.options.length > 0)
            ? 'max-w-md'
            : 'max-w-4xl lg:max-w-5xl'
        }`}
      >
        {!currentQuestion ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
            <h2 className="text-xl font-bold text-white mb-1">Đã kết nối vào phòng</h2>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Đang chờ người điều phối chuyển sang câu hỏi tiếp theo...
            </p>
            <button
              onClick={() => {
                if (channelSubRef.current && roomId) {
                  const state = useParticipantStore.getState();
                  channelSubRef.current.broadcast(createRoomSyncRequestEvent(roomId, state.participantId));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang kết nối & đồng bộ câu hỏi...</span>
            </button>
          </div>
        ) : !currentQuestion.options || currentQuestion.options.length === 0 ? (
          /* Question with NO options: centered in the middle of the screen, box increased 2.5x width */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl flex flex-col items-center justify-center text-center">
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5">
                <span className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-wider">
                  Câu {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                {currentQuestion.category && (
                  <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentQuestion.category}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-relaxed text-center max-w-4xl">
                {currentQuestion.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Question Info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Câu {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                {currentQuestion.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentQuestion.category}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
                {currentQuestion.title}
              </h1>
            </div>

            {/* 4 Large Clean Touch Buttons */}
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option) => {
                const style = OPTION_STYLES[option.id];
                const isSelected = selectedOption === option.id;
                const isAccepted = acceptedOption === option.id;
                const isDisabled = !isVotingOpen || connectionStatus !== 'connected';

                return (
                  <button
                    key={option.id}
                    disabled={isDisabled}
                    onClick={() => handleVote(option.id)}
                    className={`w-full min-h-[58px] px-4 py-3 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.99] ${
                      isSelected ? style.bgSelected : style.bgDefault
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
                          isSelected ? style.badgeBg : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {option.id}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
                        {option.text}
                      </span>
                    </div>

                    {/* Status on button */}
                    <div className="shrink-0 ml-1">
                      {isAccepted && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Đã chọn</span>
                        </div>
                      )}
                      {!isAccepted && isSelected && isPendingAck && (
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Subtle Hint */}
            <div className="text-center text-[11px] text-slate-400 pt-1">
              {isVotingOpen
                ? acceptedOption
                  ? 'Chạm vào đáp án khác nếu bạn muốn đổi lựa chọn'
                  : 'Chạm vào đáp án A, B, C hoặc D để gửi bình chọn'
                : 'Phiên bình chọn cho câu hỏi này hiện đang tạm đóng'}
            </div>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-900">
        Bình chọn trực tiếp • Ẩn danh & Bảo mật
      </footer>
    </div>
  );
};
