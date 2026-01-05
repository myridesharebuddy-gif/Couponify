import Constants from 'expo-constants';

const PRODUCTION_BASE = 'https://api.couponify.app';

const normalizeUrl = (value: string) => {
  let trimmed = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }
  return trimmed;
};

const extractHostFromUri = (uri: string) => {
  const cleaned = uri.trim();
  if (!cleaned) {
    return null;
  }
  const [host] = cleaned.split(':');
  if (!host) {
    return null;
  }
  return host;
};

const deriveDevBaseUrl = () => {
  if (!__DEV__) {
    return PRODUCTION_BASE;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost ??
    '';
  if (!hostUri) {
    return null;
  }
  const host = extractHostFromUri(hostUri);
  if (!host) {
    return null;
  }
  return normalizeUrl(`${host}:4000`);
};

let cachedBaseUrl: string | null | undefined;

export const getApiBaseUrl = () => {
  if (cachedBaseUrl !== undefined) {
    return cachedBaseUrl;
  }
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    cachedBaseUrl = normalizeUrl(explicit);
  } else {
    const derived = deriveDevBaseUrl();
    cachedBaseUrl = derived;
  }
  console.log('[api] baseUrl', cachedBaseUrl ?? 'not configured');
  return cachedBaseUrl;
};
