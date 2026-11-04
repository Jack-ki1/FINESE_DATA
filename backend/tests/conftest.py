import os
from pathlib import Path
import tempfile

ROOT=Path(tempfile.mkdtemp(prefix="finese-tests-"))
os.environ["DATABASE_URL"]=f"sqlite:///{ROOT/'test.db'}"
os.environ["STORAGE_DIR"]=str(ROOT/"storage")
os.environ["ARTIFACTS_DIR"]=str(ROOT/"artifacts")
os.environ["SECRET_KEY"]="test-secret-key-that-is-long-enough-for-local-tests"

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine, init_db

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine); init_db()
    yield

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def account(client):
    response=client.post("/api/auth/register",json={"email":"analyst@example.com","password":"strong-password-123","full_name":"Test Analyst"})
    assert response.status_code==200,response.text
    token=response.json()["access_token"]
    return {"headers":{"Authorization":f"Bearer {token}"},"user":response.json()["user"]}
