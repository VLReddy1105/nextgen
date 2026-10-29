"""Mentor projections over existing, caller-authorized relationships only."""
from app.core.errors import require
from app.matching.rank import tags
from app.services.concurrency import gather


async def mentor_workspace(current, projects=()):
    require(current.role == "mentor")
    profiles, connections = await gather(
        current.repo.rows("mentor_profiles", user_id=f"eq.{current.id}"),
        current.repo.rpc("eco_connections", {}),
    )
    profile = {**(profiles[0] if profiles else {}),
               "full_name": current.profile.get("full_name", "")}
    own = tags((profile.get("skills") or []) + (profile.get("expertise") or []))
    # Never query the Student directory: this RPC projects only existing relations.
    authorized = [c for c in connections if c.get("mentor_id") == current.id]
    matches = []
    for connection in authorized:
        shared = sorted(own & tags(connection.get("skills") or []))
        if shared and connection["status"] in ("requested", "accepted"):
            matches.append({**connection, "matched_skills": shared})
    matches.sort(key=lambda c: (-len(c["matched_skills"]), c["student_id"]))
    missing = [label for label, value in (
        ("Professional headline", profile.get("headline")),
        ("Bio", profile.get("bio")),
        ("Skills or expertise", own),
    ) if not value or (isinstance(value, str) and not value.strip())]
    project_matches = {}
    for project in projects:
        if not project.get("joined") or project.get("my_role") != "project_head":
            continue
        project_skills = tags(project.get("tags") or [])
        candidates = []
        for connection in authorized:
            shared = sorted(project_skills & tags(connection.get("skills") or []))
            if shared and connection["status"] == "accepted":
                candidates.append({**connection, "matched_skills": shared})
        project_matches[project["id"]] = sorted(candidates, key=lambda c: (-len(c["matched_skills"]), c["student_id"]))
    return {"project_matches": project_matches, "profile": profile, "connections": authorized,
            "recommended_students": matches, "profile_missing": missing}
