"use client";

import { useState } from "react";
import { X, Users, Loader2, UserMinus, ShieldCheck, Pencil, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import type { Household, HouseholdMember } from "@/lib/dashboard/types";

interface ManageHouseholdModalProps {
  activeHousehold: Household | null;
  members: HouseholdMember[];
  currentUserId?: string;
  removingMemberId: string | null;
  removeMemberError: string | null;
  isEditingHouseholdName: boolean;
  householdNameInput: string;
  setHouseholdNameInput: (value: string) => void;
  isRenamingHousehold: boolean;
  renameHouseholdError: string | null;
  onStartEditHouseholdName: () => void;
  onCancelEditHouseholdName: () => void;
  onRenameHousehold: () => Promise<void>;
  onClose: () => void;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export default function ManageHouseholdModal({
  activeHousehold,
  members,
  currentUserId,
  removingMemberId,
  removeMemberError,
  isEditingHouseholdName,
  householdNameInput,
  setHouseholdNameInput,
  isRenamingHousehold,
  renameHouseholdError,
  onStartEditHouseholdName,
  onCancelEditHouseholdName,
  onRenameHousehold,
  onClose,
  onRemoveMember,
}: Readonly<ManageHouseholdModalProps>) {
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(null);
  const isBusy = removingMemberId !== null || isRenamingHousehold;
  const isRenameValid = householdNameInput.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isBusy && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black">Manage Household</h2>
              {isEditingHouseholdName ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    autoFocus
                    value={householdNameInput}
                    onChange={(e) => setHouseholdNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isRenameValid && !isRenamingHousehold) onRenameHousehold();
                      if (e.key === "Escape") onCancelEditHouseholdName();
                    }}
                    placeholder="Household name"
                    className="min-w-0 flex-1 bg-indigo-50/50 border-2 border-transparent outline-none rounded-xl px-3 py-1.5 font-bold text-sm transition-all"
                  />
                  <button
                    onClick={onCancelEditHouseholdName}
                    disabled={isRenamingHousehold}
                    aria-label="Cancel rename"
                    title="Cancel"
                    className="p-1.5 rounded-xl text-indigo-400 hover:bg-indigo-100 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={onRenameHousehold}
                    disabled={isRenamingHousehold || !isRenameValid}
                    aria-label="Save household name"
                    title="Save"
                    className="p-1.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isRenamingHousehold ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-indigo-400 text-sm font-bold truncate">
                    {activeHousehold ? `Members of "${activeHousehold.name}"` : "Members"}
                  </p>
                  {activeHousehold && (
                    <button
                      onClick={onStartEditHouseholdName}
                      aria-label="Rename household"
                      title="Rename household"
                      className="p-1 rounded-lg text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50 shrink-0"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        {renameHouseholdError && (
          <p className="text-rose-500 text-sm font-bold mb-4 ml-1">{renameHouseholdError}</p>
        )}

        {removeMemberError && (
          <p className="text-rose-500 text-sm font-bold mb-4 ml-1">{removeMemberError}</p>
        )}

        <div className="space-y-3">
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const isRemoving = removingMemberId === member.id;
            const isConfirming = confirmingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-50 p-4 rounded-3xl"
              >
                <div
                  className={cn(
                    "w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm",
                    member.color ?? "bg-indigo-100 text-indigo-700"
                  )}
                >
                  {member.avatar ?? member.name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight truncate">
                    {member.name ?? member.email}
                    {isSelf && <span className="text-indigo-400 font-medium"> (you)</span>}
                  </p>
                  <p className="text-indigo-400 text-xs font-medium truncate">{member.email}</p>
                </div>
                {member.role === 'admin' && (
                  <span
                    title="Admin"
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-100 px-2 py-1 rounded-full shrink-0"
                  >
                    <ShieldCheck size={12} />
                    Admin
                  </span>
                )}
                {!isSelf && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setConfirmingMemberId(null)}
                        disabled={isRemoving}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await onRemoveMember(member.id);
                          setConfirmingMemberId(null);
                        }}
                        disabled={isRemoving}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isRemoving ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingMemberId(member.id)}
                      disabled={isBusy}
                      aria-label={`Remove ${member.name ?? member.email}`}
                      title="Remove from household"
                      className="p-2.5 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <UserMinus size={18} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
