from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import student
from app.api.routes import opportunities


def test_opportunity_filters_pagination_and_bounded_search(monkeypatch):
    # Explicit test-only dependency override; production admission stays intact.
    app.dependency_overrides[student] = lambda: object()

    async def records(*_):
        return [
            dict(
                id=str(i),
                title="Python internship" if i == 1 else "Java engineer",
                description="",
                organization="Example",
                type="internship" if i == 1 else "job",
                tags=["python"] if i == 1 else ["java"],
                location="Bengaluru",
                work_mode="remote",
                experience="fresher",
                created_at="2026-10-01",
                deadline="2099-01-01",
            )
            for i in (1, 2)
        ]

    monkeypatch.setattr(opportunities, "catalog", records)
    try:
        client = TestClient(app)
        response = client.get(
            "/api/v1/opportunities?type=internship&skill=Python&work_mode=remote&location=bengaluru"
        )
        assert response.status_code == 200
        assert [r["id"] for r in response.json()["items"]] == ["1"]
        assert (
            client.get("/api/v1/opportunities?page=2&limit=1").json()["items"][0]["id"]
            == "2"
        )
        assert client.get("/api/v1/opportunities?limit=101").status_code == 422
        assert client.get("/api/v1/opportunities?q=" + "a" * 161).status_code == 422
        assert (
            client.patch(
                "/api/v1/students/me",
                json={"full_name": "Student", "user_id": "someone-else"},
            ).status_code
            == 422
        )
    finally:
        app.dependency_overrides.clear()
