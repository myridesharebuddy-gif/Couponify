import 'dotenv/config';

const envApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? process.env.EXPO_PUBLIC_API_URL?.trim();
const adsEnabled = process.env.ADS_ENABLED === 'true';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const REQUIRED_PLUGINS = [
  'expo-barcode-scanner',
  'expo-camera'
];

const mergePlugins = (current = []) => {
  const merged = [...current];
  const hasPlugin = (name) =>
    merged.some((entry) => (Array.isArray(entry) ? entry[0] === name : entry === name));
  REQUIRED_PLUGINS.forEach((plugin) => {
    if (!hasPlugin(plugin)) {
      merged.push(plugin);
    }
  });
  return merged;
};

export default ({ config }) => {
  return {
    ...config,
    name: 'Couponify',
    slug: 'couponify',
    scheme: 'couponify',
    version: '1.0.0',
    orientation: config.orientation ?? 'portrait',
    platforms: config.platforms ?? ['ios'],
    icon: './assets/images/couponifylogo.png',
    plugins: mergePlugins(config.plugins),
    ios: {
      ...config.ios,
      supportsTablet: true,
      usesNonExemptEncryption: false,
      icon: './assets/images/couponifylogo.png',
      bundleIdentifier: 'com.josephwright.couponify',
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'Couponify uses the camera to scan barcodes and coupons.',
        NSPhotoLibraryUsageDescription:
          'Couponify allows users to upload images for coupons and profile personalization.'
      }
    },
    android: {
      ...config.android,
      icon: './assets/images/couponifylogo.png',
      package: 'com.josephwright.couponify'
    },
    extra: {
      ...config.extra,
      EXPO_PUBLIC_API_BASE_URL: envApiBaseUrl,
      EXPO_PUBLIC_API_URL: envApiBaseUrl,
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
      adsEnabled
      ,
      eas: {
        projectId: '77575332-7a14-48a3-b9b4-466306db0019'
      }
    }
  };
};
