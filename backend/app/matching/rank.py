from datetime import datetime, timezone


def tags(values):
    aliases = {
        "postgres": "postgresql",
        "js": "javascript",
        "ai/ml": "machine learning",
        "backend development": "backend",
    }
    return {
        aliases.get(v.strip().casefold(), v.strip().casefold())
        for v in values
        if v.strip()
    }


def match(profile, candidate):
    signals = [
        (
            50,
            tags(profile.get("skills", [])),
            tags(candidate.get("tags", candidate.get("expertise", []))),
        ),
        (
            20,
            tags(
                profile.get("interests", [])
                + profile.get("project_interests", [])
                + profile.get("community_interests", [])
                + profile.get("career_interests", [])
            ),
            tags(candidate.get("interests", [])),
        ),
        (
            15,
            tags(profile.get("preferred_roles", [])),
            tags(candidate.get("roles", [])),
        ),
        (
            10,
            tags(
                profile.get("preferred_locations", []) + [profile.get("work_mode", "")]
            ),
            tags([candidate.get("location", ""), candidate.get("work_mode", "")]),
        ),
        (
            5,
            set(profile.get("university_ids", [])),
            {candidate["university_id"]} if candidate.get("university_id") else set(),
        ),
    ]
    total = sum(weight for weight, _, required in signals if required)
    points = sum(
        weight * len(own & required) / len(required)
        for weight, own, required in signals
        if required
    )
    shared = sorted(signals[0][1] & signals[0][2])
    return {
        "score": round(100 * points / total) if total else 0,
        "matched_skills": shared,
        "reasons": [f"Matches {skill}" for skill in shared],
    }


def eligible(item, now=None):
    now = now or datetime.now(timezone.utc)
    if item.get("status", "published") not in ("published", "active", "planning"):
        return False
    deadline = item.get("deadline")
    return not deadline or datetime.fromisoformat(deadline.replace("Z", "+00:00")) > now


def rank(profile, records):
    return sorted(
        [{**r, "match": match(profile, r)} for r in records],
        key=lambda r: (-r["match"]["score"], r.get("id", r.get("user_id", ""))),
    )
