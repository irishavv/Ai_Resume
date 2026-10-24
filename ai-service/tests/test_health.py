"""Health and banner endpoint tests."""

from __future__ import annotations


def test_health_reports_the_mock_provider(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"
    assert body["provider"] == "mock"
    assert body["model"]
    assert body["time"]


def test_banner_lists_endpoints(client):
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["name"]
    assert body["version"]
    assert "POST /ai/chat/stream" in body["endpoints"]


def test_openapi_schema_is_served(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/ai/chat/stream" in response.json()["paths"]
