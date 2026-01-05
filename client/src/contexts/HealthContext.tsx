import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { getApiBaseUrl } from '../config/apiBase';

type HealthContextValue = {
  healthError: string | null;
  checking: boolean;
  retryHealthCheck: () => Promise<void>;
};

const HealthContext = createContext<HealthContextValue>({
  healthError: null,
  checking: false,
  retryHealthCheck: async () => {}
});

export const useHealthContext = () => useContext(HealthContext);

const AUTO_RETRY_LIMIT = 2;
const UNCONFIGURED_MESSAGE =
  'API base URL is not configured. Export EXPO_PUBLIC_API_BASE_URL or run `npm run set:dev-ip` to write it into client/.env (e.g. http://192.168.4.27:4000).';

export const HealthProvider = ({ children }: { children: ReactNode }) => {
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const delayRef = useRef(1000);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkingRef = useRef(false);
  const autoRetryRef = useRef(0);
  const performRef = useRef<(manual?: boolean) => Promise<void>>();

  const scheduleRetry = useCallback(() => {
    if (autoRetryRef.current >= AUTO_RETRY_LIMIT) {
      return;
    }
    const delay = Math.min(Math.max(delayRef.current, 1000), 15000);
    timeoutRef.current = setTimeout(() => {
      performRef.current?.();
    }, delay);
    delayRef.current = Math.min(delay * 2, 15000);
    autoRetryRef.current += 1;
  }, []);

  const performHealthCheck = useCallback(
    async (manual = false) => {
      if (checkingRef.current && !manual) {
        return;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (manual) {
        delayRef.current = 1000;
        autoRetryRef.current = 0;
      }
      checkingRef.current = true;
      setChecking(true);
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        setHealthError(UNCONFIGURED_MESSAGE);
        checkingRef.current = false;
        setChecking(false);
        return;
      }
      try {
        const result = await apiClient<{ ok: true }>('/health');
        if (result.ok) {
          setHealthError(null);
          delayRef.current = 1000;
          autoRetryRef.current = 0;
        } else {
          setHealthError(result.error === 'API_UNCONFIGURED' ? UNCONFIGURED_MESSAGE : result.message ?? 'Unable to reach the API');
          if (result.error !== 'API_UNCONFIGURED') {
            scheduleRetry();
          }
        }
      } catch (error: unknown) {
        const message =
          error && typeof error === 'object' && 'message' in error ? String((error as any).message) : 'Unable to reach API';
        setHealthError(message);
        scheduleRetry();
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [scheduleRetry]
  );

  useEffect(() => {
    performRef.current = performHealthCheck;
  }, [performHealthCheck]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const retryHealthCheck = useCallback(
    (opts?: { manual?: boolean }) => performHealthCheck(opts?.manual ?? false),
    [performHealthCheck]
  );

  const value = useMemo(
    () => ({
      healthError,
      checking,
      retryHealthCheck
    }),
    [checking, healthError, retryHealthCheck]
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
};
