import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'couponify_device_hash';

const generateHash = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getOrCreateDeviceHash = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const next = generateHash();
    await AsyncStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return generateHash();
  }
};

export const useDeviceHash = () => {
  const [hash, setHash] = useState<string | undefined>();
  useEffect(() => {
    let isMounted = true;
    getOrCreateDeviceHash().then((value) => {
      if (isMounted) {
        setHash(value);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);
  return hash;
};
