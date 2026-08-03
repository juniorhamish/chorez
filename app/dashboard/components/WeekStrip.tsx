"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import { isSameDay } from "@/lib/dashboard/date-utils";

interface WeekDay {
  label: string;
  date: string;
  fullDate: Date;
  isToday: boolean;
}

interface WeekStripProps {
  weekDays: WeekDay[];
  selectedDay: Date;
  setSelectedDay: (date: Date) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToCurrentWeek: () => void;
  isCurrentWeek: boolean;
  weekRangeLabel: string;
}

export default function WeekStrip({
  weekDays,
  selectedDay,
  setSelectedDay,
  goToPreviousDay,
  goToNextDay,
  goToCurrentWeek,
  isCurrentWeek,
  weekRangeLabel,
}: Readonly<WeekStripProps>) {
  return (
    <section className="mt-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 mb-3">
        <button
          onClick={goToPreviousDay}
          aria-label="Previous Day"
          title="Previous Day"
          className="p-2 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={goToCurrentWeek}
          disabled={isCurrentWeek}
          className={cn(
            "text-sm font-black tracking-tight transition-colors rounded-xl px-3 py-1",
            isCurrentWeek
              ? "text-indigo-900 cursor-default"
              : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
          )}
        >
          {weekRangeLabel}
        </button>
        <button
          onClick={goToNextDay}
          aria-label="Next Day"
          title="Next Day"
          className="p-2 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-90"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide snap-x">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day.fullDate, selectedDay);
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.fullDate)}
              className={cn(
                "flex flex-col items-center min-w-17.5 py-4 rounded-3xl transition-all snap-center",
                isSelected
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105" 
                  : "bg-white text-indigo-400 border border-indigo-50"
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wider mb-1">{day.label}</span>
              <span className="text-lg font-bold">{day.date.split(" ")[1]}</span>
              {day.isToday && !isSelected && (
                <div className="w-1 h-1 bg-indigo-600 rounded-full mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
