import httpx


def test_ai_insights_requires_consent(client):
    res = client.post("/api/ai/insights", json={
        "prompt": "What are the key trends here?",
        "user_consent": False,
    })
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "CONSENT_REQUIRED"

def test_ai_insights_deterministic_summary(client):
    csv_data = "month,units\n2026-01,100\n2026-02,150\n"
    up_res = client.post("/api/uploads/direct?filename=ai_test.csv", content=csv_data.encode("utf-8"))
    ds_id = up_res.json()["dataset_id"]

    res = client.post("/api/ai/insights", json={
        "dataset_id": ds_id,
        "prompt": "Summarize data quality and missing values",
        "user_consent": True,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["computation_verified"] is True
    assert "provenance" in data
    assert "quality" in data["insight"].lower() or "dataset" in data["insight"].lower()


def test_ai_insights_uses_configured_provider_key(client, monkeypatch):
    from backend.app.config import settings

    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-provider-key")
    captured = {}

    class MockAsyncClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            captured["url"] = url
            captured["authorization"] = headers["Authorization"]
            return httpx.Response(200, json={
                "choices": [{"message": {"content": "The dataset summary is ready."}}],
                "usage": {"total_tokens": 12},
            })

    monkeypatch.setattr("backend.app.services.ai_service.httpx.AsyncClient", MockAsyncClient)
    res = client.post("/api/ai/insights", json={
        "prompt": "Summarize this dataset",
        "user_consent": True,
    })

    assert res.status_code == 200
    data = res.json()
    assert data["insight"] == "The dataset summary is ready."
    assert data["model_used"] == "gpt-4o-mini"
    assert data["computation_verified"] is False
    assert captured["authorization"] == "Bearer test-provider-key"
    assert captured["url"] == "https://api.openai.com/v1/chat/completions"
    assert captured["timeout"] == 15.0


def test_ai_insights_surfaces_provider_failure_without_fallback(client, monkeypatch):
    from backend.app.config import settings

    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-provider-key")

    class MockAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            return httpx.Response(429, json={"error": {"message": "provider details"}})

    monkeypatch.setattr("backend.app.services.ai_service.httpx.AsyncClient", MockAsyncClient)
    res = client.post("/api/ai/insights", json={
        "prompt": "Summarize this dataset",
        "user_consent": True,
    })

    assert res.status_code == 502
    assert res.json()["error"]["code"] == "AI_PROVIDER_ERROR"
    assert "provider details" not in res.text


def test_ai_insights_does_not_claim_analysis_without_dataset(client):
    res = client.post("/api/ai/insights", json={
        "prompt": "What are the trends?",
        "user_consent": True,
    })

    assert res.status_code == 200
    data = res.json()
    assert data["computation_verified"] is False
    assert "no data analysis was performed" in data["insight"].lower()
