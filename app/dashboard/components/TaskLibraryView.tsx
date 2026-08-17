"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, BookOpen, SearchX } from "lucide-react";
import { cn, getRoomIcon } from "@/app/dashboard/components/dashboard-ui-utils";
import ChoreLibraryCard from "@/app/dashboard/components/ChoreLibraryCard";
import type { Chore, Room } from "@/lib/dashboard/types";

interface TaskLibraryViewProps {
  isOpen: boolean;
  onClose: () => void;
  chores: Chore[];
  rooms: Room[];
  selectedRoom: string;
  setSelectedRoom: (roomId: string) => void;
  onEditFrequency: (chore: Chore) => void;
  onEditRoom: (chore: Chore) => void;
  onDeleteChore: (chore: Chore) => void;
  onAddTask: (roomId?: string) => void;
}

export default function TaskLibraryView({
  isOpen,
  onClose,
  chores,
  rooms,
  selectedRoom,
  setSelectedRoom,
  onEditFrequency,
  onEditRoom,
  onDeleteChore,
  onAddTask,
}: Readonly<TaskLibraryViewProps>) {
  const filteredChores = selectedRoom === "all"
    ? chores
    : chores.filter((chore) => chore.room_id === selectedRoom);

  const activeRoomName = rooms.find((room) => room.id === selectedRoom)?.name ?? "this room";

  const handleAddTaskClick = () => {
    if (selectedRoom === "all") {
      onAddTask();
    } else {
      onAddTask(selectedRoom);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-white z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-8 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-900 flex items-center justify-center shadow-lg shadow-indigo-100">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black leading-tight">Task Library</h2>
                <p className="text-indigo-400 font-bold text-sm">Every chore, in one place</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close task library"
              className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
            >
              <X size={22} className="text-indigo-300" />
            </button>
          </div>

          {/* Room filter chips */}
          <div className="px-6 shrink-0">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {rooms.map((room) => {
                const Icon = getRoomIcon(room.icon_name);
                const isActive = selectedRoom === room.id;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all whitespace-nowrap",
                      isActive
                        ? "bg-indigo-900 border-indigo-900 text-white shadow-lg"
                        : "bg-white border-indigo-50 text-indigo-600 hover:border-indigo-200"
                    )}
                  >
                    <Icon size={18} className={cn(isActive ? "text-indigo-200" : "text-indigo-400")} />
                    <span className="font-bold text-sm">{room.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chore list */}
          <div className="flex-1 overflow-y-auto px-6 pb-32">
            {filteredChores.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredChores.map((chore) => (
                    <ChoreLibraryCard
                      key={chore.id}
                      chore={chore}
                      onEditFrequency={onEditFrequency}
                      onEditRoom={onEditRoom}
                      onDelete={onDeleteChore}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center text-center py-20 gap-3"
              >
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
                  <SearchX size={28} className="text-indigo-300" />
                </div>
                <p className="font-black text-lg text-indigo-900">
                  No chores yet in {activeRoomName}
                </p>
                <p className="text-indigo-400 font-bold text-sm max-w-xs">
                  Tap the button below to add one and get this room on the schedule.
                </p>
              </motion.div>
            )}
          </div>

          {/* Add task shortcut */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-white via-white to-transparent">
            <button
              onClick={handleAddTaskClick}
              className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              <Plus size={20} />
              {selectedRoom === "all" ? "Add Task" : `Add Task to ${activeRoomName}`}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
