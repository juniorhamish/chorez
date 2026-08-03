"use client";

import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { FREQUENCY_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";
import type { Task } from "@/lib/dashboard/types";

interface EditFrequencyModalProps {
  task: Task;
  editFrequencyValue: ChoreFrequency;
  setEditFrequencyValue: (value: ChoreFrequency) => void;
  editFrequencyInterval: string;
  setEditFrequencyInterval: (value: string) => void;
  isEditCustomIntervalFrequency: boolean;
  isEditFrequencyValid: boolean;
  isUpdatingFrequency: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function EditFrequencyModal({
  task,
  editFrequencyValue,
  setEditFrequencyValue,
  editFrequencyInterval,
  setEditFrequencyInterval,
  isEditCustomIntervalFrequency,
  isEditFrequencyValid,
  isUpdatingFrequency,
  onClose,
  onSubmit,
}: Readonly<EditFrequencyModalProps>) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isUpdatingFrequency && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black mb-1">Edit Frequency</h2>
            <p className="text-indigo-400 font-bold">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdatingFrequency}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Frequency */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Frequency
            </label>
            <select
              value={editFrequencyValue}
              onChange={(e) => setEditFrequencyValue(e.target.value as ChoreFrequency)}
              className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all appearance-none"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Interval */}
          {isEditCustomIntervalFrequency && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                Repeat Every
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 3"
                  value={editFrequencyInterval}
                  onChange={(e) => setEditFrequencyInterval(e.target.value)}
                  className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">
                  {editFrequencyValue === 'every-x-weeks' ? 'weeks' : 'days'}
                </div>
              </div>
            </div>
          )}

          <p className="text-indigo-400 font-medium text-sm leading-relaxed px-1">
            Saving will recalculate this task&apos;s next due date based on its last completion and the new frequency.
          </p>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={isUpdatingFrequency || !isEditFrequencyValid}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isUpdatingFrequency ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Update Frequency"
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
