import type { Item } from "./types";
export type MentorOrganization = {
  id: string;
  name: string;
  type: "company" | "university";
  can_manage: boolean;
};
export type MentorAffiliation = {
  id: string;
  mentor_user_id: string;
  organization_id: string;
  organization_name: string;
  context: "company" | "university";
  status: string;
  requested_by: string;
  full_name: string;
  profile: Record<string, string | number | string[] | null> | null;
  can_decide: boolean;
  can_cancel: boolean;
  can_end: boolean;
  progress?: {
    projects: { id: string; title: string }[];
    mentees: number;
    upcoming_sessions: number;
    past_sessions: number;
  } | null;
};
export type MentorApplication = {
  id: string;
  student_id: string;
  opportunity_id: string;
  organization_id: string;
  organization: string;
  title: string;
  full_name: string;
  status: string;
  mentor_profile: MentorAffiliation["profile"];
  history: { status: string; note: string | null; created_at: string }[];
};
export type MentorHubData = {
  available: boolean;
  context?: "independent" | "university" | "company";
  organizations?: MentorOrganization[];
  mentor_directory?: { id: string; full_name: string }[];
  affiliations?: MentorAffiliation[];
  opportunities?: Item[];
  applications?: MentorApplication[];
};
