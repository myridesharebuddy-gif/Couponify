const CLEAN_REGEX = /[^a-z0-9\s]/g;
const MULTIPLE_SPACE_REGEX = /\s+/g;

export const normalizeStoreKey = (value?: string) => {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/’/g, "'")
    .replace(CLEAN_REGEX, ' ')
    .replace(MULTIPLE_SPACE_REGEX, ' ')
    .trim();
};

export const slugifyStoreKey = (value: string) =>
  normalizeStoreKey(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
