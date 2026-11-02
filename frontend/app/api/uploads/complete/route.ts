import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { upload_id, workspace_id, checksum } = body || {};

    if (!upload_id || typeof upload_id !== "string") {
      return createErrorResponse("INVALID_INPUT", "Upload ID is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/uploads/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_id,
        workspace_id: workspace_id || "default-workspace",
        checksum: checksum || null,
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    return createErrorResponse("BACKEND_UNAVAILABLE", "Dataset registration service is unreachable.", 503);
  }
}
