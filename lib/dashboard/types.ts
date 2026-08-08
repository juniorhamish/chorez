import type { ChoreFrequency } from "@/lib/actions/chore-actions";

export interface Task {
  id: string;
  chore_id: string;
  assigned_user_id: string | null;
  due_date: string | Date;
  status: string;
  title: string;
  estimated_duration_minutes: number | null;
  frequency: ChoreFrequency;
  frequency_interval: number | null;
  room_name: string | null;
  room_id: string | null;
  assigned_user_name: string | null;
  assigned_user_avatar: string | null;
  assigned_user_avatar_url: string | null;
  assigned_user_color: string | null;
  completed_at: string | Date | null;
  actual_duration_minutes: number | null;
  effort_rating: number | null;
  notes: string | null;
  private_to_user_id: string | null;
  is_private: boolean;
}

export interface Room {
  id: string;
  household_id?: string;
  name: string;
  icon_name?: string | null;
  created_at?: string;
}

export interface HouseholdUser {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string | null;
}

export interface DbUser {
  id?: string;
  full_name?: string | null;
  email?: string;
  active_household_id?: string | null;
  morning_notification_hour?: number | null;
  evening_notification_hour?: number | null;
}

export interface Invitation {
  id: string;
  household_id: string;
  household_name: string;
  inviter_name: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Household {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export interface HouseholdMember {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  color: string | null;
  role: 'admin' | 'member';
  joined_at: string;
}
