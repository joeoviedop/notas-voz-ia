import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../providers/AuthProvider'

// Mock Next.js router by default
const mockRouter = {
  push: jest.fn(),
  query: {},
  asPath: '/',
  route: '/',
  pathname: '/',
  back: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
  },
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

const createTestWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function TestWrapper({ children }: TestWrapperProps) {
    return (
      <QueryClientProvider client={client}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  withAuth?: boolean
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, withAuth = true, ...renderOptions } = options

  const Wrapper = withAuth ? createTestWrapper(queryClient) : undefined

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock data factories
export const createMockNote = (overrides = {}) => ({
  id: '1',
  title: 'Test Note',
  content: 'Test content',
  transcript: 'Test transcript',
  summary: 'Test summary',
  status: 'completed' as const,
  audioUrl: 'https://example.com/audio.mp3',
  tags: ['test'],
  actions: [],
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
})

export const createMockAction = (overrides = {}) => ({
  id: '1',
  title: 'Test Action',
  completed: false,
  ...overrides,
})

// Mock API responses
export const mockNotesResponse = (notes = [createMockNote()]) => ({
  data: notes,
  pagination: {
    page: 1,
    limit: 10,
    total: notes.length,
    totalPages: 1,
  },
})

export const mockStatsResponse = (overrides = {}) => ({
  totalNotes: 1,
  completedNotes: 1,
  pendingNotes: 0,
  totalActions: 0,
  completedActions: 0,
  ...overrides,
})

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// Setup authenticated user in localStorage
export const setupAuthenticatedUser = (user = createMockUser()) => {
  const localStorage = mockLocalStorage()
  localStorage.setItem('access_token', 'mock-token')
  localStorage.setItem('refresh_token', 'mock-refresh-token')
  localStorage.setItem('user', JSON.stringify(user))
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorage,
    writable: true,
  })
  
  return localStorage
}

// Wait for async operations to complete
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Custom matchers
expect.extend({
  toHaveLoadingState(received) {
    const pass = received.textContent?.includes('Cargando') || 
                  received.textContent?.includes('Loading')
    
    return {
      message: () =>
        pass
          ? `Expected element not to have loading state`
          : `Expected element to have loading state`,
      pass,
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveLoadingState(): R
    }
  }
}

// Export everything
export * from '@testing-library/react'
export { customRender as render, mockRouter }
export { createTestWrapper }