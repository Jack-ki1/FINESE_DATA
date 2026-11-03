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
    const backendRes = await fetch(`${backendUrl}/api/datasets/${encodeURIComponent(id)}/export`);
    
    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      return createErrorResponse(errorData.error?.code || "EXPORT_FAILED", errorData.error?.message || "Export failed.", backendRes.status);
    }

    // Return the CSV file directly
    const csvContent = await backendRes.text();
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dataset_${id}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) return createErrorResponse("BACKEND_UNAVAILABLE", "Dataset export service is currently unreachable.", 503);
    throw error;
  }
}
