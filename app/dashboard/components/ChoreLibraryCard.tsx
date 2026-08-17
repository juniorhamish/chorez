"use client";

import { memo } from "react";
import { Clock, Repeat, Trash2, DoorOpen, Lock, CalendarX2, CalendarCheck2 } from "lucide-react";
import { motion } from "framer-motion";
import { FREQUENCY_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";
import type { Chore } from "@/lib/dashboard/types";

interface ChoreLibraryCardProps {
  chore: Chore;
  onEditFrequency: (chore: Chore) => void;
  onEditRoom: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDueDate(dueDate: string | Date) {
  const date = new Date(dueDate);
  return `Due ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function getFrequencyLabel(chore: Chore) {
  const option = FREQUENCY_OPTIONS.find((opt) => opt.value === chore.frequency);
  const label = option?.label ?? chore.frequency;
  if ((chore.frequency === "every-x-days" || chore.frequency === "every-x-weeks") && chore.frequency_interval) {
    const unit = chore.frequency === "every-x-weeks" ? "Weeks" : "Days";
    return `Every ${chore.frequency_interval} ${unit}`;
  }
  return label;
}

function ChoreLibraryCard({
  chore,
  onEditFrequency,
  onEditRoom,
  onDelete,
}: Readonly<ChoreLibraryCardProps>) {
  const durationLabel = chore.estimated_duration_minutes != null
    ? `${chore.estimated_duration_minutes}m`
    : "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-4xl border border-indigo-50 bg-white shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">
              {chore.room_name ?? "No Room"}
            </span>
            {chore.is_private && (
              <span
                title="Just for me — nobody else in the household can see this task"
                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                <Lock size={10} />
                Just for me
              </span>
            )}
            <button
              onClick={() => onEditFrequency(chore)}
              aria-label="Edit frequency"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-indigo-500 active:scale-125"
              title="Edit frequency"
            >
              <Repeat size={16} />
            </button>
            <button
              onClick={() => onEditRoom(chore)}
              aria-label="Change room"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-indigo-500 active:scale-125"
              title="Change room"
            >
              <DoorOpen size={16} />
            </button>
            <button
              onClick={() => onDelete(chore)}
              aria-label="Delete chore template"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-rose-400 active:scale-125"
              title="Delete chore template"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <h3 className="font-bold text-lg leading-tight transition-colors group-hover:text-indigo-600 truncate">
            {chore.title}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4 text-indigo-400">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Repeat size={14} />
            {getFrequencyLabel(chore)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Clock size={14} />
            {durationLabel}
          </div>
        </div>

        {chore.next_due_date ? (
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
            <CalendarCheck2 size={14} />
            {formatDueDate(chore.next_due_date)}
          </div>
        ) : (
          <div
            title="This chore has no scheduled instance coming up"
            className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl"
          >
            <CalendarX2 size={14} />
            No upcoming instance
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ChoreLibraryCard);
