import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { job_type, dataset_id, parameters, workspace_id } = body || {};

    if (!job_type || typeof job_type !== "string") {
      return createErrorResponse("INVALID_INPUT", "Job type is required.", 400);
    }
    if (!dataset_id || typeof dataset_id !== "string") {
      return createErrorResponse("INVALID_INPUT", "Dataset ID is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_type,
        dataset_id,
        parameters: parameters || {},
        workspace_id: workspace_id || "default-workspace",
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Job compute service is currently unreachable.", 503);
    throw error;
  }
}
