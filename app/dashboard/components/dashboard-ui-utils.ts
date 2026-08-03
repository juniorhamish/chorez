import {
  Bath,
  Armchair,
  Home,
  UtensilsCrossed,
  Sparkles,
  Bed,
  Tv,
  Briefcase,
  Dumbbell,
  Shirt,
  Baby,
  Car,
  Flower2,
  type LucideIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";

/**
 * UTILS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Maps a room's `icon_name` (stored in the DB) to a Lucide icon component.
 * Falls back to `Home` when the name is missing or unrecognized.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  UtensilsCrossed,
  Bath,
  Armchair,
  Bed,
  Tv,
  Briefcase,
  Dumbbell,
  Shirt,
  Baby,
  Car,
  Flower2,
  Sparkles,
};

export function getRoomIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Home;
  return ICON_MAP[iconName] ?? Home;
}

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export const FREQUENCY_OPTIONS: { value: ChoreFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "every-x-days", label: "Every X Days" },
  { value: "every-x-weeks", label: "Every X Weeks" },
  { value: "on-demand", label: "On Demand" },
];

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
