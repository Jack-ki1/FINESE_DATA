import io
import pandas as pd

def test_registration_login_and_me(client):
    registered=client.post("/api/auth/register",json={"email":"User@Example.com","password":"a-long-password","full_name":"Data Analyst"})
    assert registered.status_code==200
    token=registered.json()["access_token"]
    me=client.get("/api/auth/me",headers={"Authorization":f"Bearer {token}"})
    assert me.status_code==200 and me.json()["email"]=="user@example.com"
    login=client.post("/api/auth/login",json={"email":"user@example.com","password":"a-long-password"})
    assert login.status_code==200
    assert client.get("/api/auth/me").status_code==401

def test_workspace_dataset_profile_cleaning_undo_and_exports(client,account):
    headers=account["headers"]
    csv="region,amount,customer\n Nairobi ,100,A\nMombasa,200,B\n Nairobi ,100,A\nKisumu,,C\n"
    up=client.post("/api/datasets/upload",headers=headers,files={"file":("sales.csv",csv,"text/csv")})
    assert up.status_code==200,up.text
    ds=up.json(); dsid=ds["id"]
    assert ds["rows"]==4 and ds["columns"]==3
    prof=client.get(f"/api/datasets/{dsid}/profile",headers=headers).json()
    assert prof["missing_count"]==1 and prof["duplicate_count"]==1
    assert prof["dimensions"]["accuracy"] is None
    cleaned=client.post(f"/api/datasets/{dsid}/clean",headers=headers,json={"operation":"trim","column":"region"})
    assert cleaned.status_code==200,cleaned.text
    assert cleaned.json()["affected"]==2
    undo=client.post(f"/api/datasets/{dsid}/undo",headers=headers)
    assert undo.status_code==200
    exported=client.get(f"/api/datasets/{dsid}/export?format=csv",headers=headers)
    assert exported.status_code==200 and "region" in exported.text
    report=client.get(f"/api/datasets/{dsid}/report?format=html",headers=headers)
    assert report.status_code==200 and "Dataset quality report" in report.text

def test_user_cannot_read_another_users_dataset(client,account):
    headers=account["headers"]
    up=client.post("/api/datasets/upload",headers=headers,files={"file":("a.csv","x,y\n1,2\n3,4\n","text/csv")})
    dsid=up.json()["id"]
    other=client.post("/api/auth/register",json={"email":"other@example.com","password":"another-long-password","full_name":"Other"}).json()
    other_headers={"Authorization":f"Bearer {other['access_token']}"}
    assert client.get(f"/api/datasets/{dsid}",headers=other_headers).status_code==404
    assert client.delete(f"/api/datasets/{dsid}",headers=other_headers).status_code==404

def test_ml_training_saves_inference_artifact(client,account):
    headers=account["headers"]
    df=pd.DataFrame([{"area":50+i*5,"rooms":1+(i%4),"price":(50+i*5)*1000+(1+(i%4))*5000} for i in range(50)])
    buf=io.StringIO();df.to_csv(buf,index=False)
    up=client.post("/api/datasets/upload",headers=headers,files={"file":("houses.csv",buf.getvalue(),"text/csv")})
    assert up.status_code==200,up.text
    dsid=up.json()["id"]
    trained=client.post("/api/ml/train",headers=headers,json={"dataset_id":dsid,"task_type":"regression","target_column":"price","estimator":"random_forest","test_size":0.2,"cv_folds":3})
    assert trained.status_code==200,trained.text
    result=trained.json(); assert "rmse" in result["metrics"] and result["model_status"]=="registered"
    download=client.get(f"/api/models/{result['experiment_id']}/download",headers=headers)
    assert download.status_code==200 and len(download.content)>100
    prediction=client.post(f"/api/models/{result['experiment_id']}/predict",headers=headers,json={"rows":[{"area":120,"rooms":3}]})
    assert prediction.status_code==200 and len(prediction.json()["predictions"])==1

def test_chat_requires_dataset_owner_and_local_mode(client,account):
    headers=account["headers"]
    up=client.post("/api/datasets/upload",headers=headers,files={"file":("simple.csv","sales,region\n10,Nairobi\n20,Mombasa\n30,Nairobi\n","text/csv")})
    dsid=up.json()["id"]
    response=client.post("/api/chat",headers=headers,json={"dataset_id":dsid,"prompt":"Summarize this dataset","share_data_with_ai":False})
    assert response.status_code==200,response.text
    assert response.json()["data_shared_externally"] is False
    assert "rows" in response.json()["answer"].lower()


def test_ml_training_job_completes_and_is_user_scoped(client, account):
    headers = account["headers"]
    rows = ["x,group,target"]
    for i in range(60):
        rows.append(f"{i},{'A' if i % 2 else 'B'},{'yes' if i % 3 else 'no'}")
    up = client.post("/api/datasets/upload", headers=headers, files={"file": ("job.csv", "\n".join(rows), "text/csv")})
    assert up.status_code == 200, up.text
    job = client.post("/api/jobs", headers=headers, json={"request": {"dataset_id": up.json()["id"], "task_type": "classification", "target_column": "target", "estimator": "random_forest", "cv_folds": 3}})
    assert job.status_code == 200, job.text
    status = client.get(f"/api/jobs/{job.json()['job_id']}", headers=headers)
    assert status.status_code == 200
    assert status.json()["status"] == "completed", status.text
    assert status.json()["result"]["experiment_id"]
    other = client.post("/api/auth/register", json={"email": "job-other@example.com", "password": "other-long-password", "full_name": "Other"}).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.get(f"/api/jobs/{job.json()['job_id']}", headers=other_headers).status_code == 404


def test_anthropic_provider_is_used_only_after_explicit_consent(client, account, monkeypatch):
    import httpx
    from backend.app.config import settings
    captured = {}
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "test-anthropic-key")

    class MockAsyncClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return None
        async def post(self, url, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            return httpx.Response(200, request=httpx.Request("POST", url), json={"content": [{"type": "text", "text": "The dataset contains 3 rows."}]})

    monkeypatch.setattr("backend.app.services.ai.httpx.AsyncClient", MockAsyncClient)
    uploaded = client.post("/api/datasets/upload", headers=account["headers"], files={"file": ("ai.csv", "sales,region\n10,Nairobi\n20,Mombasa\n30,Nairobi\n", "text/csv")})
    response = client.post("/api/chat", headers=account["headers"], json={"dataset_id": uploaded.json()["id"], "prompt": "Summarize this dataset", "share_data_with_ai": True, "provider": "anthropic"})
    assert response.status_code == 200, response.text
    assert response.json()["provider"] == settings.ANTHROPIC_MODEL
    assert response.json()["data_shared_externally"] is True
    assert captured["url"] == "https://api.anthropic.com/v1/messages"
    assert captured["headers"]["x-api-key"] == "test-anthropic-key"


def test_html_pdf_and_powerpoint_reports(client, account):
    headers = account["headers"]
    up = client.post("/api/datasets/upload", headers=headers, files={"file": ("reports.csv", "region,revenue\nNairobi,100\nMombasa,80\n", "text/csv")})
    dsid = up.json()["id"]
    for fmt, mime in [("html", "text/html"), ("pdf", "application/pdf"), ("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"), ("json", "application/json")]:
        response = client.get(f"/api/datasets/{dsid}/report?format={fmt}", headers=headers)
        assert response.status_code == 200, (fmt, response.text[:300])
        assert mime in response.headers.get("content-type", "")
        assert len(response.content) > 30
