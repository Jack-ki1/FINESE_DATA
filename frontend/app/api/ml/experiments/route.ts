import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get("workspace_id") || "default-workspace";

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/ml/experiments?workspace_id=${encodeURIComponent(workspace_id)}`);
    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "ML experiments service is currently unreachable.", 503);
    throw error;
  }
}
