import { Platform } from 'react-native';

const DEFAULT_TIMEOUT_MS = 10_000;

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

function resolveApiBaseUrl(): string {
  if (
    Platform.OS === 'web' &&
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return configuredApiUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
interface RequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
}
interface ApiErrorBody {
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) throw new ApiError('API URL is not configured.', null);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const response = await fetch(
      `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
      {
        method,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...options.headers,
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      let details: ApiErrorBody | null = null;
      try {
        details = (await response.json()) as ApiErrorBody;
      } catch {
        /* Non-JSON error response. */
      }
      throw new ApiError(
        details?.message ??
          details?.error ??
          response.statusText ??
          'Request failed.',
        response.status,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError')
      throw new ApiError('The request timed out.', null);
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed.',
      null,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('GET', path, options),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ) => request<T>('POST', path, { ...options, body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body'>,
  ) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('DELETE', path, options),
};
