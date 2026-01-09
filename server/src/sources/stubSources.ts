import { SourceConnector } from './source';

const createStubSource = (id: string, name: string, note: string): SourceConnector => ({
  id,
  displayName: name,
  fetch: async () => {
    console.info(`Stub source ${name} (${id}) needs configuration: ${note}`);
    return [];
  }
});

export const retailmenotSource = createStubSource(
  'retailmenot',
  'RetailMeNot partner feed (TODO)',
  'Connect an official RetailMeNot or partner API before enabling.'
);

export const honeySource = createStubSource('honey', 'Honey partner feed (TODO)', 'Requires Honey API key.');

export const xSource = createStubSource(
  'x_api',
  'Twitter/X connector (TODO)',
  'Requires Twitter/X API credentials.'
);

export const threadsSource = createStubSource(
  'threads_api',
  'Threads connector (TODO)',
  'Requires Threads API credentials.'
);
