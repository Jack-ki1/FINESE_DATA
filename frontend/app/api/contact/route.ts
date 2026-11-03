import { createErrorResponse, getBackendUrl } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message, website_url } = body || {};

    // 1. Honeypot check
    if (website_url) {
      return createErrorResponse("SPAM_DETECTED", "Spam activity detected.", 400);
    }

    // 2. Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return createErrorResponse("INVALID_INPUT", "A valid name is required.", 400);
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return createErrorResponse("INVALID_INPUT", "A valid email address is required.", 400);
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return createErrorResponse("INVALID_INPUT", "Message must be at least 10 characters.", 400);
    }

    // 3. Delegate to Backend or handle locally
    const backendRes = await fetch(`${getBackendUrl()}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
    });
    let data: unknown;
    try {
      data = await backendRes.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse("BACKEND_INVALID_RESPONSE", "Contact service returned an invalid response.", 502);
      }
      throw error;
    }
    return Response.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof TypeError) {
      return createErrorResponse("BACKEND_UNAVAILABLE", "Contact delivery service is currently unreachable.", 503);
    }
    if (error instanceof SyntaxError) {
      return createErrorResponse("INVALID_INPUT", "Request body must be valid JSON.", 400);
    }
    throw error;
  }
}
