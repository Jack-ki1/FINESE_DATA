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
