export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw new APIError(
      response.status,
      json.message || `Request failed (${response.status})`,
      json.errors,
    );
  }
  return json as T;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return (await request<{ data: T }>(path, method, body, signal))?.data;
}
export function errorText(error: unknown): string {
  if (error instanceof APIError && Object.keys(error.fields).length)
    return Object.entries(error.fields)
      .map(([key, values]) => `${key}: ${values.join(", ")}`)
      .join("\n");
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
