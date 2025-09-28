import { render, screen } from '@testing-library/react'
import { Chip } from '../Chip'

describe('Chip', () => {
  it('renders with default styling for completed status', () => {
    render(<Chip status="completed" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveClass('bg-green-100', 'text-green-800')
    expect(chip).toHaveTextContent('Completada')
  })

  it('renders with correct styling for pending status', () => {
    render(<Chip status="pending" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveClass('bg-yellow-100', 'text-yellow-800')
    expect(chip).toHaveTextContent('Pendiente')
  })

  it('renders with correct styling for processing status', () => {
    render(<Chip status="processing" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveClass('bg-blue-100', 'text-blue-800')
    expect(chip).toHaveTextContent('Procesando')
  })

  it('renders with correct styling for error status', () => {
    render(<Chip status="error" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveClass('bg-red-100', 'text-red-800')
    expect(chip).toHaveTextContent('Error')
  })

  it('applies custom className', () => {
    render(<Chip status="completed" className="custom-class" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveClass('custom-class')
    // Should still have the default classes
    expect(chip).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('has correct accessibility attributes', () => {
    render(<Chip status="completed" />)
    
    const chip = screen.getByRole('status')
    expect(chip).toHaveAttribute('role', 'status')
    expect(chip).toHaveAttribute('aria-live', 'polite')
  })
}