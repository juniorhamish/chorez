import { useState } from "react";

/**
 * Owns the Add Room modal's open/closed state and form fields. `defaultIconName`
 * is the icon pre-selected when opening the form (the first entry of `ICON_OPTIONS`
 * in the component).
 */
export function useAddRoomForm(defaultIconName: string) {
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddRoomFromTask, setIsAddRoomFromTask] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIconName, setNewRoomIconName] = useState<string>(defaultIconName);
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  const openAddRoom = (fromTask: boolean) => {
    setNewRoomName("");
    setNewRoomIconName(defaultIconName);
    setIsAddRoomFromTask(fromTask);
    setIsAddRoomOpen(true);
  };

  return {
    isAddRoomOpen,
    setIsAddRoomOpen,
    isAddRoomFromTask,
    setIsAddRoomFromTask,
    newRoomName,
    setNewRoomName,
    newRoomIconName,
    setNewRoomIconName,
    isAddingRoom,
    setIsAddingRoom,
    openAddRoom,
  };
}
