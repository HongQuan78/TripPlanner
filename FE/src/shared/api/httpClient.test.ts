import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiError';
import { HttpClient } from './httpClient';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let client: HttpClient;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  client = new HttpClient('');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('HttpClient.request', () => {
  it('returns parsed JSON on a 200 response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'ok' }));

    const result = await client.request<{ message: string }>('/api/test');

    expect(result).toEqual({ message: 'ok' });
  });

  it('throws ApiError with the ProblemDetails detail on a 400 response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { title: 'Bad Request', detail: 'Email is invalid.', status: 400 }),
    );

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe('Email is invalid.');
  });

  it('falls back to the ProblemDetails title when detail is absent', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { title: 'Not Found', status: 404 }));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('Not Found');
  });

  it('uses a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe('Request failed with status 500.');
  });

  it('throws ApiError with status 0 on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it('returns undefined for a 204 response without reading a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await client.request<void>('/api/test', { method: 'DELETE' });

    expect(result).toBeUndefined();
  });

  it('attaches a bearer token when the token provider returns one', async () => {
    client.setTokenProvider(() => 'abc123');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await client.request('/api/test');

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('does not attach an Authorization header without a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await client.request('/api/test');

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('sends a JSON content type and serialized body for requests with a body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await client.request('/api/test', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }) });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c' }));
  });

  it('returns undefined for a 200 response with an empty body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const result = await client.request<void>('/api/auth/logout', { method: 'POST' });

    expect(result).toBeUndefined();
  });

  it('throws ApiError when a success response body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 200 }));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(200);
  });

  it('rethrows abort errors without wrapping them in ApiError', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as DOMException).name).toBe('AbortError');
  });

  it('flattens the validation errors dictionary into the ApiError message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { Email: ['Email is required.'], Password: ['Password is too short.'] },
      }),
    );

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Email is required. Password is too short.');
  });

  it('falls back to a generic message when detail and title are not strings', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: { nested: true }, title: 42 }));

    const error = await client.request('/api/test').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Request failed with status 400.');
  });

  it('invokes the onUnauthorized handler on a 401 response', async () => {
    const handler = vi.fn();
    client.setOnUnauthorized(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { title: 'Unauthorized', status: 401 }));

    const error = await client.request('/api/trips').catch((e: unknown) => e);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  it('does not invoke the onUnauthorized handler for other error statuses', async () => {
    const handler = vi.fn();
    client.setOnUnauthorized(handler);
    fetchMock.mockResolvedValue(jsonResponse(404, { title: 'Not Found', status: 404 }));

    await client.request('/api/trips').catch(() => {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('prefixes requests with the configured base URL, normalizing trailing slashes', async () => {
    const configured = new HttpClient('http://api.example.com/');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await configured.request('/api/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.example.com/api/test');
  });

  it('issues relative same-origin requests when the base URL is empty', async () => {
    const relative = new HttpClient('');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await relative.request('/api/test');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/test');
  });
});

describe('HttpClient default base URL', () => {
  it('falls back to VITE_API_BASE_URL when no base URL is passed', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.com/');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await new HttpClient().request('/api/test');

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.example.com/api/test');
  });

  it('issues relative same-origin requests when VITE_API_BASE_URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await new HttpClient().request('/api/test');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/test');
  });

  it('issues relative same-origin requests when VITE_API_BASE_URL is undefined', async () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined as unknown as string);
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await new HttpClient().request('/api/test');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/test');
  });
});
