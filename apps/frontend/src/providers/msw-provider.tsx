'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { enableMocking, isMockingEnabled, getMockCredentials } from '@/mocks/browser';
import { toast } from 'react-hot-toast';

interface MSWProviderProps {
  children: ReactNode;
}

export function MSWProvider({ children }: MSWProviderProps) {
  const [isMockingReady, setIsMockingReady] = useState(false);

  useEffect(() => {
    async function initMocking() {
      if (isMockingEnabled()) {
        try {
          await enableMocking();
          setIsMockingReady(true);
          
          // Show mock credentials info to developers
          if (process.env.NODE_ENV === 'development') {
            const { email, password } = getMockCredentials();
            
            setTimeout(() => {
              toast(
                <div className="space-y-2">
                  <div className="font-semibold text-orange-800">
                    🔧 Modo Mock Activado
                  </div>
                  <div className="text-sm text-orange-700">
                    Credenciales de prueba:
                    <br />
                    Email: <code className="bg-orange-100 px-1 rounded">{email}</code>
                    <br />
                    Password: <code className="bg-orange-100 px-1 rounded">{password}</code>
                  </div>
                </div>,
                {
                  duration: 8000,
                  style: {
                    background: '#fed7aa',
                    color: '#9a3412',
                    maxWidth: '400px',
                  },
                }
              );
            }, 1000);
          }
        } catch (error) {
          console.error('Failed to start MSW:', error);
          setIsMockingReady(true); // Continue anyway
        }
      } else {
        setIsMockingReady(true);
      }
    }

    initMocking();
  }, []);

  // Show loading screen while MSW is initializing
  if (isMockingEnabled() && !isMockingReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando mocks...</p>
          <p className="text-xs text-gray-500 mt-2">
            Preparando datos de prueba para desarrollo
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}