"use client";

import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn, ICON_MAP, ICON_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";

interface AddRoomModalProps {
  newRoomName: string;
  setNewRoomName: (value: string) => void;
  newRoomIconName: string;
  setNewRoomIconName: (value: string) => void;
  isAddRoomValid: boolean;
  isAddingRoom: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function AddRoomModal({
  newRoomName,
  setNewRoomName,
  newRoomIconName,
  setNewRoomIconName,
  isAddRoomValid,
  isAddingRoom,
  onClose,
  onSubmit,
}: Readonly<AddRoomModalProps>) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isAddingRoom && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-[55]"
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-[60] shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black mb-1">Add Room</h2>
            <p className="text-indigo-400 font-bold">Create a new space</p>
          </div>
          <button
            onClick={onClose}
            disabled={isAddingRoom}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
              Room Name
            </label>
            <input
              type="text"
              placeholder="e.g. Garage"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">
              Icon
            </label>
            <div className="flex flex-wrap gap-3">
              {ICON_OPTIONS.map((iconName) => {
                const Icon = ICON_MAP[iconName];
                const isSelected = newRoomIconName === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setNewRoomIconName(iconName)}
                    aria-label={iconName}
                    title={iconName}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all active:scale-95",
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                        : "bg-indigo-50/50 border-transparent text-indigo-400 hover:border-indigo-200"
                    )}
                  >
                    <Icon size={22} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={isAddingRoom || !isAddRoomValid}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isAddingRoom ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Adding...
              </>
            ) : (
              "Add Room"
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
