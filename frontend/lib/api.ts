const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

async function parseErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // response had no JSON body
  }
  return `API request failed for ${path} with status ${response.status}`;
}

export async function fetchFromApi<T>(path: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

export async function postToApi<T>(path: string, payload: unknown): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

export async function patchToApi<T>(path: string, payload: unknown): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

export async function deleteFromApi(path: string): Promise<void> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, path));
  }
}
