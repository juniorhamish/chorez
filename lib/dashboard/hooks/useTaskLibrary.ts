import { useState } from "react";

/**
 * Owns the Task Library overlay's open/closed state and its own room filter,
 * kept independent of the calendar view's `selectedRoom` (see
 * `useViewPreferences`) so switching rooms in one view never affects the
 * other.
 */
export function useTaskLibrary() {
  const [isTaskLibraryOpen, setIsTaskLibraryOpen] = useState(false);
  const [selectedLibraryRoom, setSelectedLibraryRoom] = useState("all");

  const openTaskLibrary = () => {
    setIsTaskLibraryOpen(true);
  };

  return {
    isTaskLibraryOpen,
    setIsTaskLibraryOpen,
    selectedLibraryRoom,
    setSelectedLibraryRoom,
    openTaskLibrary,
  };
}
