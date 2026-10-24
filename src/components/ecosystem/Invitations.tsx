"use client";
import Link from "next/link";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
export function Invitations({ kind }: { kind?: string }) {
  const { data } = useWorkspace();
  if (!data) return null;
  const pending = (data.invitations || []).filter(
    (i) =>
      (!kind || i.kind === kind) &&
      i.status === "pending" &&
      new Date(i.expires_at) > new Date(),
  );
  return (
    <section className="sw-card my-5">
      <h2 className="sw-section">
        Pending{" "}
        {kind === "communities"
          ? "community"
          : kind === "projects"
            ? "project"
            : "space"}{" "}
        invitations
      </h2>
      {!pending.length && (
        <p className="sw-muted mt-3">
          No pending invitations. Invitations from project and community
          managers will appear here.
        </p>
      )}
      {pending.map((i) => {
        const space = (
          i.kind === "projects" ? data.projects : data.communities
        ).find((p) => p.id === i.entity_id);
        return (
          <Link
            key={i.id}
            className="mt-4 block text-sm text-blue-700"
            href={`/dashboard/${i.kind}/${i.entity_id}`}
          >
            {space?.title || space?.name || "View invitation"} ·{" "}
            {i.requested_role.replaceAll("_", " ")}
            <span className="sw-muted block">
              Review and accept or decline · expires{" "}
              {new Date(i.expires_at).toLocaleDateString()}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
