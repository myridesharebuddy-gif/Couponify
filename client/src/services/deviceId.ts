import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'couponify_device_id';
let cachedDeviceId: string | null = null;

export const getDeviceId = async () => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const generated = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  cachedDeviceId = generated;
  return generated;
};
