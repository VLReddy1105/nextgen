"use client";
import { catalogs } from "@/lib/forms/catalogs";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./WorkspaceProvider";
import { Editor, type Values } from "@/components/ecosystem/Editor";
import { api } from "@/lib/api/client";
import type { Item } from "@/lib/api/types";
export function CreateSpace({
  kind,
  item,
}: {
  kind: "projects" | "communities";
  item?: Item;
}) {
  const router = useRouter(),
    { data } = useWorkspace();
  const org = data?.organizations?.[0];
  return (
    <details className="sw-card mt-5">
      <summary className="font-semibold">
        {item ? "Edit" : "Create"}{" "}
        {kind === "projects" ? "project" : "community"}
      </summary>
      <Editor
        title={kind === "projects" ? "Project" : "Community"}
        fields={[
          { key: "title", label: "Name", required: true },
          {
            key: "slug",
            label: "Unique address (lowercase-with-hyphens)",
            required: true,
          },
          {
            key: "short_description",
            label: "Short description",
            required: true,
          },
          {
            key: "description",
            label: "Detailed description",
            type: "textarea",
          },
          {
            key: "tags",
            label: "Skills / technologies",
            catalog: "skills",
            required: true,
          },
          {
            key: "category",
            label: "Category",
            options: catalogs.project_categories,
          },
          {
            key: "visibility",
            label: "Visibility",
            options:
              kind === "projects"
                ? ["private", "public"]
                : [
                    "private",
                    "public",
                    ...(org
                      ? [
                          org.type === "university"
                            ? "university_scoped"
                            : "organization_scoped",
                        ]
                      : []),
                  ],
            required: true,
          },
          {
            key: "join_policy",
            label: "Join policy",
            options: ["invite_only", "request_to_join", "open_join"],
            required: true,
          },
          ...(kind === "projects"
            ? [
                {
                  key: "project_url",
                  label: "GitHub / project URL",
                  type: "url",
                },
                {
                  key: "expected_team_size",
                  label: "Expected team size",
                  type: "number",
                  min: 1,
                },
                {
                  key: "community_id",
                  label: "Owning community (optional)",
                  options: [
                    "",
                    ...(data?.communities
                      .filter((c) => c.joined)
                      .map((c) => c.id) || []),
                  ],
                  optionLabels: Object.fromEntries(
                    data?.communities.map((c) => [
                      c.id,
                      c.title || c.name || "Community",
                    ]) || [],
                  ),
                },
              ]
            : []),
        ]}
        initial={{
          title: item?.title || item?.name || "",
          slug: item?.slug || "",
          short_description:
            item?.short_description || item?.description?.slice(0, 500) || "",
          description: item?.description || "",
          tags: item?.tags || [],
          category: item?.category || "Other",
          visibility: item?.visibility || "private",
          join_policy: item?.join_policy || "invite_only",
          project_url: item?.project_url || "",
          expected_team_size: item?.expected_team_size || null,
          community_id: item?.community_id || "",
        }}
        save={async (v: Values) => {
          const { community_id, ...rest } = v;
          if (v.visibility === "private" && v.join_policy === "open_join")
            throw Error("Private spaces require invitation or a join request.");
          const result = await api<{ id: string }>(
            `/relationships/${kind}${item ? "/" + item.id : ""}`,
            item ? "PATCH" : "POST",
            {
              ...rest,
              organization_id:
                item?.organization_id ||
                (!community_id ? org?.id : null) ||
                null,
              community_id: community_id || null,
            },
          );
          router.push(`/dashboard/${kind}/${result.id}`);
        }}
      />
      <p className="sw-muted mt-4">
        Private and invite-only by default. Invitations create membership only
        after acceptance.
      </p>
    </details>
  );
}
