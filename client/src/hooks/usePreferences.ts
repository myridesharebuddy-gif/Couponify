import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPreferences, PreferencePayload, updatePreferences } from '../services/api';

export const usePreferencesQuery = () =>
  useQuery<PreferencePayload>(['preferences'], fetchPreferences, {
    staleTime: 60_000
  });

export const usePreferencesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(updatePreferences, {
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data);
    }
  });
};
