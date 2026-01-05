import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_ID_KEY = 'couponify_install_id';

const generateId = () => {
  const random = Math.random().toString(36).slice(2, 12);
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${random}`;
};

export const getInstallId = async () => {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing) {
      return existing;
    }
    const nextId = generateId();
    await AsyncStorage.setItem(INSTALL_ID_KEY, nextId);
    return nextId;
  } catch (error) {
    console.warn('Unable to access install id', error);
    return generateId();
  }
};
