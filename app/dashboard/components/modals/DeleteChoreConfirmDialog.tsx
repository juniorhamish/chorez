"use client";

import { X, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Task } from "@/lib/dashboard/types";

interface DeleteChoreConfirmDialogProps {
  chore: Task;
  isDeletingChore: boolean;
  isDeletingInstance: boolean;
  onClose: () => void;
  onDeleteTaskInstance: () => Promise<void>;
  onDeleteChore: () => Promise<void>;
}

export default function DeleteChoreConfirmDialog({
  chore,
  isDeletingChore,
  isDeletingInstance,
  onClose,
  onDeleteTaskInstance,
  onDeleteChore,
}: Readonly<DeleteChoreConfirmDialogProps>) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isDeletingChore && !isDeletingInstance && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />
      
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
            <h2 className="text-2xl font-black mb-1 text-rose-600">Delete Task?</h2>
            <p className="text-indigo-400 font-bold">{chore.title}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeletingChore || isDeletingInstance}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
            <p className="text-amber-800 font-bold mb-1">Just this occurrence</p>
            <p className="text-amber-700 font-medium leading-relaxed mb-4">
              This occurrence will be removed. {chore.title} will continue as scheduled.
            </p>
            <button 
              onClick={onDeleteTaskInstance}
              disabled={isDeletingChore || isDeletingInstance}
              className="w-full bg-white border-2 border-amber-300 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed text-amber-700 py-4 rounded-4xl font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isDeletingInstance ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete Just This Occurrence
                </>
              )}
            </button>
          </div>

          <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
            <p className="text-rose-700 font-bold mb-1">This and every occurrence</p>
            <p className="text-rose-700 font-medium leading-relaxed mb-4">
              This will <span className="font-black underline">permanently remove</span> all scheduled and past occurrences of this recurring task. This action cannot be undone.
            </p>
            <button 
              onClick={onDeleteChore}
              disabled={isDeletingChore || isDeletingInstance}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isDeletingChore ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={20} />
                  Delete This and Every Occurrence
                </>
              )}
            </button>
          </div>

          <button 
            onClick={onClose}
            disabled={isDeletingChore || isDeletingInstance}
            className="w-full bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-600 py-4 rounded-4xl font-bold transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </>
  );
}
