def test_supervised_classification_pipeline(client):
    # Create synthetic dataset with target and features
    rows = ["feature1,feature2,target"]
    for i in range(40):
        target = "High" if i % 2 == 0 else "Low"
        f1 = i * 2.5
        f2 = "catA" if i % 3 == 0 else "catB"
        rows.append(f"{f1},{f2},{target}")
    csv_str = "\n".join(rows) + "\n"

    up_res = client.post("/api/uploads/direct?filename=ml_class.csv", content=csv_str.encode("utf-8"))
    ds_id = up_res.json()["dataset_id"]

    train_res = client.post("/api/ml/train", json={
        "dataset_id": ds_id,
        "target_column": "target",
        "task_type": "classification",
        "estimator": "random_forest_classifier",
        "test_size": 0.25,
        "random_seed": 42,
    })
    assert train_res.status_code == 200
    res = train_res.json()
    assert res["task_type"] == "classification"
    assert "accuracy" in res["metrics"]
    assert "baseline_metrics" in res
    assert "accuracy" in res["baseline_metrics"]
    assert res["model_artifact_id"] is not None

def test_supervised_regression_pipeline(client):
    rows = ["area,rooms,price"]
    for i in range(30):
        area = 50 + i * 5
        rooms = 1 + (i % 4)
        price = area * 1000 + rooms * 5000
        rows.append(f"{area},{rooms},{price}")
    csv_str = "\n".join(rows) + "\n"

    up_res = client.post("/api/uploads/direct?filename=ml_reg.csv", content=csv_str.encode("utf-8"))
    ds_id = up_res.json()["dataset_id"]

    train_res = client.post("/api/ml/train", json={
        "dataset_id": ds_id,
        "target_column": "price",
        "task_type": "regression",
        "estimator": "linear_regression",
        "test_size": 0.2,
        "random_seed": 42,
    })
    assert train_res.status_code == 200
    res = train_res.json()
    assert res["task_type"] == "regression"
    assert "r2" in res["metrics"]
    assert "baseline_metrics" in res
    assert res["metrics"]["r2"] > 0.8
