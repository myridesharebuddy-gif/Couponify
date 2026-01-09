try {
  require('dotenv/config');
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

const envApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? process.env.EXPO_PUBLIC_API_URL?.trim();
const adsEnabled = process.env.ADS_ENABLED === 'true';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

module.exports = ({ config }) => ({
  ...config,
  name: 'Couponify',
  slug: 'couponify',
  scheme: 'couponify',
  version: '1.0.0',
  cli: {
    ...(config.cli ?? {}),
    appVersionSource: 'remote',
  },
  icon: './assets/images/couponifylogo.png',
  ios: {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      ITSAppUsesNonExemptEncryption: false,
    },
    usesNonExemptEncryption: false,
    icon: './assets/images/couponifylogo.png',
    bundleIdentifier: 'com.josephwright.couponify',
  },
  android: {
    ...config.android,
    icon: './assets/images/couponifylogo.png',
    package: 'com.josephwright.couponify',
  },
  extra: {
    ...config.extra,
    EXPO_PUBLIC_API_BASE_URL: envApiBaseUrl,
    EXPO_PUBLIC_API_URL: envApiBaseUrl,
    EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    adsEnabled,
    eas: {
      projectId: '77575332-7a14-48a3-b9b4-466306db0019',
    },
  },
});
