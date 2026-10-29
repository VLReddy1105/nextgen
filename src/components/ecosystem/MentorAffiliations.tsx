"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Action } from "@/components/student/StudentModules";
import { api } from "@/lib/api/client";
import { Editor } from "./Editor";

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

export function MentorAffiliations() {
  const { data } = useWorkspace();
  const [kind, setKind] = useState("independent"),
    [search, setSearch] = useState("");
  if (!data) return null;
  const hub = data.mentor_hub;
  const isMentor = data.profile.primary_role === "mentor";
  if (!hub?.available)
    return (
      <section className="sw-card">
        <h1 className="sw-title">Mentor affiliations</h1>
        <p className="sw-muted mt-3">
          Affiliation requests are not available yet. Your existing mentorship
          and profile remain available.
        </p>
      </section>
    );
  const orgs = (hub.organizations || []).filter((o) =>
    isMentor
      ? o.type === kind && o.name.toLowerCase().includes(search.toLowerCase())
      : o.can_manage,
  );
  const active = hub.affiliations?.find(
    (a) => a.status === "accepted" && a.mentor_user_id === data.profile.id,
  );
  return (
    <>
      <h1 className="sw-title">
        {isMentor ? "My Mentor affiliation" : "Organization Mentors"}
      </h1>
      {isMentor && <MentorContextBadge />}
      {isMentor && !active && (
        <section className="sw-card mt-5">
          <label htmlFor="mentor-context" className="sw-section">
            How will you mentor on GenZnect?
          </label>
          <select
            id="mentor-context"
            className="sw-input mt-3"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="independent">Independent Mentor</option>
            <option value="university">University Mentor</option>
            <option value="company">Company Mentor</option>
          </select>
          {kind === "independent" ? (
            <p className="sw-muted mt-3">
              No organization is required. You remain independent until an
              affiliation is accepted.
            </p>
          ) : (
            <>
              <label
                htmlFor="mentor-org-search"
                className="sw-muted mt-3 block"
              >
                Search organizations
              </label>
              <input
                id="mentor-org-search"
                className="sw-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <p className="sw-muted mt-3">
                Selecting an organization does not grant access. Send a request
                for approval.
              </p>
            </>
          )}
        </section>
      )}
      {(!isMentor || (!active && kind !== "independent")) &&
        (orgs.length ? (
          <Editor
            key={`${kind}:${search}`}
            title={isMentor ? "Affiliation request" : "Mentor invitation"}
            fields={[
              {
                key: "organization_id",
                label: "Organization",
                options: orgs.map((o) => o.id),
                optionLabels: Object.fromEntries(
                  orgs.map((o) => [o.id, o.name]),
                ),
                required: true,
              },
              ...(!isMentor
                ? [
                    {
                      key: "mentor_user_id",
                      label: "Mentor",
                      options: (hub.mentor_directory || []).map((m) => m.id),
                      optionLabels: Object.fromEntries(
                        (hub.mentor_directory || []).map((m) => [
                          m.id,
                          m.full_name,
                        ]),
                      ),
                      required: true,
                    },
                  ]
                : []),
            ]}
            initial={{
              organization_id: "",
              ...(!isMentor ? { mentor_user_id: "" } : {}),
            }}
            save={(v) => api("/mentor-hub/affiliations", "POST", v)}
          />
        ) : (
          <p className="sw-card mt-4">
            No eligible organizations match. University accounts must be
            verified.
          </p>
        ))}
      <div className="mt-5 space-y-4">
        {(hub.affiliations || []).map((a) => (
          <section className="sw-card" key={a.id}>
            <h2 className="sw-section">
              {isMentor ? a.organization_name : a.full_name}
            </h2>
            <p className="sw-muted mt-2">
              {a.status} ·{" "}
              {a.requested_by === a.mentor_user_id
                ? "Mentor request"
                : "Organization invitation"}
            </p>
            <p className="sw-muted mt-2">
              {String(a.profile?.headline || "")} ·{" "}
              {Array.isArray(a.profile?.skills)
                ? a.profile.skills.join(", ")
                : ""}
            </p>
            {a.profile?.bio && (
              <p className="sw-muted mt-2">{String(a.profile.bio)}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                ...(a.can_decide ? ["accept", "reject"] : []),
                ...(a.can_cancel ? ["cancel"] : []),
                ...(a.can_end ? ["end"] : []),
              ].map((action) => (
                <Action
                  key={action}
                  secondary={action !== "accept"}
                  run={() =>
                    api(`/mentor-hub/affiliations/${a.id}/decision`, "POST", {
                      action,
                    })
                  }
                >
                  {action === "end"
                    ? "End affiliation"
                    : action === "accept"
                      ? "Accept affiliation"
                      : action === "reject"
                        ? "Reject affiliation"
                        : "Cancel request"}
                </Action>
              ))}
            </div>
            {a.progress && (
              <div className="mt-4">
                <p className="sw-muted">
                  {a.progress.mentees} organization-related mentees ·{" "}
                  {a.progress.upcoming_sessions} upcoming scoped sessions ·{" "}
                  {a.progress.past_sessions} past scoped sessions
                </p>
                <p className="sw-muted mt-2">
                  Only sessions explicitly shared with this organization are
                  counted.
                </p>
                {a.progress.projects.map((p) => (
                  <Link
                    key={p.id}
                    className="mt-2 block text-blue-700"
                    href={`/dashboard/projects/${p.id}`}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      {!hub.affiliations?.length && (
        <p className="sw-card mt-5">
          No Mentor affiliation requests or invitations yet.
        </p>
      )}
    </>
  );
}
