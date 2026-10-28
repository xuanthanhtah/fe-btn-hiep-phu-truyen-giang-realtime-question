import React, { useState, useRef } from "react";
import type { OptionId, PollQuestion } from "../types/poll";
import { generateId } from "../realtime/room.events";
import { AUTO_LOOP_QUESTION_IDS } from "../data/questionPresets";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  FileText,
  AlertCircle,
  GripVertical,
  Repeat,
} from "lucide-react";
import { z } from "zod";
import { PollQuestionSchema } from "../realtime/room.protocol";
import type { PollOption } from "../types/poll";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionEditorProps {
  questions: PollQuestion[];
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  onAddQuestion: (question: PollQuestion) => void;
  onUpdateQuestion: (index: number, question: PollQuestion) => void;
  onDeleteQuestion: (index: number) => void;
  onReorderQuestion: (fromIndex: number, toIndex: number) => void;
  onImportQuestions: (questions: PollQuestion[]) => boolean;
  isAutoLoopOn: boolean;
  onToggleAutoLoop: () => void;
}

interface SortableOptionEditorCardProps {
  opt: PollOption;
  optIdx: number;
  total: number;
  onOptionChange: (id: OptionId, val: string) => void;
  onMoveOption: (from: number, to: number) => void;
}

const SortableOptionEditorCard: React.FC<SortableOptionEditorCardProps> = ({
  opt,
  optIdx,
  total,
  onOptionChange,
  onMoveOption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opt.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border transition-all ${
        isDragging
          ? "opacity-85 scale-[1.02] shadow-2xl ring-2 ring-indigo-500 bg-slate-900 border-indigo-500 z-50"
          : "border-slate-800"
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 rounded text-slate-500 hover:text-white cursor-grab active:cursor-grabbing hover:bg-slate-800 transition touch-none shrink-0"
        title="Kéo thả để đổi vị trí"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span
        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
          opt.id === "A"
            ? "bg-rose-500 text-white"
            : opt.id === "B"
              ? "bg-blue-500 text-white"
              : opt.id === "C"
                ? "bg-amber-500 text-slate-950"
                : "bg-emerald-500 text-white"
        }`}
      >
        {opt.id}
      </span>
      <input
        type="text"
        value={opt.text}
        onChange={(e) => onOptionChange(opt.id, e.target.value)}
        className="w-full bg-transparent border-0 text-white text-sm focus:outline-none placeholder:text-slate-600 min-w-0"
        placeholder={`Nội dung lựa chọn ${opt.id}...`}
      />
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          disabled={optIdx === 0}
          onClick={() => onMoveOption(optIdx, optIdx - 1)}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 transition cursor-pointer"
          title="Đổi vị trí lên trên"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          disabled={optIdx === total - 1}
          onClick={() => onMoveOption(optIdx, optIdx + 1)}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 transition cursor-pointer"
          title="Đổi vị trí xuống dưới"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestion,
  onImportQuestions,
  isAutoLoopOn,
  onToggleAutoLoop,
}) => {
  const [editingIndex, setEditingIndex] =
    useState<number>(currentQuestionIndex);
  const [importNotice, setImportNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const optionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  const activeQ = questions[editingIndex] ?? questions[0];

  const handleTitleChange = (val: string) => {
    if (!activeQ) return;
    onUpdateQuestion(editingIndex, { ...activeQ, title: val });
  };

  const handleOptionChange = (optionId: OptionId, val: string) => {
    if (!activeQ || !activeQ.options) return;
    const newOptions = activeQ.options.map((opt) =>
      opt.id === optionId ? { ...opt, text: val } : opt,
    );

    onUpdateQuestion(editingIndex, { ...activeQ, options: newOptions });
  };

  const handleAddOptions = () => {
    if (!activeQ) return;
    const defaultOptions = [
      { id: "A" as const, text: "Đáp án A" },
      { id: "B" as const, text: "Đáp án B" },
      { id: "C" as const, text: "Đáp án C" },
      { id: "D" as const, text: "Đáp án D" },
    ];
    onUpdateQuestion(editingIndex, { ...activeQ, options: defaultOptions });
  };

  const handleRemoveOptions = () => {
    if (!activeQ) return;
    onUpdateQuestion(editingIndex, { ...activeQ, options: [] });
  };

  const handleMoveOption = (fromIndex: number, toIndex: number) => {
    if (!activeQ || !activeQ.options) return;
    const options = activeQ.options;
    if (
      fromIndex < 0 ||
      fromIndex >= options.length ||
      toIndex < 0 ||
      toIndex >= options.length
    )
      return;
    const optionIds: OptionId[] = ["A", "B", "C", "D"];
    const cloned = [...options];
    const [moved] = cloned.splice(fromIndex, 1);
    cloned.splice(toIndex, 0, moved);
    const updatedOptions = cloned.map((opt, idx) => ({
      id: optionIds[idx] || opt.id,
      text: opt.text,
    }));
    onUpdateQuestion(editingIndex, { ...activeQ, options: updatedOptions });
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    if (!activeQ || !activeQ.options) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeQ.options.findIndex((opt) => opt.id === active.id);
      const newIndex = activeQ.options.findIndex((opt) => opt.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const optionIds: OptionId[] = ["A", "B", "C", "D"];
        const moved = arrayMove(activeQ.options, oldIndex, newIndex);
        const updatedOptions = moved.map((opt, idx) => ({
          id: optionIds[idx] || opt.id,
          text: opt.text,
        }));
        onUpdateQuestion(editingIndex, { ...activeQ, options: updatedOptions });
      }
    }
  };

  const handleCreateNew = () => {
    const newQ: PollQuestion = {
      id: generateId(),
      title: "Tiêu đề câu hỏi mới",
      options: [
        { id: "A", text: "Đáp án A" },
        { id: "B", text: "Đáp án B" },
        { id: "C", text: "Đáp án C" },
        { id: "D", text: "Đáp án D" },
      ],
    };
    onAddQuestion(newQ);
    setEditingIndex(questions.length);
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
            type: "error",
            message:
              "Invalid JSON format: must be an array of questions with 4 options (A, B, C, D).",
          });
          return;
        }

        const success = onImportQuestions(validated.data as PollQuestion[]);
        if (success) {
          setImportNotice({
            type: "success",
            message: `Successfully loaded ${validated.data.length} questions into memory!`,
          });
          setEditingIndex(0);
        }
      } catch {
        setImportNotice({
          type: "error",
          message: "Failed to read JSON file: syntax error.",
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Indices of auto-loop questions, grouped only when they sit next to each other
  const matchedLoopIndices = questions
    .map((q, idx) => (AUTO_LOOP_QUESTION_IDS.includes(q.id) ? idx : -1))
    .filter((idx) => idx !== -1);
  const isLoopGroupContiguous =
    matchedLoopIndices.length > 1 &&
    matchedLoopIndices[matchedLoopIndices.length - 1] -
      matchedLoopIndices[0] ===
      matchedLoopIndices.length - 1;
  const loopIndices = isLoopGroupContiguous ? matchedLoopIndices : [];

  const renderQuestionTab = (q: PollQuestion, idx: number) => {
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
            ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/60 shadow-md shadow-indigo-500/10"
            : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <span>Câu {idx + 1}</span>
        {isCurrentActive && (
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
            title="Đang trực tiếp"
          />
        )}
      </div>
    );
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
            {questions.length}{" "}
            {questions.length === 1 ? "question" : "questions"} configured
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            importNotice.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-950/40 text-rose-300 border border-rose-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.type === "success" ? (
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
      <div className="flex items-end gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {questions.map((q, idx) => {
          if (loopIndices.includes(idx) && idx !== loopIndices[0]) return null;

          if (idx === loopIndices[0]) {
            return (
              <div
                key="auto-loop-group"
                className={`flex flex-col gap-1.5 p-1.5 rounded-2xl border shrink-0 transition-all ${
                  isAutoLoopOn
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-indigo-500/40 bg-indigo-500/5"
                }`}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAutoLoopOn}
                  onClick={onToggleAutoLoop}
                  className="flex items-center justify-between gap-2 px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer"
                  title="Tự động chuyển lần lượt các câu trong nhóm mỗi 3 giây"
                >
                  <span className="flex items-center gap-1">
                    <Repeat
                      className={`w-3 h-3 ${isAutoLoopOn ? "text-emerald-400" : "text-indigo-400"}`}
                    />
                    <span>Tự chuyển 3s</span>
                  </span>
                  <span
                    className={`relative w-7 h-4 rounded-full transition ${
                      isAutoLoopOn ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                        isAutoLoopOn ? "translate-x-3" : ""
                      }`}
                    />
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {loopIndices.map((loopIdx) =>
                    renderQuestionTab(questions[loopIdx], loopIdx),
                  )}
                </div>
              </div>
            );
          }

          return renderQuestionTab(q, idx);
        })}
      </div>

      {/* Editing Area */}
      {activeQ && (
        <div className="flex flex-col gap-5 bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Chỉnh sửa Câu {editingIndex + 1} / {questions.length}
            </span>

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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nội dung câu hỏi
            </label>
            <textarea
              rows={3}
              value={activeQ.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
              placeholder="Nhập tiêu đề hoặc nội dung câu hỏi..."
            />
          </div>

          {activeQ.options && activeQ.options.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  4 Lựa chọn trắc nghiệm (Có thể đổi vị trí)
                </span>
                <button
                  type="button"
                  onClick={handleRemoveOptions}
                  className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Xóa các đáp án (Chuyển thành câu hỏi mở)
                </button>
              </div>

              <DndContext
                sensors={optionSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleOptionDragEnd}
              >
                <SortableContext
                  items={activeQ.options.map((o) => o.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeQ.options.map((opt, optIdx) => (
                      <SortableOptionEditorCard
                        key={opt.id}
                        opt={opt}
                        optIdx={optIdx}
                        total={activeQ.options?.length ?? 0}
                        onOptionChange={handleOptionChange}
                        onMoveOption={handleMoveOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/70 border border-dashed border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-sm font-bold text-white block">
                  Câu hỏi mở / thảo luận
                </span>
                <span className="text-xs text-slate-400">
                  Không có đáp án A, B, C, D — Câu hỏi sẽ tự động hiển thị chính
                  giữa màn hình chiếu và điện thoại.
                </span>
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
