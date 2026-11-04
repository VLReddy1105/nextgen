from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import actor


@pytest.mark.parametrize('role', ['student', 'mentor', 'company', 'university', 'founder'])
def test_support_binds_report_to_authenticated_actor_and_rejects_spoofing(role):
    writes = []

    class Repo:
        async def insert(self, table, row):
            writes.append((table, row))
            return {'id': 'report-id', **row}

    app.dependency_overrides[actor] = lambda: SimpleNamespace(id='verified-user', role=role, repo=Repo())
    try:
        client = TestClient(app)
        body = {'category': 'support', 'subject': 'Help needed', 'message': 'Please help with my workspace.'}
        response = client.post('/api/v1/support/reports', json=body)
        assert response.status_code == 201
        assert writes == [('support_reports', {'user_id': 'verified-user', **body})]
        assert client.post('/api/v1/support/reports', json={**body, 'user_id': 'victim'}).status_code == 422
        assert client.post('/api/v1/support/reports', json={**body, 'subject': ' '}).status_code == 422
        assert len(writes) == 1
    finally:
        app.dependency_overrides.clear()


def test_support_requires_authentication():
    response = TestClient(app).post('/api/v1/support/reports', json={
        'category': 'support', 'subject': 'Help needed', 'message': 'Please help with my workspace.'
    })
    assert response.status_code == 401
