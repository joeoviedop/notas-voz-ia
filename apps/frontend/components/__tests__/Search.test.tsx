import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search } from '../Search'

describe('Search', () => {
  const mockOnSearch = jest.fn()
  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input and filter buttons', () => {
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
      />
    )

    expect(screen.getByPlaceholderText('Buscar notas...')).toBeInTheDocument()
    expect(screen.getByText('Todas')).toBeInTheDocument()
    expect(screen.getByText('Completadas')).toBeInTheDocument()
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
  })

  it('calls onSearch after debounce delay', async () => {
    const user = userEvent.setup()
    
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
      />
    )

    const input = screen.getByPlaceholderText('Buscar notas...')
    await user.type(input, 'test query')

    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled()

    // Should call after debounce delay
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    }, { timeout: 1000 })
  })

  it('handles filter change correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
        activeFilter="all"
      />
    )

    const completedButton = screen.getByText('Completadas')
    await user.click(completedButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith('completed')
  })

  it('shows active filter correctly', () => {
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
        activeFilter="completed"
      />
    )

    const completedButton = screen.getByText('Completadas')
    expect(completedButton).toHaveClass('bg-blue-600', 'text-white')
  })

  it('renders filter tags when provided', () => {
    const tags = ['tag1', 'tag2']
    
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={tags}
      />
    )

    expect(screen.getByText('#tag1')).toBeInTheDocument()
    expect(screen.getByText('#tag2')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
      />
    )

    const input = screen.getByPlaceholderText('Buscar notas...')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('aria-label', 'Buscar notas')
    
    const filterGroup = screen.getByRole('group')
    expect(filterGroup).toHaveAttribute('aria-label', 'Filtros de notas')
  })

  it('clears search when input is cleared', async () => {
    const user = userEvent.setup()
    
    render(
      <Search 
        onSearch={mockOnSearch}
        onFilterChange={mockOnFilterChange}
        filters={[]}
      />
    )

    const input = screen.getByPlaceholderText('Buscar notas...')
    await user.type(input, 'test')
    await user.clear(input)

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })
  })
}