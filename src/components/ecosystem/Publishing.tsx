"use client";
import { api } from "@/lib/api/client";
import type { Item } from "@/lib/api/types";
import { Editor, type Field, type Values } from "./Editor";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
const common: Field[] = [
  { key: "title", label: "Title", required: true },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    publishRequired: true,
  },
  {
    key: "tags",
    label: "Required skills",
    catalog: "skills",
    publishRequired: true,
  },
  {
    key: "deadline",
    label: "Registration / application deadline",
    type: "datetime-local",
    required: true,
  },
];
export function Publishing({
  kind,
  item,
  communityId,
}: {
  kind: "opportunities" | "events";
  item?: Item;
  communityId?: string;
}) {
  const { data } = useWorkspace();
  const org = data?.organizations?.[0],
    isEvent = kind === "events";
  const fields: Field[] = [
    ...common,
    ...((isEvent
      ? [
          {
            key: "category",
            label: "Category",
            options: [
              "workshop",
              "webinar",
              "hackathon",
              "hiring_drive",
              "career_session",
              "networking",
              "placement_session",
            ],
          },
          {
            key: "mode",
            label: "Mode",
            options: ["online", "in-person", "hybrid"],
          },
          {
            key: "starts_at",
            label: "Start",
            type: "datetime-local",
            required: true,
          },
          {
            key: "ends_at",
            label: "End",
            type: "datetime-local",
            required: true,
          },
          { key: "location", label: "Venue or meeting URL", required: true },
          {
            key: "capacity",
            label: "Capacity (optional)",
            type: "number",
            min: 1,
          },
          {
            key: "status",
            label: "Status",
            options: ["draft", "published", "cancelled"],
            required: true,
          },
        ]
      : [
          {
            key: "type",
            label: "Opportunity type",
            options: [
              "job",
              "internship",
              "project",
              "competition",
              "hiring_drive",
            ],
            required: true,
          },
          {
            key: "nice_to_have",
            label: "Nice-to-have skills",
            catalog: "skills",
          },
          {
            key: "work_mode",
            label: "Work mode",
            options: ["remote", "hybrid", "on-site"],
            required: true,
          },
          {
            key: "location",
            label: "Location (required for on-site / hybrid)",
          },
          {
            key: "experience",
            label: "Experience",
            options: ["fresher", "0-1", "1-2", "2+"],
          },
          { key: "duration", label: "Duration" },
          { key: "openings", label: "Openings", type: "number", min: 1 },
          {
            key: "status",
            label: "Status",
            options: ["draft", "published", "closed"],
            required: true,
          },
        ]) as Field[]),
    {
      key: "programs",
      label: "Eligible programs (comma-separated; empty means all)",
    },
    { key: "years", label: "Eligible study years (comma-separated)" },
    {
      key: "graduation_years",
      label: "Eligible graduation years (comma-separated)",
    },
    {
      key: "eligible_skills",
      label: "Mandatory eligibility skills (empty means all)",
      catalog: "skills",
    },
  ];
  const initial: Values = {
    title: item?.title || "",
    description: item?.description || "",
    tags: item?.tags || [],
    deadline: local(item?.deadline),
    status: item?.status || "draft",
    type: item?.type || "internship",
    work_mode: item?.work_mode || "remote",
    location: item?.location || "",
    experience: item?.experience || "fresher",
    duration: item?.duration || "",
    nice_to_have: item?.nice_to_have || [],
    openings: item?.openings || 1,
    category: item?.category || "workshop",
    mode: item?.mode || "online",
    starts_at: local(item?.starts_at),
    ends_at: local(item?.ends_at),
    capacity: item?.capacity || null,
    programs: item?.eligibility?.programs.join(", ") || "",
    years: item?.eligibility?.years.join(", ") || "",
    graduation_years: item?.eligibility?.graduation_years.join(", ") || "",
    eligible_skills: item?.eligibility?.skills || [],
  };
  return (
    <>
      <p className="sw-muted mt-4">
        Audience:{" "}
        {org?.type === "university"
          ? `${org.name} — officially connected, eligible students`
          : "Eligible GenZnect students"}
        . Drafts remain private to you.
      </p>
      <Editor
        title={isEvent ? "Event" : "Opportunity"}
        fields={fields}
        initial={initial}
        save={async (v) => {
          const eligibility = {
            programs: String(v.programs || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            years: String(v.years || "")
              .split(",")
              .filter(Boolean)
              .map(Number),
            graduation_years: String(v.graduation_years || "")
              .split(",")
              .filter(Boolean)
              .map(Number),
            skills: v.eligible_skills || [],
          };
          const base = {
            title: v.title,
            description: v.description,
            tags: v.tags,
            deadline: new Date(String(v.deadline)).toISOString(),
            status: v.status,
            location: v.location || "",
            eligibility,
            university_id:
              !communityId && org?.type === "university" ? org.id : null,
          };
          const body = isEvent
            ? {
                ...base,
                community_id: communityId || item?.community_id || null,
                category: v.category,
                mode: v.mode,
                starts_at: new Date(String(v.starts_at)).toISOString(),
                ends_at: new Date(String(v.ends_at)).toISOString(),
                capacity: v.capacity || null,
              }
            : {
                ...base,
                organization_id: org?.id,
                type: v.type,
                nice_to_have: v.nice_to_have || [],
                work_mode: v.work_mode,
                experience: v.experience,
                duration: v.duration || "",
                openings: v.openings || 1,
                interests: [],
                roles: [],
              };
          return api(
            `/${kind}${item ? "/" + item.id : ""}`,
            item ? "PATCH" : "POST",
            body,
          );
        }}
      />
    </>
  );
}
function local(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
