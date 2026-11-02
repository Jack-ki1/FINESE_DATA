import io

def test_direct_upload_and_profile(client):
    csv_data = "region,units,sales,segment\nNairobi,10,500.0,Retail\nMombasa,15,750.0,Retail\nNairobi,10,500.0,Retail\nKisumu,,300.0,Enterprise\n"
    res = client.post(
        "/api/uploads/direct?filename=test_sales.csv",
        content=csv_data.encode("utf-8"),
        headers={"Content-Type": "text/csv"},
    )
    assert res.status_code == 200
    dataset = res.json()
    assert dataset["name"] == "test_sales.csv"
    assert dataset["row_count"] == 4
    assert dataset["column_count"] == 4
    dataset_id = dataset["dataset_id"]

    # Profile
    p_res = client.get(f"/api/datasets/{dataset_id}/profile")
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["rows"] == 4
    assert p_data["columns"] == 4
    assert p_data["duplicates_count"] == 1
    assert p_data["missing_count"] == 1
    assert 0 <= p_data["quality_score"] <= 100

def test_dataset_cleaning_dedup_and_drop_missing(client):
    csv_data = "name,val\n A ,1\nA,1\nB,\n"
    res = client.post(
        "/api/uploads/direct?filename=clean_test.csv",
        content=csv_data.encode("utf-8"),
    )
    ds_id = res.json()["dataset_id"]

    # Trim whitespace
    trim_res = client.post(f"/api/datasets/{ds_id}/clean", json={"operation": "trim"})
    assert trim_res.status_code == 200
    trimmed_id = trim_res.json()["new_dataset_id"]

    # Drop duplicates
    dedup_res = client.post(f"/api/datasets/{trimmed_id}/clean", json={"operation": "drop-duplicates"})
    assert dedup_res.status_code == 200
    assert dedup_res.json()["affected_count"] == 1

    # Drop missing
    drop_res = client.post(f"/api/datasets/{trimmed_id}/clean", json={"operation": "drop-missing"})
    assert drop_res.status_code == 200
    assert drop_res.json()["rows_remaining"] == 2

def test_csv_export_formula_injection_defense(client):
    csv_data = "formula_test,amount\n=1+1,10\n-cmd,20\nnormal,30\n"
    res = client.post(
        "/api/uploads/direct?filename=formula.csv",
        content=csv_data.encode("utf-8"),
    )
    ds_id = res.json()["dataset_id"]

    export_res = client.get(f"/api/datasets/{ds_id}/export")
    assert export_res.status_code == 200
    exported_csv = export_res.text
    # Check that dangerous leading characters are escaped with single quote
    assert "'=1+1" in exported_csv
    assert "'-cmd" in exported_csv
