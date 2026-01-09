import { redditProvider } from './reddit';
import { rssProvider } from './rss';
import { manualProvider } from './manual';

export const providersMap = {
  reddit: redditProvider,
  rss: rssProvider,
  manual: manualProvider
};

export const activeProviders = [redditProvider, rssProvider, manualProvider];
