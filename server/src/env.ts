import dotenv from 'dotenv';

dotenv.config();

const {
  PORT,
  REDDIT_SUBREDDITS,
  RSS_FEEDS,
  ADS_ENABLED,
  PROVIDER_REFRESH_MINUTES,
  STORE_SUGGESTION_ADMIN_KEY,
  AFFILIATE_FEEDS,
  INGEST_CRON
} = process.env;

export const env = {
  port: Number(PORT ?? 4000),
  redditSubreddits: (REDDIT_SUBREDDITS ?? 'coupons,deals,frugal').split(',').map((value) => value.trim()).filter(Boolean),
  rssFeeds: (RSS_FEEDS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  adsEnabled: ADS_ENABLED === 'true',
  refreshMinutes: Number(PROVIDER_REFRESH_MINUTES ?? 10),
  storeSuggestionAdminKey: STORE_SUGGESTION_ADMIN_KEY ?? 'couponify-admin',
  ingestCron: INGEST_CRON ?? '0 */6 * * *'
};

export const affiliateFeedConfigs = (AFFILIATE_FEEDS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    const [name, url] = value.split('|').map((part) => part.trim());
    return { name, url };
  })
  .filter((config) => config.name && config.url);
