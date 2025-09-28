import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW worker for browser environment
export const worker = setupWorker(...handlers);

// Start the worker conditionally
export async function enableMocking() {
  if (typeof window === 'undefined') {
    // We're in SSR, do nothing
    return;
  }

  // Only enable mocking in development and when explicitly enabled
  if (
    process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
  ) {
    console.log('🔧 Enabling API mocking with MSW...');
    
    // Start the worker
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
      quiet: false, // Show MSW logs in development
    });
    
    console.log('✅ MSW worker started');
    
    // Add a visual indicator that we're using mocks
    if (typeof document !== 'undefined') {
      const indicator = document.createElement('div');
      indicator.innerHTML = '🔧 MOCKS ENABLED';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff6b6b;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(indicator);
    }
  }
}

// Helper function to check if mocks are enabled
export function isMockingEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
  );
}

// Helper to get mock credentials for testing
export function getMockCredentials() {
  return {
    email: 'user@test.com',
    password: 'password123',
  };
}