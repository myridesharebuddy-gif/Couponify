export const normalizeDomain = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

export const normalizeWebsite = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only http(s) schemes are supported');
    }
    return url.toString();
  } catch (error) {
    throw new Error(`Invalid website URL: ${(error as Error).message}`);
  }
};

export const isLikelyValidDomain = (domain: string) => {
  if (!domain) return false;
  if (domain.includes(' ')) return false;
  const normalized = domain.toLowerCase();
  if (!normalized.includes('.')) return false;
  if (!/[a-z]/.test(normalized)) return false;
  if (/[^a-z0-9.-]/.test(normalized)) return false;
  const parts = normalized.split('.');
  return parts.every((part) => part.length > 0);
};
