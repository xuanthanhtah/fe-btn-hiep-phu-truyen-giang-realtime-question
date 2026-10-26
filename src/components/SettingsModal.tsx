import React from 'react';
import { useSettingsStore, type AnswerLayoutMode } from '../stores/settings.store';
import {
  X,
  Sliders,
  Type,
  LayoutGrid,
  RotateCcw,
  Check,
  Eye,
  Columns2,
  Rows3,
  Columns4,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMode?: 'host' | 'stage';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  targetMode = 'host',
}) => {
  const {
    questionFontSize,
    answerFontSize,
    hostQuestionFontSize,
    hostAnswerFontSize,
    answerLayout,
    setQuestionFontSize,
    setAnswerFontSize,
    setHostQuestionFontSize,
    setHostAnswerFontSize,
    setAnswerLayout,
    resetDefaults,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#0b1021] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cài đặt Font chữ & Bố cục hiển thị
              </h2>
              <p className="text-xs text-slate-400">
                Tự động lưu vào Cookie & Bộ nhớ trình duyệt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Section: Sân khấu Presenter Stage */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-indigo-400">
              <Type className="w-4 h-4" />
              <span>Cỡ chữ Sân khấu chiếu (Presenter Stage)</span>
            </div>

            {/* Question Font Size Slider */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-200">
                  Cỡ chữ tiêu đề Câu hỏi (Sân khấu)
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {questionFontSize}px
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                step={2}
                value={questionFontSize}
                onChange={(e) => setQuestionFontSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex items-center justify-between gap-1.5 mt-3">
                {[
                  { label: 'Nhỏ', size: 28 },
                  { label: 'Vừa', size: 36 },
                  { label: 'Lớn', size: 44 },
                  { label: 'Rất lớn', size: 54 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setQuestionFontSize(item.size)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      questionFontSize === item.size
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                    }`}
                  >
                    {item.label} ({item.size}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Font Size Slider */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-200">
                  Cỡ chữ nội dung Đáp án ABCD (Sân khấu)
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {answerFontSize}px
                </span>
              </div>
              <input
                type="range"
                min={16}
                max={44}
                step={2}
                value={answerFontSize}
                onChange={(e) => setAnswerFontSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex items-center justify-between gap-1.5 mt-3">
                {[
                  { label: 'Nhỏ', size: 18 },
                  { label: 'Vừa', size: 24 },
                  { label: 'Lớn', size: 30 },
                  { label: 'Rất lớn', size: 38 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setAnswerFontSize(item.size)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      answerFontSize === item.size
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                    }`}
                  >
                    {item.label} ({item.size}px)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Bố cục vị trí đáp án */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-indigo-400">
              <LayoutGrid className="w-4 h-4" />
              <span>Bố cục vị trí đáp án (Layout)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'grid-2' as AnswerLayoutMode,
                  title: 'Lưới 2 Cột (2x2)',
                  desc: 'A B / C D cân xứng',
                  icon: <Columns2 className="w-4 h-4" />,
                },
                {
                  id: 'stack-1' as AnswerLayoutMode,
                  title: '1 Cột dọc (Stack)',
                  desc: 'A, B, C, D từ trên xuống',
                  icon: <Rows3 className="w-4 h-4" />,
                },
                {
                  id: 'grid-4' as AnswerLayoutMode,
                  title: '4 Cột ngang',
                  desc: 'A B C D cùng một hàng',
                  icon: <Columns4 className="w-4 h-4" />,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setAnswerLayout(item.id)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    answerLayout === item.id
                      ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 text-indigo-300">
                      {item.icon}
                    </span>
                    {answerLayout === item.id && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Cỡ chữ Host Controller (Tùy chỉnh riêng cho màn hình điều khiển) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-indigo-400">
                <Sliders className="w-4 h-4" />
                <span>Cỡ chữ màn hình Host Controller</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Câu hỏi trên Host</label>
                  <span className="text-[11px] font-mono font-bold text-indigo-300">
                    {hostQuestionFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={32}
                  step={1}
                  value={hostQuestionFontSize}
                  onChange={(e) => setHostQuestionFontSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Đáp án trên Host</label>
                  <span className="text-[11px] font-mono font-bold text-indigo-300">
                    {hostAnswerFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={22}
                  step={1}
                  value={hostAnswerFontSize}
                  onChange={(e) => setHostAnswerFontSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Xem trước trực tiếp (Live Preview)</span>
            </div>
            <div className="border border-slate-800/80 rounded-xl p-4 bg-[#050811]">
              <h3
                style={{
                  fontSize: `${targetMode === 'host' ? hostQuestionFontSize : questionFontSize}px`,
                  lineHeight: 1.3,
                }}
                className="font-black text-white mb-3"
              >
                Mục đích tối hậu của con người được tạo dựng là gì?
              </h3>
              <div
                className={`grid gap-2 ${
                  answerLayout === 'grid-4'
                    ? 'grid-cols-2 md:grid-cols-4'
                    : answerLayout === 'grid-2'
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {[
                  { id: 'A', text: 'Để tôn vinh Đức Chúa Trời' },
                  { id: 'B', text: 'Để thụ hưởng đời sống trần gian' },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {opt.id}
                    </span>
                    <span
                      style={{
                        fontSize: `${targetMode === 'host' ? hostAnswerFontSize : answerFontSize}px`,
                      }}
                      className="text-slate-200 font-semibold truncate"
                    >
                      {opt.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <Check className="w-4 h-4" />
            <span>Đã lưu vào Cookie & Bộ nhớ trình duyệt</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
