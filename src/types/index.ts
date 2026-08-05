export type UserRole =
  | "student"
  | "founder"
  | "mentor"
  | "professional"
  | "company_representative"
  | "university_representative"
  | "community_coordinator"
  | "platform_admin";

export type OrganizationType =
  | "startup"
  | "company"
  | "university"
  | "student_organization"
  | "community"
  | "nonprofit";

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
