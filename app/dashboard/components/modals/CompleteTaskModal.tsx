"use client";

import { X, Star, MessageSquare, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import { MAX_STOPWATCH_MINUTES } from "@/lib/dashboard/hooks/useStopwatch";
import type { Task } from "@/lib/dashboard/types";

interface CompleteTaskModalProps {
  task: Task;
  actualMinutes: string;
  setActualMinutes: (value: string) => void;
  wasStopwatchCapped: boolean;
  rating: number;
  setRating: (value: number) => void;
  completionNotes: string;
  setCompletionNotes: (value: string) => void;
  isCompletingTask: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function CompleteTaskModal({
  task,
  actualMinutes,
  setActualMinutes,
  wasStopwatchCapped,
  rating,
  setRating,
  completionNotes,
  setCompletionNotes,
  isCompletingTask,
  onClose,
  onSubmit,
}: Readonly<CompleteTaskModalProps>) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isCompletingTask && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />
      
      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black mb-1">Finish Task</h2>
            <p className="text-indigo-400 font-bold">{task.title}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isCompletingTask}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Duration Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Actual Minutes Taken
            </label>
            <div className="relative">
              <input 
                type="number" 
                placeholder="e.g. 20"
                value={actualMinutes}
                onChange={(e) => setActualMinutes(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">min</div>
            </div>
            {wasStopwatchCapped && (
              <p className="text-xs font-bold text-amber-500 mt-2 ml-1">
                The timer ran past {MAX_STOPWATCH_MINUTES} min, so we capped the pre-filled time — feel free to adjust it.
              </p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">
              Effort / Satisfaction
            </label>
            <div className="flex justify-between px-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="p-2 hover:scale-125 transition-transform active:scale-90"
                >
                  <Star 
                    size={32} 
                    className={cn(
                      "transition-colors",
                      rating >= star ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-amber-200"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Notes
            </label>
            <div className="relative">
              <textarea 
                placeholder="Any issues or things to note?"
                rows={3}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold transition-all resize-none"
              />
              <MessageSquare size={20} className="absolute right-5 top-5 text-indigo-200" />
            </div>
          </div>

          {/* Submit */}
          <button 
            onClick={onSubmit}
            disabled={isCompletingTask}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isCompletingTask ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Completion"
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
