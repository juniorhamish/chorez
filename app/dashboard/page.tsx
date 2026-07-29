"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  CheckCircle2,
  Star, 
  Clock, 
  User as UserIcon, 
  X,
  Bath,
  Armchair,
  Home,
  UtensilsCrossed,
  Sparkles,
  Search,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 
 * UTILS 
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 
 * MOCK DATA 
 */
const USERS = [
  { id: "u1", name: "Alex", avatar: "A", color: "bg-indigo-100 text-indigo-700" },
  { id: "u2", name: "Jordan", avatar: "J", color: "bg-rose-100 text-rose-700" },
  { id: "u3", name: "Sam", avatar: "S", color: "bg-amber-100 text-amber-700" },
];

const ROOMS = [
  { id: "all", name: "All", icon: Home },
  { id: "kitchen", name: "Kitchen", icon: UtensilsCrossed },
  { id: "bathroom", name: "Bathroom", icon: Bath },
  { id: "living-room", name: "Living Room", icon: Armchair },
  { id: "bedroom", name: "Bedroom", icon: Sparkles },
];

const WEEK_DAYS = [
  { label: "Mon", date: "Jul 27" },
  { label: "Tue", date: "Jul 28", isToday: true },
  { label: "Wed", date: "Jul 29" },
  { label: "Thu", date: "Jul 30" },
  { label: "Fri", date: "Jul 31" },
  { label: "Sat", date: "Aug 01" },
  { label: "Sun", date: "Aug 02" },
];

const MOCK_TASKS = [
  { 
    id: "t1", 
    title: "Deep clean oven", 
    roomId: "kitchen", 
    duration: "45m", 
    assignedTo: "u1", 
    isFavorite: true,
    day: "Tue"
  },
  { 
    id: "t2", 
    title: "Mop bathroom floor", 
    roomId: "bathroom", 
    duration: "15m", 
    assignedTo: "u2", 
    isFavorite: false,
    day: "Tue"
  },
  { 
    id: "t3", 
    title: "Water the plants", 
    roomId: "living-room", 
    duration: "10m", 
    assignedTo: "u3", 
    isFavorite: false,
    day: "Tue"
  },
  { 
    id: "t4", 
    title: "Vacuum living room", 
    roomId: "living-room", 
    duration: "20m", 
    assignedTo: "u1", 
    isFavorite: true,
    day: "Wed"
  },
  { 
    id: "t5", 
    title: "Take out recycling", 
    roomId: "kitchen", 
    duration: "5m", 
    assignedTo: "u2", 
    isFavorite: false,
    day: "Tue"
  },
];

/** 
 * COMPONENTS 
 */

export default function HouseholdDashboard() {
  const [selectedDay, setSelectedDay] = useState("Tue");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [favoriteRooms, setFavoriteRooms] = useState<string[]>(["kitchen"]);
  const [favoriteTasks, setFavoriteTasks] = useState<string[]>(["t1"]);
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [rating, setRating] = useState(0);

  // Derived state
  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter(task => {
      const dayMatch = task.day === selectedDay;
      const roomMatch = selectedRoom === "all" || task.roomId === selectedRoom;
      return dayMatch && roomMatch;
    });
  }, [selectedDay, selectedRoom]);

  const toggleFavoriteRoom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteRooms(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleFavoriteTask = (id: string) => {
    setFavoriteTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D336B] pb-20 font-sans selection:bg-indigo-100">
      {/* 1. HEADER */}
      <header className="px-6 pt-10 pb-6 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-indigo-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Good morning, Alex! 👋</h1>
            <p className="text-indigo-600/70 font-medium">You have <span className="text-indigo-600 font-bold">{filteredTasks.length} tasks</span> left today.</p>
          </div>
          <button className="p-2 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
            <Plus size={24} />
          </button>
        </div>
        <button className="flex items-center gap-2 text-sm font-semibold bg-white border border-indigo-100 px-4 py-2 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors w-full justify-center">
          <UserIcon size={16} className="text-indigo-400" />
          Invite Member
        </button>
      </header>

      {/* 2. WEEKLY CALENDAR SLIDER */}
      <section className="mt-8 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide snap-x">
          {WEEK_DAYS.map((day) => (
            <button
              key={day.label}
              onClick={() => setSelectedDay(day.label)}
              className={cn(
                "flex flex-col items-center min-w-[70px] py-4 rounded-3xl transition-all snap-center",
                selectedDay === day.label 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105" 
                  : "bg-white text-indigo-400 border border-indigo-50"
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wider mb-1">{day.label}</span>
              <span className="text-lg font-bold">{day.date.split(" ")[1]}</span>
              {day.isToday && selectedDay !== day.label && (
                <div className="w-1 h-1 bg-indigo-600 rounded-full mt-1" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 3. ROOM TABS / CATEGORIES */}
      <section className="mt-8 px-6">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {ROOMS.map((room) => {
            const isFav = favoriteRooms.includes(room.id);
            const Icon = room.icon;
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
        </div>
      </section>

      {/* 4. TASK LIST */}
      <section className="mt-6 px-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Today&apos;s Tasks</h2>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">
            {selectedDay}
          </span>
        </div>
        
        <AnimatePresence mode="popLayout">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const user = USERS.find(u => u.id === task.assignedTo);
              const isFav = favoriteTasks.includes(task.id);
              const room = ROOMS.find(r => r.id === task.roomId);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-[2rem] border border-indigo-50 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {room?.name}
                        </span>
                        <button onClick={() => toggleFavoriteTask(task.id)}>
                          <Star 
                            size={16} 
                            className={cn(
                              "transition-all active:scale-125",
                              isFav ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-indigo-300"
                            )} 
                          />
                        </button>
                      </div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                        {task.title}
                      </h3>
                    </div>
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm", user?.color)}>
                      {user?.avatar}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4 text-indigo-400">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock size={14} />
                        {task.duration}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setRating(0);
                        setCompletingTask(task);
                      }}
                      className="bg-[#88A47C] hover:bg-[#748D69] text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Done
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center text-center opacity-40"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Search size={24} />
              </div>
              <p className="font-bold">No tasks found for this selection</p>
              <p className="text-sm">Enjoy your free time!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 5. COMPLETE TASK MODAL (Drawer) */}
      <AnimatePresence>
        {completingTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletingTask(null)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50"
            >
              <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Finish Task</h2>
                  <p className="text-indigo-400 font-bold">{completingTask.title}</p>
                </div>
                <button 
                  onClick={() => setCompletingTask(null)}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <X size={20} className="text-indigo-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Duration Input */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Actual Minutes Taken
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="e.g. 20"
                      className="w-full bg-indigo-50/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">min</div>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">
                    Effort / Satisfaction
                  </label>
                  <div className="flex justify-between px-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        className="p-2 hover:scale-125 transition-transform active:scale-90"
                      >
                        <Star 
                          size={32} 
                          className={cn(
                            "transition-colors",
                            rating >= star ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-amber-200"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Notes
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="Any issues or things to note?"
                      rows={3}
                      className="w-full bg-indigo-50/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none rounded-2xl px-5 py-4 font-bold transition-all resize-none"
                    />
                    <MessageSquare size={20} className="absolute right-5 top-5 text-indigo-200" />
                  </div>
                </div>

                {/* Submit */}
                <button 
                  onClick={() => setCompletingTask(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
                >
                  Submit Completion
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
