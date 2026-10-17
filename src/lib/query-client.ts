import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './errors';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: error => toast.error(errorMessage(error)) }),
  mutationCache: new MutationCache({
    onError: error => toast.error(errorMessage(error)),
    onSuccess: () => { void queryClient.invalidateQueries(); },
  }),
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
