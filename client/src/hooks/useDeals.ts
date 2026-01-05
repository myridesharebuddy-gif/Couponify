import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchDeals, fetchRecommendedDeals } from '../services/api';
import type { DealItem } from '../types/coupon';

type DealSort = 'hot' | 'new' | 'expiring' | 'verified';
type FeedMode = 'all' | 'recommended';
type UseDealsParams = {
  sort: DealSort;
  query?: string;
  store?: string;
  mode?: FeedMode;
};

const PAGE_LIMIT = 20;

export const useDeals = ({ sort, query, store, mode = 'all' }: UseDealsParams) => {
  const fetcher = mode === 'recommended' ? fetchRecommendedDeals : fetchDeals;
  const queryResult = useInfiniteQuery(
    ['deals', mode, sort, query, store],
    ({ pageParam }) =>
      fetcher({
        sort,
        q: query,
        storeId: store,
        limit: PAGE_LIMIT,
        cursor: pageParam
      }),
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      keepPreviousData: true,
      staleTime: 60_000
    }
  );

  const items = useMemo(() => {
    const seen = new Set<string>();
    const flattened: DealItem[] = [];
    queryResult.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          flattened.push(item);
        }
      });
    });
    return flattened;
  }, [queryResult.data?.pages]);

  return { ...queryResult, items };
};
