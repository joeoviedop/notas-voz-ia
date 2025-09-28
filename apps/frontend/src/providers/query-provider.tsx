'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time de 5 minutos para reducir re-fetching innecesario
            staleTime: 5 * 60 * 1000,
            // Retry automático en caso de error de red
            retry: (failureCount, error: any) => {
              // No retry para errores de auth (401, 403)
              if (error?.status === 401 || error?.status === 403) {
                return false;
              }
              // Máximo 3 reintentos para otros errores
              return failureCount < 3;
            },
            // Configuración de refetch
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry para mutations en caso de error de red
            retry: (failureCount, error: any) => {
              // No retry para errores de cliente (4xx)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Máximo 2 reintentos para errores de servidor
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition="bottom-left"
      />
    </QueryClientProvider>
  );
}