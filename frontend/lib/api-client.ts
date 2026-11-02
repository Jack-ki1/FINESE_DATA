/**
 * Shared API Client & Error Envelope Utilities
 * Adheres to Section 6 of backend.md:
 * All responses return stable error envelopes: { "error": { "code": "...", "message": "...", "requestId": "..." } }
 */

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  const envelope: ErrorEnvelope = {
    error: {
      code,
      message,
      requestId: crypto.randomUUID(),
      details,
    },
  };
  return new Response(JSON.stringify(envelope), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || "http://127.0.0.1:8000";
}
