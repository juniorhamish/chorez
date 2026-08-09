import { useState } from "react";

/** Owns the "Manage Household" modal's open/closed state, the id of the
 * member currently being removed (used to show a per-row loading state),
 * and the household-rename inline editing state. */
export function useManageHousehold() {
  const [isManageHouseholdOpen, setIsManageHouseholdOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState("");
  const [isRenamingHousehold, setIsRenamingHousehold] = useState(false);
  const [renameHouseholdError, setRenameHouseholdError] = useState<string | null>(null);

  const openManageHousehold = () => {
    setRemoveMemberError(null);
    setIsEditingHouseholdName(false);
    setRenameHouseholdError(null);
    setIsManageHouseholdOpen(true);
  };

  const startEditingHouseholdName = (currentName: string) => {
    setHouseholdNameInput(currentName);
    setRenameHouseholdError(null);
    setIsEditingHouseholdName(true);
  };

  const cancelEditingHouseholdName = () => {
    setIsEditingHouseholdName(false);
    setRenameHouseholdError(null);
  };

  return {
    isManageHouseholdOpen,
    setIsManageHouseholdOpen,
    removingMemberId,
    setRemovingMemberId,
    removeMemberError,
    setRemoveMemberError,
    openManageHousehold,
    isEditingHouseholdName,
    householdNameInput,
    setHouseholdNameInput,
    isRenamingHousehold,
    setIsRenamingHousehold,
    renameHouseholdError,
    setRenameHouseholdError,
    startEditingHouseholdName,
    cancelEditingHouseholdName,
  };
}
