import { useState } from "react";

/**
 * Owns the household switcher dropdown state (menu open/closed, which
 * household is currently being switched to) plus the pending-invitation
 * response state shown in the invitations banner.
 */
export function useHouseholdSwitcher() {
  // Household switcher state
  const [isHouseholdMenuOpen, setIsHouseholdMenuOpen] = useState(false);
  const [switchingHouseholdId, setSwitchingHouseholdId] = useState<string | null>(null);

  // Invitation banner state
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);

  return {
    isHouseholdMenuOpen,
    setIsHouseholdMenuOpen,
    switchingHouseholdId,
    setSwitchingHouseholdId,
    respondingInvitationId,
    setRespondingInvitationId,
  };
}
