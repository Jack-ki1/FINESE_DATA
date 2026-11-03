import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per backend.md

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, content_type, byte_size, workspace_id } = body || {};

    if (!filename || typeof filename !== "string") {
      return createErrorResponse("INVALID_INPUT", "Filename is required.", 400);
    }
    if (!byte_size || typeof byte_size !== "number" || byte_size <= 0) {
      return createErrorResponse("INVALID_INPUT", "Valid byte size is required.", 400);
    }
    if (byte_size > MAX_BYTES) {
      return createErrorResponse("FILE_TOO_LARGE", `File exceeds the 10 MB limit (${byte_size} bytes).`, 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/uploads/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: filename.trim(),
        content_type: content_type || "text/csv",
        byte_size,
        workspace_id: workspace_id || "default-workspace",
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Upload authorization service is currently unreachable.", 503);
    throw error;
  }
}
