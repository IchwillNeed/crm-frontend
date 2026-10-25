import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './errors';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error, query) => { if (!query.meta?.inlineErrors) toast.error(errorMessage(error)); } }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => { if (!mutation.meta?.inlineErrors) toast.error(errorMessage(error)); },
    onSuccess: () => { void queryClient.invalidateQueries(); },
  }),
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
