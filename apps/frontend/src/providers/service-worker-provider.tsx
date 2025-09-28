'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { WifiOff, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ServiceWorkerContextType {
  isOnline: boolean;
  updateAvailable: boolean;
  updateServiceWorker: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  sendMessageToSW: (message: any) => void;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const {
    isOnline,
    updateAvailable,
    updateServiceWorker,
    requestNotificationPermission,
    sendMessageToSW,
  } = useServiceWorker();

  // Show offline notification
  useEffect(() => {
    if (!isOnline) {
      toast(
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-red-600" />
          <span>Sin conexión - Trabajando offline</span>
        </div>,
        {
          duration: 4000,
          id: 'offline-status',
        }
      );
    } else {
      toast.dismiss('offline-status');
    }
  }, [isOnline]);

  // Show update available notification
  useEffect(() => {
    if (updateAvailable) {
      toast(
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-600" />
            <span>Nueva versión disponible</span>
          </div>
          <button
            onClick={() => {
              updateServiceWorker();
              toast.dismiss('update-available');
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Actualizar
          </button>
        </div>,
        {
          duration: 10000,
          id: 'update-available',
        }
      );
    }
  }, [updateAvailable, updateServiceWorker]);

  const value: ServiceWorkerContextType = {
    isOnline,
    updateAvailable,
    updateServiceWorker,
    requestNotificationPermission,
    sendMessageToSW,
  };

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Modo offline</span>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (context === undefined) {
    throw new Error('useServiceWorkerContext must be used within a ServiceWorkerProvider');
  }
  return context;
}