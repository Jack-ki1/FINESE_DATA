import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return createErrorResponse("INVALID_INPUT", "Dataset ID is required.", 400);
    }

    const body = await req.json();
    const { operation, fill_value } = body || {};

    if (!operation || typeof operation !== "string") {
      return createErrorResponse("INVALID_INPUT", "Operation is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/datasets/${encodeURIComponent(id)}/clean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation,
        fill_value: fill_value || "Unknown",
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Dataset cleaning service is currently unreachable.", 503);
    throw error;
  }
}
