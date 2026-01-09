import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'couponify_device_id';
let cachedDeviceId: string | null = null;

const readStoredDeviceId = async () => {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      return stored;
    }
  } catch {
    // Fall back to AsyncStorage below.
  }
  return AsyncStorage.getItem(DEVICE_ID_KEY);
};

const writeStoredDeviceId = async (value: string) => {
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, value);
  } catch {
    await AsyncStorage.setItem(DEVICE_ID_KEY, value);
  }
};

export const getDeviceId = async () => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  const stored = await readStoredDeviceId();
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const generated = uuidv4();
  await writeStoredDeviceId(generated);
  cachedDeviceId = generated;
  return generated;
};
