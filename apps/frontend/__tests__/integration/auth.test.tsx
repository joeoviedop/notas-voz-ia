import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../providers/AuthProvider'
import LoginPage from '../../pages/auth/login'
import RegisterPage from '../../pages/auth/register'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    asPath: '/auth/login',
  }),
}))

// Mock the SDK
jest.mock('@notas-voz/sdk', () => ({
  NotasVozClient: jest.fn().mockImplementation(() => ({
    auth: {
      login: jest.fn(),
      register: jest.fn(),
    },
  })),
}))

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

describe('Authentication Flow', () => {
  let mockLogin: jest.Mock
  let mockRegister: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset localStorage
    localStorage.clear()
    
    // Mock SDK methods
    const { NotasVozClient } = require('@notas-voz/sdk')
    const mockClient = new NotasVozClient()
    mockLogin = mockClient.auth.login
    mockRegister = mockClient.auth.register
  })

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      mockLogin.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Fill in the form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Wait for the login to complete
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      // Check that tokens are stored
      expect(localStorage.getItem('access_token')).toBe('test-token')
      expect(localStorage.getItem('refresh_token')).toBe('refresh-token')
    })

    it('should show error message for invalid credentials', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      mockLogin.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Fill in the form with invalid credentials
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await user.type(emailInput, 'invalid@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument()
      })
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email es requerido/i)).toBeInTheDocument()
        expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument()
      })
    })
  })

  describe('Registration Flow', () => {
    it('should register successfully with valid data', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      mockRegister.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      })

      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      )

      // Fill in the form
      const nameInput = screen.getByLabelText(/nombre/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText('Contraseña')
      const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i)
      const submitButton = screen.getByRole('button', { name: /registrarse/i })

      await user.type(nameInput, 'Test User')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      // Wait for the registration to complete
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('should validate password confirmation', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      )

      const passwordInput = screen.getByLabelText('Contraseña')
      const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i)
      const submitButton = screen.getByRole('button', { name: /registrarse/i })

      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument()
      })
    })

    it('should show error for existing email', async () => {
      const user = userEvent.setup()
      const TestWrapper = createTestWrapper()

      mockRegister.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'User already exists' }
        }
      })

      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      )

      // Fill in the form
      const nameInput = screen.getByLabelText(/nombre/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText('Contraseña')
      const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i)
      const submitButton = screen.getByRole('button', { name: /registrarse/i })

      await user.type(nameInput, 'Test User')
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/usuario ya existe/i)).toBeInTheDocument()
      })
    })
  })
}