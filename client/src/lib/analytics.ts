import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getDeviceId } from '../services/deviceId';

type EventType = 'coupon_view' | 'coupon_open' | 'coupon_copy' | 'store_open';

type LogEventInput = {
  couponId: string;
  eventType: EventType;
  meta?: Record<string, unknown>;
};

const viewedCouponIds = new Set<string>();

export const logEvent = ({ couponId, eventType, meta = {} }: LogEventInput) => {
  void (async () => {
    try {
      const installId = await getDeviceId();
      await supabase.from('coupon_events').insert({
        coupon_id: couponId,
        event_type: eventType,
        install_id: installId,
        device_platform: Platform.OS,
        meta
      });
    } catch {
      // Swallow analytics failures.
    }
  })();
};

export const logCouponViewOnce = (couponId: string) => {
  if (viewedCouponIds.has(couponId)) return;
  viewedCouponIds.add(couponId);
  logEvent({ couponId, eventType: 'coupon_view' });
};
