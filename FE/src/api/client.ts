export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let getToken: () => string | null = () => null;

export function setTokenProvider(provider: () => string | null): void {
  getToken = provider;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

const baseUrl: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

async function parseErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}.`;
  try {
    const problem = (await response.json()) as {
      detail?: unknown;
      title?: unknown;
      errors?: unknown;
    };
    if (problem.errors && typeof problem.errors === 'object') {
      const messages = Object.values(problem.errors as Record<string, unknown>)
        .flat()
        .filter((message): message is string => typeof message === 'string');
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    if (typeof problem.detail === 'string' && problem.detail) {
      return problem.detail;
    }
    if (typeof problem.title === 'string' && problem.title) {
      return problem.title;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'Unable to reach the server. Please try again.');
  }

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, 'Received an unexpected response from the server.');
  }
}
