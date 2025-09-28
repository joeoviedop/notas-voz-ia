import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerProvider } from '@/providers/service-worker-provider';
import { MSWProvider } from '@/providers/msw-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Notas de Voz con IA',
  description: 'Convierte tus audios en transcripciones, resúmenes y listas de acciones',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50`}>
        <MSWProvider>
          <ServiceWorkerProvider>
            <QueryProvider>
              <AuthProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </AuthProvider>
            </QueryProvider>
          </ServiceWorkerProvider>
        </MSWProvider>
      </body>
    </html>
  );
}
