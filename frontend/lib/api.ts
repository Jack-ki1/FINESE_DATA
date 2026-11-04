/** Shape returned by the API proxy when a request fails. */
type ErrorPayload = { detail?: unknown; error?: unknown };

/** Minimal dataset descriptor returned by `api/datasets/upload`. */
export type UploadedDataset = {
  id: string;
  name: string;
  format: string;
  rows: number;
  columns: number;
  column_names: string[];
  size_bytes: number;
  created_at: string;
};

/**
 * Calls the backend through the Next.js proxy route.
 *
 * Errors raised by FastAPI arrive as `{detail: "..."}`; anything else is
 * stringified so callers always get a readable `Error` message.
 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/proxy/${path.replace(/^\/+/, "")}`, { ...init, cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const body = typeof payload === "object" && payload !== null ? (payload as ErrorPayload) : null;
    const detail = body ? body.detail ?? body.error : payload;
    throw new Error(String(detail || `Request failed (${response.status})`));
  }
  return payload as T;
}

export async function uploadFile(file: File): Promise<UploadedDataset> {
  const body = new FormData();
  body.append("file", file);
  return api<UploadedDataset>("api/datasets/upload", { method: "POST", body });
}

export function downloadPath(path: string) {
  const a = document.createElement("a");
  a.href = `/api/proxy/${path.replace(/^\/+/, "")}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
