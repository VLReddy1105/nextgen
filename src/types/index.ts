import type { Enums } from "@/lib/supabase/types";

export type PrimaryRole = Enums<"primary_account_role">;
export type AccountStatus = "active" | "pending" | "suspended" | "disabled";
export type UniversityStudentMembershipStatus = Enums<"university_membership_status">;
export type UniversityStudentInvitationStatus = Enums<"university_invitation_status">;
export type CommunityRole = "captain" | "moderator" | "member";
export type ProjectRole = "project_head" | "team_lead" | "member" | "mentor";

export type OpportunityType =
  | "job"
  | "internship"
  | "working_student"
  | "hiwi"
  | "research"
  | "project"
  | "volunteer"
  | "cofounder"
  | "mentorship"
  | "event";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  monogram: string;
  location: string;
  workMode: string;
  type: string;
  skills: string[];
  deadline: string;
}

export interface Community {
  name: string;
  description: string;
  members: string;
  activity: string;
  tags: string[];
}

export interface CommunityEvent {
  date: string;
  month: string;
  time: string;
  format: string;
  organizer: string;
  title: string;
  location: string;
}
