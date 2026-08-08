import { useState } from "react";

/** Owns the "Manage Household" modal's open/closed state and the id of the
 * member currently being removed (used to show a per-row loading state). */
export function useManageHousehold() {
  const [isManageHouseholdOpen, setIsManageHouseholdOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  const openManageHousehold = () => {
    setRemoveMemberError(null);
    setIsManageHouseholdOpen(true);
  };

  return {
    isManageHouseholdOpen,
    setIsManageHouseholdOpen,
    removingMemberId,
    setRemovingMemberId,
    removeMemberError,
    setRemoveMemberError,
    openManageHousehold,
  };
}
