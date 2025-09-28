import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../providers/AuthProvider'
import Dashboard from '../../pages/dashboard'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    asPath: '/dashboard',
  }),
}))

// Mock the SDK
const mockGetNotes = jest.fn()
const mockGetStats = jest.fn()
jest.mock('@notas-voz/sdk', () => ({
  NotasVozClient: jest.fn().mockImplementation(() => ({
    notes: {
      getNotes: mockGetNotes,
      getStats: mockGetStats,
    },
  })),
}))

// Mock localStorage with user data
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key) => {
      if (key === 'access_token') return 'mock-token'
      if (key === 'user') return JSON.stringify({
        id: '1',
        name: 'Test User',
        email: 'test@example.com'
      })
      return null
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
})

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

const mockNotes = [
  {
    id: '1',
    title: 'Primera nota',
    content: 'Contenido de la primera nota',
    transcript: 'Transcripción de la primera nota',
    summary: 'Resumen de la primera nota',
    status: 'completed' as const,
    audioUrl: 'https://example.com/audio1.mp3',
    tags: ['trabajo', 'importante'],
    actions: [
      { id: '1', title: 'Tarea 1', completed: false },
      { id: '2', title: 'Tarea 2', completed: true },
    ],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Segunda nota',
    content: 'Contenido de la segunda nota',
    transcript: 'Transcripción de la segunda nota',
    summary: 'Resumen de la segunda nota',
    status: 'processing' as const,
    audioUrl: 'https://example.com/audio2.mp3',
    tags: ['personal'],
    actions: [],
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
  },
]

const mockStats = {
  totalNotes: 2,
  completedNotes: 1,
  pendingNotes: 1,
  totalActions: 2,
  completedActions: 1,
}

describe('Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetNotes.mockResolvedValue({
      data: mockNotes,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    })
    mockGetStats.mockResolvedValue(mockStats)
  })

  it('should render dashboard with notes and stats', async () => {
    const TestWrapper = createTestWrapper()

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Check for loading state first
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Primera nota')).toBeInTheDocument()
    })

    // Check that stats are displayed
    expect(screen.getByText('2')).toBeInTheDocument() // Total notes
    expect(screen.getByText('1')).toBeInTheDocument() // Completed notes

    // Check that notes are displayed
    expect(screen.getByText('Primera nota')).toBeInTheDocument()
    expect(screen.getByText('Segunda nota')).toBeInTheDocument()

    // Check status chips
    expect(screen.getByText('Completada')).toBeInTheDocument()
    expect(screen.getByText('Procesando')).toBeInTheDocument()
  })

  it('should filter notes by status', async () => {
    const user = userEvent.setup()
    const TestWrapper = createTestWrapper()

    mockGetNotes.mockResolvedValueOnce({
      data: [mockNotes[0]], // Only completed note
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Primera nota')).toBeInTheDocument()
    })

    // Click on "Completadas" filter
    const completedFilter = screen.getByText('Completadas')
    await user.click(completedFilter)

    // Should call API with filter
    expect(mockGetNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      })
    )
  })

  it('should search notes', async () => {
    const user = userEvent.setup()
    const TestWrapper = createTestWrapper()

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Primera nota')).toBeInTheDocument()
    })

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Buscar notas...')
    await user.type(searchInput, 'primera')

    // Wait for debounced search
    await waitFor(() => {
      expect(mockGetNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'primera',
        })
      )
    }, { timeout: 1000 })
  })

  it('should navigate to note detail when clicking on note', async () => {
    const user = userEvent.setup()
    const TestWrapper = createTestWrapper()

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for notes to load
    await waitFor(() => {
      expect(screen.getByText('Primera nota')).toBeInTheDocument()
    })

    // Click on first note
    const firstNote = screen.getByText('Primera nota')
    await user.click(firstNote)

    // Should navigate to note detail
    expect(mockPush).toHaveBeenCalledWith('/notes/1')
  })

  it('should navigate to create note page', async () => {
    const user = userEvent.setup()
    const TestWrapper = createTestWrapper()

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/nueva nota/i)).toBeInTheDocument()
    })

    // Click on create note button
    const createButton = screen.getByText(/nueva nota/i)
    await user.click(createButton)

    // Should navigate to create note page
    expect(mockPush).toHaveBeenCalledWith('/notes/create')
  })

  it('should handle pagination', async () => {
    const user = userEvent.setup()
    const TestWrapper = createTestWrapper()

    // Mock paginated response
    mockGetNotes.mockResolvedValueOnce({
      data: [mockNotes[0]],
      pagination: {
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      },
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Primera nota')).toBeInTheDocument()
    })

    // Check that pagination is shown
    expect(screen.getByText('2')).toBeInTheDocument() // Page 2 button

    // Mock second page response
    mockGetNotes.mockResolvedValueOnce({
      data: [mockNotes[1]],
      pagination: {
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
      },
    })

    // Click on page 2
    const page2Button = screen.getByText('2')
    await user.click(page2Button)

    // Should call API with page 2
    expect(mockGetNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    )
  })

  it('should handle empty state', async () => {
    const TestWrapper = createTestWrapper()

    // Mock empty response
    mockGetNotes.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText(/no tienes notas aún/i)).toBeInTheDocument()
    })

    // Should show create note suggestion
    expect(screen.getByText(/crea tu primera nota/i)).toBeInTheDocument()
  })

  it('should handle API errors', async () => {
    const TestWrapper = createTestWrapper()

    // Mock API error
    mockGetNotes.mockRejectedValue(new Error('API Error'))

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/error al cargar las notas/i)).toBeInTheDocument()
    })
  })
}