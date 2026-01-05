import { getApiBaseUrl } from '../config/apiBase';

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY = 500;

type ApiFailureKind = 'NETWORK_UNAVAILABLE' | 'HTTP_ERROR' | 'API_UNCONFIGURED';

type ApiSuccess<T> = {
  ok: true;
  data: T;
  status: number;
  url: string;
};

type ApiFailure = {
  ok: false;
  data: null;
  status?: number;
  url: string;
  error: ApiFailureKind;
  message?: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = getApiBaseUrl();
  if (!base) {
    return null;
  }
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const attemptFetch = async <T>(
  url: string,
  options: RequestInit,
  attempt: number
): Promise<ApiResult<T>> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload: T | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as T;
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      if (__DEV__ && attempt === MAX_RETRIES) {
        console.warn('[apiClient] HTTP error', response.status, url);
      }
      return {
        ok: false,
        data: null,
        status: response.status,
        url,
        error: 'HTTP_ERROR',
        message:
          payload && typeof payload === 'object' && 'message' in payload
            ? (payload as any).message
            : text
      };
    }
    return {
      ok: true,
      data: (payload ?? ({} as T)) as T,
      status: response.status,
      url
    };
  } catch (error: unknown) {
    if (attempt < MAX_RETRIES) {
      await delay(BASE_RETRY_DELAY * Math.pow(2, attempt));
      return attemptFetch(url, options, attempt + 1);
    }
    const message = error instanceof Error ? error.message : 'Network request failed';
    if (__DEV__) {
      console.warn('[apiClient] network failure', message, url);
    }
    return {
      ok: false,
      data: null,
      url,
      error: 'NETWORK_UNAVAILABLE',
      message
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const apiClient = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> => {
  const url = buildUrl(path);
  if (!url) {
    return {
      ok: false,
      data: null,
      url: path,
      error: 'API_UNCONFIGURED',
      message:
        'API base URL is not configured. Export EXPO_PUBLIC_API_BASE_URL or run `npm run set:dev-ip` to write it into client/.env (e.g. http://192.168.4.27:4000).'
    };
  }
  return attemptFetch(url, options, 0);
};
