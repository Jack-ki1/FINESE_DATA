import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return createErrorResponse("INVALID_INPUT", "Job ID is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/jobs/${encodeURIComponent(id)}`);
    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Job compute service is currently unreachable.", 503);
    throw error;
  }
}
