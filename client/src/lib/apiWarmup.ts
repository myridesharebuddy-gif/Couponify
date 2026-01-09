import { getApiBaseUrl } from '../config/apiBase';

export type WarmupOptions = {
  timeoutMs?: number;
};

export const warmupApi = async ({ timeoutMs = 1500 }: WarmupOptions = {}) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
