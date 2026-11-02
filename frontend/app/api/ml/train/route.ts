import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dataset_id, target_column, task_type, estimator, features, test_size, random_seed, workspace_id } = body || {};

    if (!dataset_id || typeof dataset_id !== "string") {
      return createErrorResponse("INVALID_INPUT", "Dataset ID is required.", 400);
    }
    if (!target_column || typeof target_column !== "string") {
      return createErrorResponse("INVALID_INPUT", "Target column is required.", 400);
    }
    if (!task_type || !["classification", "regression"].includes(task_type)) {
      return createErrorResponse("INVALID_INPUT", "Task type must be 'classification' or 'regression'.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id,
        target_column,
        task_type,
        estimator: estimator || "random_forest_classifier",
        features: features || null,
        test_size: test_size || 0.2,
        random_seed: random_seed || 42,
        workspace_id: workspace_id || "default-workspace",
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    return createErrorResponse("BACKEND_UNAVAILABLE", "ML training service is currently unreachable.", 503);
  }
}
