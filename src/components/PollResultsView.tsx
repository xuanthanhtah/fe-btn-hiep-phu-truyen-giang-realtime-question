import React from 'react';
import type { OptionId, PollQuestion, PollStatus, VoteCounts } from '../types/poll';
import { calculateVotePercentages } from '../realtime/room.reducer';
import { useSettingsStore } from '../stores/settings.store';
import { Users, Lock, Unlock, Clock, ArrowUp, ArrowDown, MoveVertical } from 'lucide-react';

interface PollResultsViewProps {
  question: PollQuestion | null;
  pollStatus: PollStatus;
  voteCounts: VoteCounts;
  totalAcceptedVotes: number;
  mode?: 'stage' | 'host';
  onMoveOption?: (fromIndex: number, toIndex: number) => void;
  onOpenReorderModal?: () => void;
}

const OPTION_THEMES: Record<
  OptionId,
  {
    badgeBg: string;
    cardBg: string;
    border: string;
    barFill: string;
    textAccent: string;
    glow: string;
  }
> = {
  A: {
    badgeBg: 'bg-rose-500 text-white',
    cardBg: 'bg-rose-950/20',
    border: 'border-rose-500/30',
    barFill: 'bg-gradient-to-r from-rose-600 to-rose-500',
    textAccent: 'text-rose-400',
    glow: 'shadow-rose-500/10',
  },
  B: {
    badgeBg: 'bg-blue-500 text-white',
    cardBg: 'bg-blue-950/20',
    border: 'border-blue-500/30',
    barFill: 'bg-gradient-to-r from-blue-600 to-blue-500',
    textAccent: 'text-blue-400',
    glow: 'shadow-blue-500/10',
  },
  C: {
    badgeBg: 'bg-amber-500 text-slate-950',
    cardBg: 'bg-amber-950/20',
    border: 'border-amber-500/30',
    barFill: 'bg-gradient-to-r from-amber-600 to-amber-500',
    textAccent: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  D: {
    badgeBg: 'bg-emerald-500 text-white',
    cardBg: 'bg-emerald-950/20',
    border: 'border-emerald-500/30',
    barFill: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    textAccent: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
};

export const PollResultsView: React.FC<PollResultsViewProps> = ({
  question,
  pollStatus,
  voteCounts,
  totalAcceptedVotes,
  mode = 'stage',
  onMoveOption,
  onOpenReorderModal,
}) => {
  const { answerFontSize, hostAnswerFontSize, answerLayout } = useSettingsStore();

  if (!question || !question.options || question.options.length === 0) {
    return null;
  }

  const percentages = calculateVotePercentages(voteCounts);
  const totalVotes = totalAcceptedVotes;
  const isStage = mode === 'stage';
  const effectiveAnswerFontSize = isStage ? answerFontSize : hostAnswerFontSize;

  // Determine grid layout based on settings
  let layoutClass = 'grid-cols-1';
  if (answerLayout === 'grid-2') {
    layoutClass = 'grid-cols-1 md:grid-cols-2';
  } else if (answerLayout === 'grid-4') {
    layoutClass = isStage
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
  } else {
    layoutClass = 'grid-cols-1';
  }

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header Info: Poll Status, Reorder shortcut, and Total Accepted Votes */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {pollStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <Unlock className="w-3.5 h-3.5" /> Đang mở bình chọn
            </span>
          )}
          {pollStatus === 'closed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Lock className="w-3.5 h-3.5" /> Đã khóa bình chọn
            </span>
          )}
          {pollStatus === 'waiting' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" /> Chưa mở bình chọn
            </span>
          )}

          {!isStage && onOpenReorderModal && (
            <button
              onClick={onOpenReorderModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Mở bảng điều chỉnh vị trí đáp án"
            >
              <MoveVertical className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đổi vị trí đáp án</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full text-slate-300 text-xs font-medium">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            <strong className="text-white font-mono text-sm">{totalVotes}</strong> lượt bình chọn
          </span>
        </div>
      </div>

      {/* Options Result Cards */}
      <div className={`grid gap-4 ${layoutClass}`}>
        {question.options.map((option, optIdx) => {
          const theme = OPTION_THEMES[option.id];
          const count = voteCounts[option.id] || 0;
          const percentage = percentages[option.id] || 0;

          return (
            <div
              key={option.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg ${theme.cardBg} ${theme.border} ${theme.glow} ${
                isStage ? 'p-5 sm:p-7 min-h-[120px]' : 'p-4'
              }`}
            >
              {/* Animated Progress Bar fill */}
              <div
                className={`absolute top-0 bottom-0 left-0 opacity-25 transition-all duration-700 ease-out ${theme.barFill}`}
                style={{ width: `${percentage}%` }}
              />

              {/* Foreground Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center font-black shadow-md shrink-0 ${
                        isStage
                          ? 'w-11 h-11 sm:w-13 sm:h-13 text-xl sm:text-2xl rounded-2xl'
                          : 'w-8 h-8 text-base rounded-xl'
                      } ${theme.badgeBg}`}
                    >
                      {option.id}
                    </span>
                    <span
                      style={{
                        fontSize: `${effectiveAnswerFontSize}px`,
                        lineHeight: 1.35,
                      }}
                      className={`text-white tracking-wide break-words ${
                        isStage ? 'font-bold' : 'font-semibold'
                      }`}
                    >
                      {option.text}
                    </span>
                  </div>

                  {/* Percentage, Vote Count, and Host Quick Reorder Controls */}
                  <div className="text-right flex flex-col items-end shrink-0 pl-2">
                    <span
                      className={`font-black font-mono tracking-tight ${theme.textAccent} ${
                        isStage ? 'text-3xl sm:text-4xl' : 'text-lg'
                      }`}
                    >
                      {percentage}%
                    </span>
                    <span className={`font-mono text-slate-400 ${isStage ? 'text-xs sm:text-sm font-semibold' : 'text-xs'}`}>
                      {count} phiếu
                    </span>

                    {/* Inline Host Move Controls */}
                    {!isStage && onMoveOption && (
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          disabled={optIdx === 0}
                          onClick={() => onMoveOption(optIdx, optIdx - 1)}
                          className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 transition border border-slate-700 cursor-pointer"
                          title="Đổi chỗ lên trên"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={optIdx === question.options.length - 1}
                          onClick={() => onMoveOption(optIdx, optIdx + 1)}
                          className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 transition border border-slate-700 cursor-pointer"
                          title="Đổi chỗ xuống dưới"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-bar indicator on stage */}
                {isStage && (
                  <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-700 ease-out rounded-full ${theme.barFill}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
