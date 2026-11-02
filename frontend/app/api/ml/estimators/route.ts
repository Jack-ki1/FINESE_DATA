import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/ml/estimators`);
    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    return createErrorResponse("BACKEND_UNAVAILABLE", "ML service is currently unreachable.", 503);
  }
}
