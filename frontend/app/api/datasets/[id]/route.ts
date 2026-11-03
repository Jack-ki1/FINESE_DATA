import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return createErrorResponse("INVALID_INPUT", "Dataset ID is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/datasets/${encodeURIComponent(id)}`);
    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Dataset service is currently unreachable.", 503);
    throw error;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return createErrorResponse("INVALID_INPUT", "Dataset ID is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/datasets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Dataset service is currently unreachable.", 503);
    throw error;
  }
}
