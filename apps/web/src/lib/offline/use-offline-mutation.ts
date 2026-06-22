import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { syncQueue } from './sync-queue';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';

interface OfflineMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  module: string;
  action: string;
  schoolId: string;
  queryKeysToInvalidate?: any[][];
}

export function useOfflineMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>({
  module,
  action,
  schoolId,
  queryKeysToInvalidate,
  mutationFn,
  onSuccess,
  onError,
  ...options
}: OfflineMutationOptions<TData, TError, TVariables, TContext>) {
  if (typeof schoolId !== 'string' || schoolId.trim() === '') {
    throw new Error('Tenant Isolation Violation: A valid schoolId is required');
  }

  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables: TVariables) => {
      if (typeof schoolId !== 'string' || schoolId.trim() === '') {
        throw new Error('Tenant Isolation Violation: A valid schoolId is required');
      }
      try {
        if (!mutationFn) throw new Error("mutationFn is required");
        // Attempt network first
        return await (mutationFn as any)(variables);
      } catch (error: any) {
        // If it's a network error or 5xx, we catch it and queue offline
        const isNetworkError =
          error instanceof TypeError || // e.g. Failed to fetch
          error.message?.includes('Network Error') ||
          error.message?.includes('Failed to fetch') ||
          error.status >= 500;

        if (isNetworkError) {
          const userId = auth?.user?.id || 'unknown-user';
          const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('device_id') || 'unknown-device' : 'unknown-device';
          
          await syncQueue.enqueue({
            schoolId,
            userId,
            deviceId,
            module,
            action,
            payload: variables,
          });

          toast?.success("Saved offline. Will sync when connection returns.");

          // Return a mock success response so the UI optimistically updates
          return { _offline: true } as unknown as TData;
        }

        // If it's a 4xx error (validation, auth), rethrow it
        throw error;
      }
    },
    onSuccess: (...args: any[]) => {
      const [data, variables, context] = args;
      // Invalidate relevant queries to update UI optimistically
      if (queryKeysToInvalidate) {
        queryKeysToInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      
      if (onSuccess) {
        (onSuccess as any)(data, variables, context);
      }
    },
    onError: (...args: any[]) => {
      const [error, variables, context] = args;
      if (onError) {
        (onError as any)(error, variables, context);
      }
    },
    ...options,
  });
}
