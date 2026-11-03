import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse("INVALID_INPUT", "Request body must be valid JSON.", 400);
    }
    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return createErrorResponse("INVALID_INPUT", "A JSON object is required.", 400);
  }

  const input = body as Record<string, unknown>;
  const { prompt, user_consent, dataset_id, max_tokens } = input;

  if (user_consent !== true) {
    return createErrorResponse(
      "CONSENT_REQUIRED",
      "Explicit user consent is required before processing data context with AI services.",
      400
    );
  }

  if (typeof prompt !== "string" || prompt.trim().length < 2 || prompt.length > 1000) {
    return createErrorResponse("INVALID_INPUT", "Prompt must contain between 2 and 1000 characters.", 400);
  }

  if (dataset_id !== undefined && dataset_id !== null && (typeof dataset_id !== "string" || !dataset_id.trim())) {
    return createErrorResponse("INVALID_INPUT", "dataset_id must be a non-empty string when provided.", 400);
  }

  if (max_tokens !== undefined && (typeof max_tokens !== "number" || !Number.isInteger(max_tokens) || max_tokens < 50 || max_tokens > 1000)) {
    return createErrorResponse("INVALID_INPUT", "max_tokens must be an integer from 50 to 1000.", 400);
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${getBackendUrl()}/api/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        user_consent: true,
        dataset_id: typeof dataset_id === "string" ? dataset_id.trim() : null,
        max_tokens: max_tokens ?? 500,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return createErrorResponse("BACKEND_UNAVAILABLE", "AI compute service is currently unreachable.", 503);
    }
    throw error;
  }

  let data: unknown;
  try {
    data = await backendRes.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse("BACKEND_INVALID_RESPONSE", "AI compute service returned an invalid response.", 502);
    }
    throw error;
  }

  return Response.json(data, { status: backendRes.status });
}
