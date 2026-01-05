import fs from 'fs';
import path from 'path';

export type RssConfigEntry = {
  label: string;
  feeds: string[];
  confidence?: number;
};

export type AffiliateImportConfig = {
  id: string;
  label: string;
  type: 'url' | 'file';
  url: string;
  format: 'csv' | 'json';
  mapping: {
    store: string;
    domain: string;
    deal: string;
    code: string;
    sourceUrl: string;
  };
};

export type PartnerConfig = {
  enabled: boolean;
  apiKey: string;
};

export type SourcesConfig = {
  refreshMinutes: number;
  enabled: Record<string, boolean>;
  rss: Record<string, RssConfigEntry>;
  affiliateFeeds: {
    enabled: boolean;
    imports: AffiliateImportConfig[];
  };
  brandPromoPages: {
    enabled: boolean;
    domains: string[];
  };
  partnerSources: {
    retailmenot: PartnerConfig;
    honey: PartnerConfig;
  };
};

const DEFAULT_CONFIG: SourcesConfig = {
  refreshMinutes: 30,
  enabled: {},
  rss: {},
  affiliateFeeds: {
    enabled: false,
    imports: []
  },
  brandPromoPages: {
    enabled: false,
    domains: []
  },
  partnerSources: {
    retailmenot: { enabled: false, apiKey: '' },
    honey: { enabled: false, apiKey: '' }
  }
};

const CONFIG_PATH = path.resolve(__dirname, '../../sources.config.json');

const loadConfig = (): SourcesConfig => {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      enabled: { ...DEFAULT_CONFIG.enabled, ...(parsed.enabled ?? {}) },
      rss: { ...parsed.rss },
      affiliateFeeds: {
        ...DEFAULT_CONFIG.affiliateFeeds,
        ...(parsed.affiliateFeeds ?? {})
      },
      brandPromoPages: {
        ...DEFAULT_CONFIG.brandPromoPages,
        ...(parsed.brandPromoPages ?? {})
      },
      partnerSources: {
        retailmenot: {
          ...DEFAULT_CONFIG.partnerSources.retailmenot,
          ...(parsed.partnerSources?.retailmenot ?? {})
        },
        honey: {
          ...DEFAULT_CONFIG.partnerSources.honey,
          ...(parsed.partnerSources?.honey ?? {})
        }
      }
    };
  } catch (error) {
    console.warn('Failed to load sources config; falling back to defaults', error);
    return DEFAULT_CONFIG;
  }
};

export const sourcesConfig: SourcesConfig = loadConfig();

export const getPublicSourcesConfig = () => {
  const { partnerSources, ...rest } = sourcesConfig;
  const sanitizedPartners = {
    retailmenot: {
      ...partnerSources.retailmenot,
      apiKey: partnerSources.retailmenot.apiKey ? '***' : ''
    },
    honey: {
      ...partnerSources.honey,
      apiKey: partnerSources.honey.apiKey ? '***' : ''
    }
  };
  return {
    ...rest,
    partnerSources: sanitizedPartners
  };
};
