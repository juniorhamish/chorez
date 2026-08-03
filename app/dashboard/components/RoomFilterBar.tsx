"use client";

import type { MouseEvent } from "react";
import { Plus, Star } from "lucide-react";
import { cn, getRoomIcon } from "@/app/dashboard/components/dashboard-ui-utils";
import type { Room } from "@/lib/dashboard/types";

interface RoomFilterBarProps {
  rooms: Room[];
  selectedRoom: string;
  setSelectedRoom: (roomId: string) => void;
  favoriteRooms: string[];
  toggleFavoriteRoom: (id: string, e: MouseEvent) => void;
  openAddRoom: (fromTask: boolean) => void;
}

export default function RoomFilterBar({
  rooms,
  selectedRoom,
  setSelectedRoom,
  favoriteRooms,
  toggleFavoriteRoom,
  openAddRoom,
}: Readonly<RoomFilterBarProps>) {
  return (
    <section className="mt-8 px-6">
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {rooms.map((room) => {
          const isFav = favoriteRooms.includes(room.id);
          const Icon = getRoomIcon(room.icon_name);
          const isActive = selectedRoom === room.id;

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all whitespace-nowrap group",
                isActive
                  ? "bg-indigo-900 border-indigo-900 text-white shadow-lg"
                  : "bg-white border-indigo-50 text-indigo-600 hover:border-indigo-200"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-indigo-200" : "text-indigo-400")} />
              <span className="font-bold text-sm">{room.name}</span>
              {room.id !== "all" && (
                <Star 
                  size={14} 
                  onClick={(e) => toggleFavoriteRoom(room.id, e)}
                  className={cn(
                    "ml-1 transition-colors",
                    isFav ? "fill-amber-400 text-amber-400" : "text-indigo-200 group-hover:text-indigo-300"
                  )} 
                />
              )}
            </button>
          );
        })}
        <button
          onClick={() => openAddRoom(false)}
          aria-label="Add Room"
          title="Add Room"
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all whitespace-nowrap"
        >
          <Plus size={18} />
          <span className="font-bold text-sm">Add Room</span>
        </button>
      </div>
    </section>
  );
}
