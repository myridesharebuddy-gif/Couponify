const storeAliases = ['Target', 'Walmart', 'Best Buy', 'Amazon', 'Macy’s', 'Walgreens', 'CVS', 'Kohl’s'];

export const detectStore = (text?: string): string | undefined => {
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  for (const alias of storeAliases) {
    if (normalized.includes(alias.toLowerCase())) {
      return alias;
    }
  }
  return undefined;
};

export const detectDiscount = (text?: string): string | undefined => {
  if (!text) return undefined;
  const percentMatch = text.match(/(\d{1,3}%\s*off)/i);
  if (percentMatch) return percentMatch[1];
  const dollarMatch = text.match(/\$\d+(\.\d+)?\s*(off|discount)/i);
  if (dollarMatch) return dollarMatch[0];
  return undefined;
};

export const detectCode = (text?: string): string | undefined => {
  if (!text) return undefined;
  const codeMatch = text.match(/code\s+([A-Za-z0-9]+)/i);
  return codeMatch ? codeMatch[1] : undefined;
};
