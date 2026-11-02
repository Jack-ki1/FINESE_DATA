import time

def test_job_submission_and_status(client):
    csv_data = "x,y\n1,10\n2,20\n3,30\n"
    up_res = client.post("/api/uploads/direct?filename=job_data.csv", content=csv_data.encode("utf-8"))
    ds_id = up_res.json()["dataset_id"]

    submit_res = client.post("/api/jobs", json={
        "job_type": "profile",
        "dataset_id": ds_id,
        "parameters": {"dataset_id": ds_id},
    })
    assert submit_res.status_code == 200
    job_id = submit_res.json()["job_id"]

    # Poll status (worker runs async)
    time.sleep(0.1)
    status_res = client.get(f"/api/jobs/{job_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] in ("pending", "running", "completed")

def test_job_cancellation(client):
    csv_data = "x,y\n1,10\n"
    up_res = client.post("/api/uploads/direct?filename=cancel_test.csv", content=csv_data.encode("utf-8"))
    ds_id = up_res.json()["dataset_id"]

    submit_res = client.post("/api/jobs", json={
        "job_type": "profile",
        "dataset_id": ds_id,
        "parameters": {"dataset_id": ds_id},
    })
    job_id = submit_res.json()["job_id"]

    cancel_res = client.post(f"/api/jobs/{job_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
