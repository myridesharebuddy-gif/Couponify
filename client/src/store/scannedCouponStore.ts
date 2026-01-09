import { create } from 'zustand';

export type ScannedCouponRecord = {
  id: string;
  code: string;
  storeName?: string;
  scannedAt: string;
};

type ScannedCouponState = {
  items: ScannedCouponRecord[];
  addScannedCoupon: (payload: { code: string; storeName?: string }) => void;
  clearScannedCoupons: () => void;
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const useScannedCouponStore = create<ScannedCouponState>((set) => ({
  items: [],
  addScannedCoupon: (payload) =>
    set((state) => ({
      items: [
        {
          id: createId(),
          code: payload.code,
          storeName: payload.storeName,
          scannedAt: new Date().toISOString()
        },
        ...state.items
      ].slice(0, 50)
    })),
  clearScannedCoupons: () => set({ items: [] })
}));
