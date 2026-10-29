import { MentorAffiliations } from "../../src/components/ecosystem/MentorAffiliations";
import { MentorRecruitment } from "../../src/components/ecosystem/MentorRecruitment";
import { affiliationFixture } from "./api";
// Component fixtures only. This harness bypasses neither application guards nor
// Supabase identity verification; it does not render the application provider.
import React, { useState } from "react";
import { roleFixture } from "./api";
import { SpaceActions } from "../../src/components/ecosystem/SpaceActions";

import {
  Talent,
  SpaceConnections,
} from "../../src/components/ecosystem/Connections";
import { RoleWorkspace } from "../../src/components/ecosystem/RoleWorkspace";
import { Campus } from "../../src/components/ecosystem/Campus";
import { Mentor } from "../../src/components/ecosystem/Mentor";
import { CreateSpace } from "../../src/components/student/CreateSpace";
import { createRoot } from "react-dom/client";
import "./style.css";
import { WorkspaceContext } from "../../src/components/student/WorkspaceProvider";
import { StudentWorkspaceFrame } from "../../src/components/student/StudentShell";
import {
  StudentOverview,
  StudentListing,
} from "../../src/components/student/StudentModules";
import { StudentProfileEditor } from "../../src/components/student/StudentProfileEditor";
import {
  StudentAITools,
  StudentNotifications,
  StudentSettings,
} from "../../src/components/student/StudentExtras";
import type { Workspace, Module } from "../../src/lib/api/types";
const search = new URLSearchParams(location.search),
  page = search.get("page") || "overview";
const data: Workspace = {
  profile: {
    id: "test-student",
    full_name: "Test Student",
    email: "student@example.test",
    headline: "Computer Science Student",
    primary_role: "student",
    email_verified: true,
    skills: ["python", "django"],
    interests: ["backend"],
    memberships: [],
    completion: {
      percent: 43,
      checklist: [
        {
          id: "career",
          label: "Career preferences",
          done: false,
          href: "/dashboard/profile?section=career",
        },
        {
          id: "resume",
          label: "CV / Resume",
          done: false,
          href: "/dashboard/profile?section=resume",
        },
      ],
    },
  },
  opportunities: [],
  applications: [],
  projects: [],
  communities: [],
  events: [],
  mentors: [],
  notifications: [],
  sessions: [],
  counts: {
    opportunities: 0,
    applications: 0,
    projects: 0,
    communities: 0,
    events: 0,
    notifications: 0,
  },
  module_unread: {},
};
if (search.get("state") === "populated") {
  data.opportunities = [
    {
      id: "opportunity",
      title: "Python Backend Internship",
      organization: "Test Organization",
      description:
        "An isolated test opportunity used to verify card wrapping and controls.",
      type: "internship",
      tags: ["python", "django"],
      location: "Bengaluru",
      work_mode: "hybrid",
      deadline: "2099-01-01",
      match: {
        score: 86,
        matched_skills: ["python"],
        reasons: ["Matches python"],
      },
    },
  ];
  data.notifications = [
    {
      id: "notice",
      type: "application_status_changed",
      title: "Your application was shortlisted",
      message: "Application update",
      source_module: "applications",
      action_url: "/dashboard/applications/test",
      read_at: null,
      created_at: "2026-10-02T00:00:00Z",
    },
  ];
  data.counts.notifications = 1;
}
const role = search.get("role") || "student";
data.profile.primary_role = role;
if (role !== "student")
  data.organizations = [
    {
      id: "test-organization",
      name: "Test " + role,
      type: role,
      verified: true,
    },
  ];
const component =
  page === "mentors" ? (
    <MentorAffiliations />
  ) : page === "mentor-opportunities" ? (
    <MentorRecruitment />
  ) : page === "mentor-project" ? (
    <SpaceActions
      kind="projects"
      tab="members"
      item={{
        id: "mentor-project",
        title: "Python project",
        joined: true,
        my_role: search.get("context") === "head" ? "project_head" : "mentor",
        tags: ["python"],
        team: [],
      }}
    />
  ) : page === "settings" ? (
    <StudentSettings />
  ) : page === "talent" ? (
    <Talent />
  ) : role === "founder" && page === "connections" ? (
    <SpaceConnections />
  ) : role === "university" &&
    ["students", "announcements", "student-connections"].includes(page) ? (
    <Campus
      mode={
        page === "student-connections"
          ? "connections"
          : (page as "students" | "announcements")
      }
    />
  ) : role === "mentor" &&
    ["profile", "connections", "sessions", "requests", "students"].includes(
      page,
    ) ? (
    <Mentor
      mode={
        page as "profile" | "connections" | "sessions" | "requests" | "students"
      }
    />
  ) : page === "project-form" ? (
    <CreateSpace kind="projects" />
  ) : role !== "student" && page !== "notifications" ? (
    <RoleWorkspace module={page} />
  ) : page === "profile" ? (
    <StudentProfileEditor />
  ) : page === "ai-tools" ? (
    <StudentAITools />
  ) : page === "notifications" ? (
    <StudentNotifications />
  ) : page === "overview" ? (
    <StudentOverview />
  ) : (
    <StudentListing kind={page as Module} />
  );
function Harness() {
  const [, update] = useState(0);
  if (role === "mentor") {
    const connection = {
      student_id: "test-student",
      mentor_id: data.profile.id,
      full_name: "Test Student",
      status:
        search.get("scenario") === "roles"
          ? roleFixture.mentorStatus
          : "accepted",
      skills: ["python"],
    };
    data.mentor = {
      profile: {
        full_name: "Python Mentor",
        headline: "Backend engineer",
        skills: ["fastapi"],
        expertise: ["python"],
        topics: [],
        years_experience: 5,
        availability_status: "available",
      },
      connections: [connection],
      recommended_students:
        connection.status === "declined"
          ? []
          : [{ ...connection, matched_skills: ["python"] }],
      project_matches: {
        "mentor-project": [
          { ...connection, status: "accepted", matched_skills: ["python"] },
        ],
      },
      profile_missing: ["Bio"],
    };
    data.counts.requests = connection.status === "requested" ? 1 : 0;
    data.counts.connections = connection.status === "accepted" ? 1 : 0;
  }
  if (search.get("scenario") === "affiliations") {
    const isMentor = role === "mentor",
      organizationType =
        search.get("org") === "university" ? "university" : "company";
    const initiated = search.get("direction") === "request";
    const status = affiliationFixture.status;
    data.mentor_hub = {
      available: true,
      context: status === "accepted" ? organizationType : "independent",
      organizations: [
        {
          id: "org-one",
          name: "Verified Organization",
          type: organizationType,
          can_manage: !isMentor,
        },
      ],
      mentor_directory: [
        { id: "test-student", full_name: "Professional Mentor" },
      ],
      affiliations: [
        {
          id: "affiliation-one",
          mentor_user_id: "test-student",
          organization_id: "org-one",
          organization_name: "Verified Organization",
          context: organizationType,
          status,
          requested_by: initiated ? "test-student" : "org-owner",
          full_name: "Professional Mentor",
          profile: {
            headline: "Engineer",
            skills: ["python"],
            bio: "Professional guidance",
          },
          can_decide:
            status === "pending" && (isMentor ? !initiated : initiated),
          can_cancel:
            status === "pending" && (isMentor ? initiated : !initiated),
          can_end: status === "accepted",
          progress:
            status === "accepted"
              ? {
                  projects: [],
                  mentees: 2,
                  upcoming_sessions: 1,
                  past_sessions: 0,
                }
              : null,
        },
      ],
      opportunities: [
        {
          id: "mentor-opening",
          title: "Python Mentor",
          description: "Guide students with Python projects",
          organization_id: "org-one",
          organization: "Verified Organization",
          audience: "mentor",
          status: "published",
          tags: ["python"],
          experience: "2+",
          deadline: "2099-01-01T00:00:00Z",
        },
      ],
      applications: [
        {
          id: "mentor-application",
          student_id: "test-student",
          opportunity_id: "mentor-opening",
          organization_id: "org-one",
          organization: "Verified Organization",
          title: "Python Mentor",
          full_name: "Professional Mentor",
          status: affiliationFixture.application,
          mentor_profile: { headline: "Engineer", skills: ["python"] },
          history: [
            {
              status: affiliationFixture.application,
              note: "",
              created_at: "2026-10-29T00:00:00Z",
            },
          ],
        },
      ],
    };
    if (role === "student")
      data.mentors = [
        {
          id: "mentor",
          title: "Professional Mentor",
          tags: ["python"],
          affiliation_context:
            status === "accepted" ? organizationType : "independent",
          affiliation_organization:
            status === "accepted" ? "Verified Organization" : undefined,
        },
      ];
  }
  return (
    <WorkspaceContext.Provider
      value={{
        data:
          search.get("state") === "error" ||
          search.get("scenario") === "failure"
            ? null
            : { ...data },
        error:
          search.get("scenario") === "failure"
            ? "Controlled connection read failed"
            : search.get("state") === "error"
              ? "Service unavailable for this isolated test."
              : "",
        loading: search.get("state") === "loading",
        refresh: async () => {},
        mutate: async (run) => {
          if (
            ["roles", "affiliations"].includes(search.get("scenario") || "")
          ) {
            await run();
            update((n) => n + 1);
            return;
          }
          throw new Error(
            "Writes are disabled in this isolated component harness.",
          );
        },
      }}
    >
      <StudentWorkspaceFrame user={{ name: "Test Student", initials: "TS" }}>
        {component}
      </StudentWorkspaceFrame>
    </WorkspaceContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
