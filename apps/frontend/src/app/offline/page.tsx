import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sin conexión
          </h1>
          
          <p className="text-gray-600 mb-6">
            No tienes conexión a internet. La aplicación funciona en modo offline 
            con funcionalidad limitada.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
            >
              <RefreshCw className="h-4 w-4" />
              Intentar nuevamente
            </button>
            
            <div className="text-sm text-gray-500">
              <p className="mb-2">Mientras tanto, puedes:</p>
              <ul className="text-left space-y-1">
                <li>• Ver notas guardadas localmente</li>
                <li>• Crear nuevas notas (se sincronizarán al reconectar)</li>
                <li>• Grabar audio offline</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-xs text-gray-400">
          Las notas creadas offline se sincronizarán automáticamente 
          cuando se restaure la conexión.
        </div>
      </div>
    </div>
  );
}