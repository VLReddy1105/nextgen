def completion(profile):
    checks = [
        (
            "about",
            "Basic information",
            bool(profile.get("full_name") and profile.get("headline")),
        ),
        (
            "education",
            "Education",
            bool(profile.get("degree_level") and profile.get("field_of_study")),
        ),
        ("verification", "Email verification", bool(profile.get("email_verified"))),
        ("skills", "Skills", bool(profile.get("skills"))),
        (
            "career",
            "Career preferences",
            bool(profile.get("preferred_roles") and profile.get("availability")),
        ),
        (
            "experience",
            "Experience status",
            bool(
                profile.get("no_experience")
                or profile.get("experience_entries")
                or profile.get("experience")
            ),
        ),
        (
            "certifications",
            "Certification status",
            bool(
                profile.get("no_certifications")
                or profile.get("certification_entries")
                or profile.get("certifications")
            ),
        ),
    ]
    return {
        "percent": round(sum(done for _, _, done in checks) / len(checks) * 100),
        "checklist": [
            {
                "id": key,
                "label": label,
                "done": done,
                "href": f"/dashboard/profile?section={key}",
            }
            for key, label, done in checks
        ],
    }


async def student_core(actor):
    rows = await actor.repo.rows("student_details", profile_id=f"eq.{actor.id}")
    details = rows[0] if rows else {}
    memberships = await actor.repo.rows(
        "university_student_memberships",
        student_user_id=f"eq.{actor.id}",
        status="eq.active",
    )
    projects = await actor.repo.rows(
        "project_members", user_id=f"eq.{actor.id}", status="eq.active"
    )
    profile = {
        **details.get("workspace_profile", {}),
        **details,
        "institution": details.get("workspace_profile", {}).get("institution")
        or details.get("university")
        or "",
        "skills": details.get("skills") or [],
        "interests": details.get("interests") or [],
        "id": actor.id,
        "full_name": actor.profile.get("full_name") or "",
        "headline": actor.profile.get("headline") or "",
        "avatar_url": actor.profile.get("avatar_url"),
        "email": actor.email,
        "primary_role": actor.role,
        "email_verified": True,
        "account_status": "active",
        "university_ids": [m["university_id"] for m in memberships],
        "memberships": memberships,
        "projects": projects,
    }
    profile["completion"] = completion(profile)
    return profile
