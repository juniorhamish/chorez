"use client";

import { X, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { FREQUENCY_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";
import type { Room } from "@/lib/dashboard/types";

interface AddTaskModalProps {
  selectableRooms: Room[];
  newTaskTitle: string;
  setNewTaskTitle: (value: string) => void;
  newTaskRoomId: string;
  setNewTaskRoomId: (value: string) => void;
  newTaskDuration: string;
  setNewTaskDuration: (value: string) => void;
  newTaskFrequency: ChoreFrequency;
  setNewTaskFrequency: (value: ChoreFrequency) => void;
  newTaskFrequencyInterval: string;
  setNewTaskFrequencyInterval: (value: string) => void;
  newTaskLastCompleted: string;
  setNewTaskLastCompleted: (value: string) => void;
  newTaskIsPrivate: boolean;
  setNewTaskIsPrivate: (value: boolean) => void;
  isCustomIntervalFrequency: boolean;
  isAddTaskValid: boolean;
  isAddingTask: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onOpenAddRoom: () => void;
}

export default function AddTaskModal({
  selectableRooms,
  newTaskTitle,
  setNewTaskTitle,
  newTaskRoomId,
  setNewTaskRoomId,
  newTaskDuration,
  setNewTaskDuration,
  newTaskFrequency,
  setNewTaskFrequency,
  newTaskFrequencyInterval,
  setNewTaskFrequencyInterval,
  newTaskLastCompleted,
  setNewTaskLastCompleted,
  newTaskIsPrivate,
  setNewTaskIsPrivate,
  isCustomIntervalFrequency,
  isAddTaskValid,
  isAddingTask,
  onClose,
  onSubmit,
  onOpenAddRoom,
}: Readonly<AddTaskModalProps>) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isAddingTask && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
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
            <h2 className="text-2xl font-black mb-1">Add Task</h2>
            <p className="text-indigo-400 font-bold">Create a new chore</p>
          </div>
          <button
            onClick={onClose}
            disabled={isAddingTask}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Task Name
            </label>
            <input
              type="text"
              placeholder="e.g. Clean the fridge"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
            />
          </div>

          {/* Room */}
          <div>
            <div className="flex items-center justify-between mb-2 ml-1 mr-1">
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-400">
                Room
              </label>
              <button
                type="button"
                onClick={onOpenAddRoom}
                className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                <Plus size={12} />
                New Room
              </button>
            </div>
            {selectableRooms.length > 0 ? (
              <select
                value={newTaskRoomId}
                onChange={(e) => setNewTaskRoomId(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all appearance-none"
              >
                {selectableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={onOpenAddRoom}
                className="w-full bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl px-5 py-4 font-bold text-indigo-400 hover:text-indigo-600 text-left transition-colors"
              >
                No rooms yet — tap to add one.
              </button>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Time to Complete
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">min</div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Frequency
            </label>
            <select
              value={newTaskFrequency}
              onChange={(e) => setNewTaskFrequency(e.target.value as ChoreFrequency)}
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
          {isCustomIntervalFrequency && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                Repeat Every
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 3"
                  value={newTaskFrequencyInterval}
                  onChange={(e) => setNewTaskFrequencyInterval(e.target.value)}
                  className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">
                  {newTaskFrequency === 'every-x-weeks' ? 'weeks' : 'days'}
                </div>
              </div>
            </div>
          )}

          {/* Last Completed */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Date Last Completed
            </label>
            <input
              type="date"
              value={newTaskLastCompleted}
              onChange={(e) => setNewTaskLastCompleted(e.target.value)}
              className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
            />
          </div>

          {/* Just for me */}
          <div className="bg-indigo-50/50 rounded-2xl px-5 py-4 flex items-start gap-4">
            <input
              id="newTaskIsPrivate"
              type="checkbox"
              checked={newTaskIsPrivate}
              onChange={(e) => setNewTaskIsPrivate(e.target.checked)}
              disabled={isAddingTask}
              className="mt-1 h-5 w-5 shrink-0 rounded-md border-2 border-indigo-200 text-indigo-600 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="newTaskIsPrivate" className="cursor-pointer">
              <div className="text-xs font-black uppercase tracking-widest text-indigo-400">
                Just for me
              </div>
              <p className="text-sm font-bold text-indigo-400/80 mt-1">
                Only you can be assigned this task — nobody else in the household will see it.
              </p>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={isAddingTask || !isAddTaskValid}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isAddingTask ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Adding...
              </>
            ) : (
              "Add Task"
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
