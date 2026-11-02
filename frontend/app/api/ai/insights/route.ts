import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, user_consent, dataset_id, max_tokens } = body || {};

    if (!user_consent) {
      return createErrorResponse(
        "CONSENT_REQUIRED",
        "Explicit user consent is required before processing data context with AI services.",
        400
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 2) {
      return createErrorResponse("INVALID_INPUT", "A prompt of at least 2 characters is required.", 400);
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        user_consent: true,
        dataset_id: dataset_id || null,
        max_tokens: Math.min(Number(max_tokens) || 500, 1000),
      }),
    });

    const data = await backendRes.json();
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    return createErrorResponse("BACKEND_UNAVAILABLE", "AI compute service is currently unreachable.", 503);
  }
}
