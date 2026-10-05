from app.services.concurrency import gather
from app.core.errors import APIError
from app.matching.rank import rank, eligible
from app.services.students import student_core


async def one(repo, table, id):
    records = await repo.rows(table, id=f"eq.{id}")
    if not records:
        raise APIError(
            "NOT_FOUND", "This item is unavailable or you do not have access.", 404
        )
    return records[0]


async def catalog(current, kind, profile=None):
    profile = profile if profile is not None else await student_core(current)
    repo = current.repo
    if kind == "mentorship":
        records, directory = await gather(
            repo.rows("mentor_profiles"),
            repo.rpc("workspace_directory", {"p_kind": "mentors"}),
        )
        names = {v["user_id"]: v for v in directory}
        records = [
            {
                **r,
                **names[r["user_id"]],
                "id": r["user_id"],
                "title": names[r["user_id"]]["full_name"],
                "description": r.get("bio"),
                "tags": list(dict.fromkeys(r["expertise"] + r.get("skills", []))),
            }
            for r in records
            if r["user_id"] in names
        ]
    elif kind == "opportunities":
        records, organizations, saved_rows, applied_rows = await gather(
            repo.rows(kind, order="created_at.desc"),
            repo.rows("organizations"),
            repo.rows("saved_opportunities", user_id=f"eq.{current.id}"),
            repo.rows("applications", student_id=f"eq.{current.id}"),
        )
    elif kind in ("projects", "communities"):
        records, memberships = await gather(
            repo.rows(kind, order="created_at.desc"),
            repo.rows(
                "project_members" if kind == "projects" else "community_members",
                user_id=f"eq.{current.id}",
                status="eq.active",
            ),
        )
    elif kind == "events":
        records, registration_rows = await gather(
            repo.rows(kind, order="created_at.desc"),
            repo.rows("event_registrations", user_id=f"eq.{current.id}"),
        )
    else:
        records = await repo.rows(kind, order="created_at.desc")
    if kind == "opportunities":
        records = [r for r in records if eligible(r)]
        orgs = {r["id"]: r for r in organizations}
        saved = {r["opportunity_id"] for r in saved_rows}
        applied = {r["opportunity_id"] for r in applied_rows}
        records = [
            {
                **r,
                "organization": orgs.get(r["organization_id"], {}).get(
                    "name", "Organization"
                ),
                "saved": r["id"] in saved,
                "applied": r["id"] in applied,
            }
            for r in records
        ]
    if kind in ("projects", "communities"):
        field = "project_id" if kind == "projects" else "community_id"
        joined = {r[field] for r in memberships}
        records = [
            {
                **r,
                "title": r.get("title", r.get("name")),
                "joined": r["id"] in joined,
                "show_on_profile": next(
                    (
                        m.get("show_on_profile", False)
                        for m in memberships
                        if m[field] == r["id"]
                    ),
                    False,
                ),
            }
            for r in records
        ]
        project_tasks = (
            await repo.rows("project_tasks") if kind == "projects" and joined else []
        )
        for record in records:
            if kind == "projects" and record["joined"]:
                tasks = [t for t in project_tasks if t["project_id"] == record["id"]]
                record["tasks"] = tasks
                record["completed_tasks"] = sum(t["status"] == "done" for t in tasks)
                record["total_tasks"] = len(tasks)
                record["progress"] = (
                    round(100 * record["completed_tasks"] / len(tasks)) if tasks else 0
                )
    if kind == "events":
        registrations = {
            r["event_id"]
            for r in registration_rows
        }
        records = [
            {**r, "registered": r["id"] in registrations}
            for r in records
            if r["status"] == "published"
        ]
    if kind in ("projects", "communities", "events") and records:
        counts = {
            r["entity_id"]: r["member_count"]
            for r in await repo.rpc(
                "workspace_stats", {"p_kind": kind, "p_ids": [r["id"] for r in records]}
            )
        }
        records = [{**r, "member_count": counts.get(r["id"], 0)} for r in records]
    return rank(profile, records)


async def applications(current):
    records, opportunity_rows, organization_rows = await gather(
        current.repo.rows(
            "applications",
            **({"student_id": f"eq.{current.id}"} if current.role == "student" else {}),
            order="updated_at.desc",
        ),
        current.repo.rows("opportunities"),
        current.repo.rows("organizations"),
    )
    names = (
        {
            r["application_id"]: r["full_name"]
            for r in await current.repo.rpc("eco_applicants", {})
        }
        if current.role != "student"
        else {}
    )
    opportunities = {r["id"]: r for r in opportunity_rows}
    organizations = {
        r["id"]: r["name"] for r in organization_rows
    }
    return [
        {
            **r,
            "full_name": names.get(r["id"]),
            "title": opportunities.get(r["opportunity_id"], {}).get(
                "title", "Opportunity no longer available"
            ),
            "organization": organizations.get(
                opportunities.get(r["opportunity_id"], {}).get("organization_id"),
                "Organization",
            ),
        }
        for r in records
    ]
