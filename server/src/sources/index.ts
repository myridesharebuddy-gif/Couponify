import type { SourceConnector } from './source';
import { createRssSource } from './rssSource';
import { affiliateSource } from './affiliateSource';
import { brandPromoSource } from './brandPromoSource';
import { communitySource } from './communitySource';
import {
  retailmenotSource,
  honeySource,
  xSource,
  threadsSource
} from './stubSources';
import { sourcesConfig } from '../config/sourcesConfig';

const rssSources: SourceConnector[] = Object.entries(sourcesConfig.rss ?? {})
  .filter(([id]) => sourcesConfig.enabled[id])
  .map(([id, config]) =>
    createRssSource({
      id,
      displayName: config.label,
      urls: config.feeds,
      confidence: config.confidence ?? 70
    })
  );

const additionalSources: SourceConnector[] = [];
if (sourcesConfig.enabled['affiliate_feed_import'] && sourcesConfig.affiliateFeeds.enabled) {
  additionalSources.push(affiliateSource);
}
if (sourcesConfig.enabled['brand_promos'] && sourcesConfig.brandPromoPages.enabled) {
  additionalSources.push(brandPromoSource);
}
if (sourcesConfig.enabled['community']) {
  additionalSources.push(communitySource);
}
if (sourcesConfig.enabled['retailmenot_partner']) {
  additionalSources.push(retailmenotSource);
}
if (sourcesConfig.enabled['honey_partner']) {
  additionalSources.push(honeySource);
}
if (sourcesConfig.enabled['x_api']) {
  additionalSources.push(xSource);
}
if (sourcesConfig.enabled['threads_api']) {
  additionalSources.push(threadsSource);
}

export const sources: SourceConnector[] = [...rssSources, ...additionalSources];
