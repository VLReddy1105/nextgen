export interface Completion {
  percent: number;
  checklist: { id: string; label: string; done: boolean; href: string }[];
}
export interface StudentProfile {
  study_status?: string;
  no_experience?: boolean;
  no_certifications?: boolean;
  experience_entries?: Record<string, string | number | null>[];
  certification_entries?: Record<string, string | number | null>[];
  portfolio_entries?: Record<string, string | number | null>[];

  id: string;
  full_name: string;
  email: string;
  headline: string;
  avatar_url?: string;
  primary_role: string;
  email_verified: boolean;
  bio?: string;
  institution?: string;
  degree_level?: string;
  field_of_study?: string;
  current_year?: number | null;
  start_year?: number | null;
  graduation_year?: number | null;
  project_interests?: string[];
  community_interests?: string[];
  career_interests?: string[];
  skills: string[];
  soft_skills?: string[];
  interests: string[];
  preferred_roles?: string[];
  preferred_industries?: string[];
  preferred_locations?: string[];
  work_mode?: string;
  availability?: string;
  languages?: string[];
  experience?: string;
  certifications?: string;
  personal_projects?: string;
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  resume_path?: string;
  completion: Completion;
  memberships: {
    university_id: string;
    program: string | null;
    department: string | null;
    joined_at: string;
    verified_at: string;
  }[];
}
export interface Match {
  score: number;
  matched_skills: string[];
  reasons: string[];
}
export interface Task {
  description?: string;
  priority?: string;
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
  deadline: string | null;
}
export interface Member {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}
export interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  post_id?: string;
  parent_id?: string;
}
export interface Item {
  show_on_profile?: boolean;
  slug?: string;
  short_description?: string;
  visibility?: string;
  join_policy?: string;
  my_role?: string;
  organization_id?: string;
  owner_type?: string;
  project_url?: string;
  expected_team_size?: number;
  invitations?: {
    id: string;
    recipient_user_id: string;
    recipient_name?: string;
    inviter_name?: string;
    requested_role: string;
    status: string;
    expires_at: string;
  }[];
  requests?: {
    id: string;
    user_id: string;
    status: string;
    full_name?: string;
  }[];
  codes?: {
    id: string;
    expires_at: string;
    revoked_at?: string;
    uses: number;
    usage_limit: number;
  }[];
  applicant?: {
    full_name: string;
    headline: string;
    skills: string[];
    degree_level: string;
    field_of_study: string;
  };
  eligibility?: {
    programs: string[];
    years: number[];
    graduation_years: number[];
    skills: string[];
  };
  nice_to_have?: string[];
  openings?: number;
  capacity?: number;
  meeting_url?: string;

  id: string;
  title?: string;
  name?: string;
  full_name?: string;
  description?: string;
  bio?: string;
  organization?: string;
  tags?: string[];
  expertise?: string[];
  match?: Match;
  location?: string;
  work_mode?: string;
  type?: string;
  experience?: string;
  duration?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  saved?: boolean;
  applied?: boolean;
  joined?: boolean;
  registered?: boolean;
  next_step?: string;
  interview_at?: string;
  starts_at?: string;
  ends_at?: string;
  category?: string;
  mode?: string;
  member_count?: number;
  progress?: number;
  completed_tasks?: number;
  total_tasks?: number;
  team?: Member[];
  tasks?: Task[];
  current_position?: string;
  company?: string;
  availability_status?: string;
  community_id?: string;
  university_id?: string;
  history?: { id: string; status: string; note?: string; created_at: string }[];
  files?: { id: string; name: string; url: string }[];
  activity?: { id: string; message: string; created_at: string }[];
  posts?: Post[];
  comments?: Post[];
  reactions?: { post_id: string; user_id: string }[];
  resources?: { id: string; title: string; url: string }[];
  events?: Item[];
  projects?: Item[];
}
export interface Notice {
  id: string;
  type: string;
  title: string;
  message: string;
  source_module: string;
  action_url: string;
  read_at: string | null;
  created_at: string;
}
export type Module =
  | "opportunities"
  | "applications"
  | "projects"
  | "communities"
  | "events"
  | "mentorship";
export interface Workspace {
  organizations?: {
    id: string;
    name: string;
    type: string;
    verified: boolean;
  }[];
  activity?: { id: string; message: string; created_at: string }[];
  profile: StudentProfile;
  opportunities: Item[];
  applications: Item[];
  projects: Item[];
  communities: Item[];
  events: Item[];
  mentors: Item[];
  notifications: Notice[];
  sessions: Item[];
  counts: Record<string, number>;
  module_unread: Record<string, number>;
}
