import React from 'react';
import type { OptionId, PollQuestion, PollStatus, VoteCounts } from '../types/poll';
import { calculateVotePercentages } from '../realtime/room.reducer';
import { Users, Lock, Unlock, Clock } from 'lucide-react';

interface PollResultsViewProps {
  question: PollQuestion | null;
  pollStatus: PollStatus;
  voteCounts: VoteCounts;
  totalAcceptedVotes: number;
  mode?: 'stage' | 'host';
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
}) => {
  if (!question || !question.options || question.options.length === 0) {
    return null;
  }

  const percentages = calculateVotePercentages(voteCounts);
  const totalVotes = totalAcceptedVotes;
  const isStage = mode === 'stage';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info: Poll Status and Total Accepted Votes */}
      <div className="flex items-center justify-between px-1">
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
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full text-slate-300 text-xs font-medium">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            <strong className="text-white font-mono text-sm">{totalVotes}</strong> lượt bình chọn
          </span>
        </div>
      </div>

      {/* 4 Options Horizontal Result Bars */}
      <div className={`grid gap-4 ${isStage ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {question.options.map((option) => {
          const theme = OPTION_THEMES[option.id];
          const count = voteCounts[option.id] || 0;
          const percentage = percentages[option.id] || 0;

          return (
            <div
              key={option.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg ${theme.cardBg} ${theme.border} ${theme.glow} ${
                isStage ? 'p-5 sm:p-6 min-h-[110px]' : 'p-4'
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
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center font-black rounded-xl shadow-md shrink-0 ${
                        isStage ? 'w-10 h-10 sm:w-11 sm:h-11 text-xl' : 'w-8 h-8 text-base'
                      } ${theme.badgeBg}`}
                    >
                      {option.id}
                    </span>
                    <span
                      className={`font-semibold text-white tracking-wide leading-snug break-words ${
                        isStage ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
                      }`}
                    >
                      {option.text}
                    </span>
                  </div>

                  {/* Percentage and Vote Count */}
                  <div className="text-right flex flex-col items-end shrink-0 pl-2">
                    <span
                      className={`font-black font-mono tracking-tight ${theme.textAccent} ${
                        isStage ? 'text-2xl sm:text-3xl' : 'text-lg'
                      }`}
                    >
                      {percentage}%
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {count} phiếu
                    </span>
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
