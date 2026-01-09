import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { fetchDigestDeals } from './api';

const DIGEST_NOTIFICATION_KEY = 'couponify_digest_notification_id';
const DIGEST_TIME_KEY = 'couponify_digest_time';
const WATCHLIST_LAST_NOTIFIED_KEY = 'couponify_watchlist_last_notified';
const WATCHLIST_NOTIFY_INTERVAL_MS = 1000 * 60 * 30;

export const requestNotificationPermissions = async () => {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return settings;
  }
  return Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
};

const parseTimeString = (value: string) => {
  const [hours, minutes] = value.split(':').map((segment) => Number(segment));
  return {
    hours: Number.isFinite(hours) ? hours : 8,
    minutes: Number.isFinite(minutes) ? minutes : 30
  };
};

export const getScheduledDigestTime = async () => {
  const stored = await AsyncStorage.getItem(DIGEST_TIME_KEY);
  return stored ?? null;
};

const computeNextTrigger = (time: string) => {
  const { hours, minutes } = parseTimeString(time);
  const now = new Date();
  const candidate = new Date();
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
};

export const scheduleDigestNotification = async (time: string) => {
  await cancelDigestNotification();
  await AsyncStorage.setItem(DIGEST_TIME_KEY, time);
  const digest = await fetchDigestDeals({ limit: 5 });
  const body = digest.items
    .slice(0, 5)
    .map((deal, index) => `${index + 1}. ${deal.store} · ${deal.deal}`)
    .join('\n');
  const triggerDate = computeNextTrigger(time);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Couponify Daily Digest',
      body: body || 'Hot deals are ready for you.',
      data: { type: 'daily-digest' }
    },
    trigger: {
      date: triggerDate,
      repeats: true
    }
  });
  await AsyncStorage.setItem(DIGEST_NOTIFICATION_KEY, identifier);
};

export const cancelDigestNotification = async () => {
  const identifier = await AsyncStorage.getItem(DIGEST_NOTIFICATION_KEY);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => null);
    await AsyncStorage.removeItem(DIGEST_NOTIFICATION_KEY);
  }
};

const shouldNotifyWatchlist = async () => {
  const last = await AsyncStorage.getItem(WATCHLIST_LAST_NOTIFIED_KEY);
  const lastTs = last ? Number(last) : 0;
  if (Date.now() - lastTs < WATCHLIST_NOTIFY_INTERVAL_MS) {
    return false;
  }
  await AsyncStorage.setItem(WATCHLIST_LAST_NOTIFIED_KEY, String(Date.now()));
  return true;
};

export const notifyWatchlist = async (message: string) => {
  const allowed = await shouldNotifyWatchlist();
  if (!allowed) {
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Watchlist new deals',
      body: message,
      data: { type: 'watchlist' }
    },
    trigger: null
  });
};
