// Component fixtures only. This harness bypasses neither application guards nor
// Supabase identity verification; it does not render the application provider.
import React from "react";
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
  role === "university" && ["students", "announcements"].includes(page) ? (
    <Campus mode={page as "students" | "announcements"} />
  ) : role === "mentor" &&
    ["profile", "connections", "sessions"].includes(page) ? (
    <Mentor mode={page as "profile" | "connections" | "sessions"} />
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
createRoot(document.getElementById("root")!).render(
  <WorkspaceContext.Provider
    value={{
      data: search.get("state") === "error" ? null : data,
      error:
        search.get("state") === "error"
          ? "Service unavailable for this isolated test."
          : "",
      loading: search.get("state") === "loading",
      refresh: async () => {},
      mutate: async () => {
        throw new Error(
          "Writes are disabled in this isolated component harness.",
        );
      },
    }}
  >
    <StudentWorkspaceFrame user={{ name: "Test Student", initials: "TS" }}>
      {component}
    </StudentWorkspaceFrame>
  </WorkspaceContext.Provider>,
);
