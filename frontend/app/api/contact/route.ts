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
    const backendUrl = getBackendUrl();
    try {
      const backendRes = await fetch(`${backendUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        return Response.json(data);
      }
    } catch {
      // Backend unavailable; process safe local validation response
    }

    return Response.json({
      status: "success",
      message: "Contact request validated successfully.",
      delivered: false,
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to process contact request.", 500);
  }
}
