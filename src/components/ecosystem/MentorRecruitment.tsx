"use client";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Action } from "@/components/student/StudentModules";
import { api } from "@/lib/api/client";
import { Editor, type Values } from "./Editor";
import type { Item } from "@/lib/api/types";
import type { MentorOrganization } from "@/lib/api/mentor-types";

function OpeningEditor({
  organizations,
  item,
}: {
  organizations: MentorOrganization[];
  item?: Item;
}) {
  return (
    <Editor
      title={item ? "Mentor opening" : "New Mentor opening"}
      fields={[
        {
          key: "organization_id",
          label: "Organization",
          options: organizations.map((o) => o.id),
          optionLabels: Object.fromEntries(
            organizations.map((o) => [o.id, o.name]),
          ),
          required: true,
        },
        { key: "title", label: "Role / title", required: true },
        {
          key: "description",
          label: "Mentoring requirement, domain and project context",
          type: "textarea",
          required: true,
        },
        {
          key: "tags",
          label: "Required skills",
          catalog: "skills",
          required: true,
        },
        {
          key: "experience",
          label: "Experience",
          options: ["fresher", "0-1", "1-2", "2+"],
          required: true,
        },
        { key: "duration", label: "Availability expectations" },
        {
          key: "deadline",
          label: "Application deadline",
          type: "datetime-local",
          required: true,
        },
        {
          key: "status",
          label: "Status",
          options: ["draft", "published", "closed"],
          required: true,
        },
      ]}
      initial={{
        organization_id: item?.organization_id || "",
        title: item?.title || "",
        description: item?.description || "",
        tags: item?.tags || [],
        experience: item?.experience || "2+",
        duration: item?.duration || "",
        deadline: item?.deadline
          ? (() => {
              const d = new Date(item.deadline);
              return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            })()
          : "",
        status: item?.status || "draft",
      }}
      save={(v: Values) => {
        const org = organizations.find((o) => o.id === v.organization_id);
        return api(
          `/mentor-hub/opportunities${item ? `/${item.id}` : ""}`,
          item ? "PATCH" : "POST",
          {
            ...v,
            audience: "mentor",
            type: "project",
            work_mode: "remote",
            university_id: org?.type === "university" ? org.id : null,
            deadline: new Date(String(v.deadline)).toISOString(),
          },
        );
      }}
    />
  );
}

export function MentorRecruitment() {
  const { data } = useWorkspace();
  if (!data) return null;
  const hub = data.mentor_hub,
    isMentor = data.profile.primary_role === "mentor";
  if (!hub?.available)
    return (
      <section className="sw-card">
        <h1 className="sw-title">Mentor opportunities</h1>
        <p className="sw-muted mt-3">
          Mentor recruitment is not available yet. Existing mentorship continues
          unchanged.
        </p>
      </section>
    );
  const organizations = (hub.organizations || []).filter((o) => o.can_manage);
  const ownSkills = new Set(
    [
      ...((data.mentor?.profile.skills as string[]) || []),
      ...((data.mentor?.profile.expertise as string[]) || []),
    ].map((s) => s.trim().toLowerCase()),
  );
  const openings = (hub.opportunities || [])
    .map((o) => ({
      ...o,
      shared: (o.tags || []).filter((s) =>
        ownSkills.has(s.trim().toLowerCase()),
      ),
    }))
    .sort((a, b) => b.shared.length - a.shared.length);
  return (
    <>
      <h1 className="sw-title">Mentor opportunities</h1>
      <p className="sw-muted mt-3">
        {isMentor
          ? "Explore mentoring requirements. Application decisions and organization affiliation are separate."
          : "Recruit Mentors and review their professional profiles. Selection does not create affiliation."}
      </p>
      {!isMentor && organizations.length > 0 && (
        <details className="sw-card mt-5">
          <summary>Publish a Mentor requirement</summary>
          <OpeningEditor organizations={organizations} />
        </details>
      )}
      {isMentor && hub.context !== "independent" && (
        <p className="sw-card mt-4">
          New applications are available to independent Mentors. Your existing
          applications remain visible.
        </p>
      )}
      <div className="mt-5 space-y-4">
        {openings.map((o) => (
          <section className="sw-card" key={o.id}>
            <h2 className="sw-section">{o.title}</h2>
            <p className="sw-muted mt-2">
              {o.organization} · {o.status} · {o.experience} years experience
            </p>
            <p className="sw-muted mt-3">{o.description}</p>
            <p className="sw-muted mt-2">Skills: {o.tags?.join(", ")}</p>
            <p className="sw-muted mt-2">
              Availability: {o.duration || "Discuss with the organization"}
            </p>
            <p className="sw-muted mt-2">
              Deadline:{" "}
              {o.deadline
                ? new Date(o.deadline).toLocaleString()
                : "Unavailable"}
            </p>
            {isMentor && o.shared.length > 0 && (
              <p className="sw-chip mt-3">Matches {o.shared.join(" + ")}</p>
            )}
            {isMentor &&
              hub.context === "independent" &&
              o.status === "published" &&
              o.deadline &&
              Date.parse(o.deadline) > Date.now() &&
              !hub.applications?.some((a) => a.opportunity_id === o.id) && (
                <div className="mt-3">
                  <p className="sw-muted mb-3">
                    Applying shares your professional Mentor profile with this
                    organization. No resume is attached.
                  </p>
                  <Action
                    run={() =>
                      api(
                        `/mentor-hub/opportunities/${o.id}/applications`,
                        "POST",
                      )
                    }
                  >
                    Apply as Mentor
                  </Action>
                </div>
              )}
            {!isMentor && (
              <details className="mt-3">
                <summary>Edit opening</summary>
                <OpeningEditor organizations={organizations} item={o} />
              </details>
            )}
          </section>
        ))}
      </div>
      {!openings.length && (
        <p className="sw-card mt-5">No Mentor opportunities right now.</p>
      )}
      <h2 className="sw-section mt-8">
        {isMentor ? "My applications" : "Mentor applications"}
      </h2>
      {(hub.applications || []).map((a) => (
        <section className="sw-card mt-4" key={a.id}>
          <h3 className="sw-section">
            {a.full_name} · {a.title}
          </h3>
          <p className="sw-muted mt-2">
            {a.organization} · {a.status}
          </p>
          {!isMentor && (
            <>
              <p className="sw-muted mt-3">
                {String(a.mentor_profile?.headline || "")} ·{" "}
                {String(a.mentor_profile?.years_experience || 0)} years
                experience
              </p>
              <p className="sw-muted mt-2">
                {String(a.mentor_profile?.bio || "")}
              </p>
              <p className="sw-muted mt-2">
                {Array.isArray(a.mentor_profile?.skills)
                  ? a.mentor_profile.skills.join(", ")
                  : ""}{" "}
                ·{" "}
                {Array.isArray(a.mentor_profile?.expertise)
                  ? a.mentor_profile.expertise.join(", ")
                  : ""}
              </p>
              <p className="sw-muted mt-2">
                Availability:{" "}
                {String(
                  a.mentor_profile?.availability_status || "Not specified",
                )}
              </p>
            </>
          )}
          {a.history?.map((h, i) => (
            <p className="sw-muted mt-2" key={i}>
              {h.status} · {new Date(h.created_at).toLocaleString()}{" "}
              {h.note ? `· ${h.note}` : ""}
            </p>
          ))}
          {!["selected", "rejected", "withdrawn"].includes(a.status) &&
            (isMentor ? (
              <Action
                secondary
                run={() =>
                  api(`/mentor-hub/applications/${a.id}/status`, "PATCH", {
                    status: "withdrawn",
                    note: "",
                  })
                }
              >
                Withdraw application
              </Action>
            ) : (
              <Editor
                title="Application decision"
                fields={[
                  {
                    key: "status",
                    label: "Decision",
                    options: [
                      "reviewed",
                      "shortlisted",
                      "selected",
                      "rejected",
                    ].filter((s) => s !== a.status),
                    required: true,
                  },
                  { key: "note", label: "Note", type: "textarea" },
                ]}
                initial={{ status: "", note: "" }}
                save={(v) =>
                  api(`/mentor-hub/applications/${a.id}/status`, "PATCH", v)
                }
              />
            ))}
          {!isMentor &&
            a.status === "selected" &&
            !hub.affiliations?.some(
              (f) =>
                f.mentor_user_id === a.student_id &&
                ["pending", "accepted"].includes(f.status),
            ) && (
              <div className="mt-4">
                <p className="sw-muted mb-3">
                  Invite this selected Mentor to affiliate. They must accept
                  before affiliation becomes active.
                </p>
                <Action
                  run={() =>
                    api("/mentor-hub/affiliations", "POST", {
                      organization_id: a.organization_id,
                      mentor_user_id: a.student_id,
                    })
                  }
                >
                  Send affiliation invitation
                </Action>
              </div>
            )}
        </section>
      ))}
      {!hub.applications?.length && (
        <p className="sw-muted mt-3">No Mentor applications yet.</p>
      )}
    </>
  );
}
