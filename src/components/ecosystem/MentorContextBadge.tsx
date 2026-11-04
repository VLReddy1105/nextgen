"use client";
import Link from "next/link";
import { useWorkspace } from "@/components/student/WorkspaceProvider";

export function MentorContextBadge() {
  const { data } = useWorkspace();
  const hub = data?.mentor_hub;
  if (!hub?.available || data?.profile.primary_role !== "mentor") return null;
  const active = hub.affiliations?.find(
    (a) => a.status === "accepted" && hub.context === a.context,
  );
  return (
    <section className="sw-card mt-4">
      <h2 className="sw-section">
        {active
          ? `${active.context === "company" ? "Company" : "University"} Mentor — ${active.organization_name}`
          : "Independent Mentor"}
      </h2>
      <p className="sw-muted mt-2">
        {active
          ? "Organization access follows your approved relationships and project permissions."
          : "You’re currently mentoring independently."}
      </p>
      <Link className="sw-button mt-3" href="/dashboard/mentors">
        Manage affiliation
      </Link>
      <p className="sw-muted mt-3">
        {hub.affiliations?.filter((a) => a.status === "pending").length || 0}{" "}
        pending requests or invitations
      </p>
      <Link
        className="mt-3 block text-blue-700"
        href="/dashboard/mentor-opportunities"
      >
        Mentor opportunities · {hub.applications?.length || 0} applications
      </Link>
    </section>
  );
}

