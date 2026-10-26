import React, { useState, useRef } from 'react';
import type { OptionId, PollQuestion } from '../types/poll';
import { generateId } from '../realtime/room.events';
import { TRUYEN_GIANG_PRESET } from '../data/questionPresets';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  CheckCircle,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { z } from 'zod';
import { PollQuestionSchema } from '../realtime/room.protocol';

interface QuestionEditorProps {
  questions: PollQuestion[];
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  onAddQuestion: (question: PollQuestion) => void;
  onUpdateQuestion: (index: number, question: PollQuestion) => void;
  onDeleteQuestion: (index: number) => void;
  onReorderQuestion: (fromIndex: number, toIndex: number) => void;
  onImportQuestions: (questions: PollQuestion[]) => boolean;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestion,
  onImportQuestions,
}) => {
  const [editingIndex, setEditingIndex] = useState<number>(currentQuestionIndex);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeQ = questions[editingIndex] ?? questions[0];

  const handleTitleChange = (val: string) => {
    if (!activeQ) return;
    onUpdateQuestion(editingIndex, { ...activeQ, title: val });
  };

  const handleCategoryChange = (val: string) => {
    if (!activeQ) return;
    onUpdateQuestion(editingIndex, { ...activeQ, category: val });
  };

  const handleOptionChange = (optionId: OptionId, val: string) => {
    if (!activeQ || !activeQ.options) return;
    const newOptions = activeQ.options.map((opt) =>
      opt.id === optionId ? { ...opt, text: val } : opt
    );

    onUpdateQuestion(editingIndex, { ...activeQ, options: newOptions });
  };

  const handleAddOptions = () => {
    if (!activeQ) return;
    const defaultOptions = [
      { id: 'A' as const, text: 'Đáp án A' },
      { id: 'B' as const, text: 'Đáp án B' },
      { id: 'C' as const, text: 'Đáp án C' },
      { id: 'D' as const, text: 'Đáp án D' },
    ];
    onUpdateQuestion(editingIndex, { ...activeQ, options: defaultOptions });
  };

  const handleRemoveOptions = () => {
    if (!activeQ) return;
    onUpdateQuestion(editingIndex, { ...activeQ, options: [] });
  };

  const handleCreateNew = () => {
    const newQ: PollQuestion = {
      id: generateId(),
      title: 'Tiêu đề câu hỏi mới',
      options: [
        { id: 'A', text: 'Đáp án A' },
        { id: 'B', text: 'Đáp án B' },
        { id: 'C', text: 'Đáp án C' },
        { id: 'D', text: 'Đáp án D' },
      ],
    };
    onAddQuestion(newQ);
    setEditingIndex(questions.length);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hiep_phu_poll_questions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const schema = z.array(PollQuestionSchema).min(1);
        const validated = schema.safeParse(parsed);

        if (!validated.success) {
          setImportNotice({
            type: 'error',
            message: 'Invalid JSON format: must be an array of questions with 4 options (A, B, C, D).',
          });
          return;
        }

        const success = onImportQuestions(validated.data as PollQuestion[]);
        if (success) {
          setImportNotice({
            type: 'success',
            message: `Successfully loaded ${validated.data.length} questions into memory!`,
          });
          setEditingIndex(0);
        }
      } catch {
        setImportNotice({
          type: 'error',
          message: 'Failed to read JSON file: syntax error.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Questions Manager
          </h2>
          <p className="text-xs text-slate-400">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'} configured
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onImportQuestions(TRUYEN_GIANG_PRESET);
              setImportNotice({
                type: 'success',
                message: 'Đã nạp thành công 10 câu hỏi sự kiện Truyền Giảng 31/10/2026!',
              });
              setEditingIndex(0);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/30 transition cursor-pointer"
            title="Nạp lại bộ câu hỏi chuẩn sự kiện Truyền Giảng 31/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp 10 câu Truyền Giảng</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Export question deck to local JSON file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Import question deck from local JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            importNotice.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{importNotice.message}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {questions.map((q, idx) => {
          const isCurrentActive = idx === currentQuestionIndex;
          const isSelectedForEdit = idx === editingIndex;

          return (
            <div
              key={q.id}
              onClick={() => {
                setEditingIndex(idx);
                onSelectQuestion(idx);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all border ${
                isSelectedForEdit
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>Câu {idx + 1}</span>
              {isCurrentActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Đang trực tiếp" />
              )}
            </div>
          );
        })}
      </div>

      {/* Editing Area */}
      {activeQ && (
        <div className="flex flex-col gap-5 bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Chỉnh sửa Câu {editingIndex + 1} / {questions.length}
              </span>
              {activeQ.category && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeQ.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={editingIndex === 0}
                onClick={() => {
                  onReorderQuestion(editingIndex, editingIndex - 1);
                  setEditingIndex(editingIndex - 1);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-300 transition cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={editingIndex === questions.length - 1}
                onClick={() => {
                  onReorderQuestion(editingIndex, editingIndex + 1);
                  setEditingIndex(editingIndex + 1);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-300 transition cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={questions.length <= 1}
                onClick={() => {
                  onDeleteQuestion(editingIndex);
                  setEditingIndex(Math.max(0, editingIndex - 1));
                }}
                className="p-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-rose-500/20 transition cursor-pointer"
                title="Delete question"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nội dung câu hỏi</label>
              <textarea
                rows={3}
                value={activeQ.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                placeholder="Nhập tiêu đề hoặc nội dung câu hỏi..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chủ đề / Phân loại (Tùy chọn)</label>
              <input
                type="text"
                value={activeQ.category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="vd: Câu hỏi phản biện"
              />
            </div>
          </div>

          {activeQ.options && activeQ.options.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">4 Lựa chọn trắc nghiệm</span>
                <button
                  type="button"
                  onClick={handleRemoveOptions}
                  className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Xóa các đáp án (Chuyển thành câu hỏi mở)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeQ.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        opt.id === 'A'
                          ? 'bg-rose-500 text-white'
                          : opt.id === 'B'
                          ? 'bg-blue-500 text-white'
                          : opt.id === 'C'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                      className="w-full bg-transparent border-0 text-white text-sm focus:outline-none placeholder:text-slate-600"
                      placeholder={`Nội dung lựa chọn ${opt.id}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/70 border border-dashed border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-sm font-bold text-white block">Câu hỏi mở / thảo luận</span>
                <span className="text-xs text-slate-400">Không có đáp án A, B, C, D — Câu hỏi sẽ tự động hiển thị chính giữa màn hình chiếu và điện thoại.</span>
              </div>
              <button
                type="button"
                onClick={handleAddOptions}
                className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition"
              >
                + Thêm 4 lựa chọn ABCD
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
