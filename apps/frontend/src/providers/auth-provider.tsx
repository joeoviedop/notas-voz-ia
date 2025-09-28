'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { NotasVozApiClient, createApiClient, type User, type LoginRequest, type RegisterRequest } from '@notas-voz/sdk';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  client: NotasVozApiClient;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar el cliente del SDK
  const [client] = useState(() =>
    createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_BASE || '/api/v1',
      withCredentials: true,
    })
  );

  const isAuthenticated = !!user;

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await client.loginUser(credentials);
      
      // Establecer el token en el cliente
      if (response.accessToken) {
        client.setAccessToken(response.accessToken);
        
        // Guardar el token en localStorage para persistencia
        localStorage.setItem('accessToken', response.accessToken);
      }
      
      // Si viene el usuario en la respuesta, lo seteamos
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      // Limpiar cualquier token almacenado en caso de error
      localStorage.removeItem('accessToken');
      client.clearAccessToken();
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await client.registerUser(userData);
      
      // Si el registro incluye login automático
      if (response.user) {
        setUser(response.user);
        
        // Si viene token en la respuesta
        if ('accessToken' in response && response.accessToken) {
          client.setAccessToken(response.accessToken);
          localStorage.setItem('accessToken', response.accessToken);
        }
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      client.clearAccessToken();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await client.logoutUser();
    } catch (error) {
      // Continuar con el logout local incluso si falla el servidor
      console.warn('Error during server logout:', error);
    } finally {
      // Limpiar estado local
      setUser(null);
      client.clearAccessToken();
      localStorage.removeItem('accessToken');
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await client.refreshToken();
      
      if (response.accessToken) {
        client.setAccessToken(response.accessToken);
        localStorage.setItem('accessToken', response.accessToken);
      }
      
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      // Si el refresh falla, limpiar la sesión
      setUser(null);
      client.clearAccessToken();
      localStorage.removeItem('accessToken');
      throw error;
    }
  };

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Verificar si hay token guardado
        const savedToken = localStorage.getItem('accessToken');
        if (savedToken) {
          client.setAccessToken(savedToken);
          
          // Intentar refrescar la sesión
          await refreshAuth();
        }
      } catch (error) {
        // Si falla la inicialización, limpiar estado
        console.warn('Failed to initialize auth:', error);
        setUser(null);
        client.clearAccessToken();
        localStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [client]);

  // Auto-refresh del token cada 15 minutos
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        await refreshAuth();
      } catch (error) {
        console.warn('Auto-refresh failed:', error);
        // La función refreshAuth ya limpia el estado en caso de error
      }
    }, 15 * 60 * 1000); // 15 minutos

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    client,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}