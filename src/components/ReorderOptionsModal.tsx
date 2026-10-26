import React from 'react';
import type { OptionId, PollOption, PollQuestion } from '../types/poll';
import {
  X,
  ArrowUp,
  ArrowDown,
  Shuffle,
  RotateCcw,
  Check,
  MoveVertical,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ReorderOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: PollQuestion | null;
  onUpdateQuestion: (question: PollQuestion) => void;
}

const OPTION_THEME_BORDER: Record<OptionId, string> = {
  A: 'border-rose-500/40 bg-rose-950/20 text-rose-400',
  B: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
  C: 'border-amber-500/40 bg-amber-950/20 text-amber-400',
  D: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
};

const OPTION_BADGE_BG: Record<OptionId, string> = {
  A: 'bg-rose-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-amber-500 text-slate-950',
  D: 'bg-emerald-500 text-white',
};

interface SortableOptionRowProps {
  option: PollOption;
  index: number;
  total: number;
  onMove: (fromIndex: number, toIndex: number) => void;
}

const SortableOptionRow: React.FC<SortableOptionRowProps> = ({
  option,
  index,
  total,
  onMove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
        isDragging
          ? 'opacity-85 scale-[1.02] shadow-2xl ring-2 ring-indigo-500 bg-slate-900 border-indigo-500 z-50'
          : OPTION_THEME_BORDER[option.id] || 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded-lg text-slate-500 hover:text-white cursor-grab active:cursor-grabbing hover:bg-slate-800 transition touch-none shrink-0"
          title="Kéo thả để đổi vị trí"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
            OPTION_BADGE_BG[option.id] || 'bg-slate-700 text-white'
          }`}
        >
          {option.id}
        </span>
        <span className="text-sm font-medium text-slate-200 truncate select-none">
          {option.text}
        </span>
      </div>

      {/* Move Buttons for click/touch */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none text-slate-200 transition border border-slate-700 cursor-pointer"
          title="Di chuyển lên trên"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none text-slate-200 transition border border-slate-700 cursor-pointer"
          title="Di chuyển xuống dưới"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ReorderOptionsModal: React.FC<ReorderOptionsModalProps> = ({
  isOpen,
  onClose,
  question,
  onUpdateQuestion,
}) => {
  if (!isOpen || !question || !question.options || question.options.length === 0) {
    return null;
  }

  const options = question.options;
  const optionIds: OptionId[] = ['A', 'B', 'C', 'D'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((opt) => opt.id === active.id);
      const newIndex = options.findIndex((opt) => opt.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const moved = arrayMove(options, oldIndex, newIndex);
        const updatedOptions = moved.map((opt, idx) => ({
          id: optionIds[idx] || opt.id,
          text: opt.text,
        }));

        onUpdateQuestion({
          ...question,
          options: updatedOptions,
        });
      }
    }
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= options.length || toIndex < 0 || toIndex >= options.length) {
      return;
    }
    const cloned = [...options];
    const [moved] = cloned.splice(fromIndex, 1);
    cloned.splice(toIndex, 0, moved);

    // Re-map IDs so slots are always A, B, C, D in order
    const updatedOptions = cloned.map((opt, idx) => ({
      id: optionIds[idx] || opt.id,
      text: opt.text,
    }));

    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleReverse = () => {
    const reversed = [...options].reverse();
    const updatedOptions = reversed.map((opt, idx) => ({
      id: optionIds[idx] || opt.id,
      text: opt.text,
    }));
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleShuffle = () => {
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    const updatedOptions = shuffled.map((opt, idx) => ({
      id: optionIds[idx] || opt.id,
      text: opt.text,
    }));
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0b1021] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MoveVertical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Điều chỉnh vị trí đáp án
              </h2>
              <p className="text-xs text-slate-400">
                Kéo thả biểu tượng ⠿ hoặc bấm mũi tên để đổi vị trí đáp án A, B, C, D
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

        {/* Question Title Reference */}
        <div className="px-6 pt-4 pb-2 bg-slate-950/40 border-b border-slate-800/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
            Câu hỏi đang chọn
          </span>
          <p className="text-sm font-semibold text-white line-clamp-2">
            {question.title}
          </p>
        </div>

        {/* Options List with DND */}
        <div className="p-6 space-y-3 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={options.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {options.map((opt, idx) => (
                <SortableOptionRow
                  key={opt.id}
                  option={opt}
                  index={idx}
                  total={options.length}
                  onMove={handleMove}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Quick Helpers */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReverse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đảo ngược thứ tự</span>
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Xáo trộn ngẫu nhiên</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Tự động cập nhật tức thời lên màn hình sân khấu
          </span>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Xong</span>
          </button>
        </div>
      </div>
    </div>
  );
};
