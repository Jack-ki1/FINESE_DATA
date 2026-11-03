def test_contact_submission_valid(client):
    res = client.post("/api/contact", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "message": "We would like to explore FINESE DATA for sales analytics.",
    })
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "CONTACT_DELIVERY_UNAVAILABLE"

def test_contact_honeypot_triggers_error(client):
    res = client.post("/api/contact", json={
        "name": "Bot Name",
        "email": "bot@example.com",
        "message": "Buy spam products here now!",
        "website_url": "http://spam.example.com",
    })
    assert res.status_code == 400
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "SPAM_DETECTED"

def test_contact_invalid_email(client):
    res = client.post("/api/contact", json={
        "name": "Jane Doe",
        "email": "invalid-email-address",
        "message": "Valid message with at least ten characters.",
    })
    assert res.status_code in (400, 422)
