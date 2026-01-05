import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.EXPO_PUBLIC_SUPABASE_URL ?? 'https://invalid.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'invalid-anon-key';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);
