import userEvent from '@testing-library/user-event'
import CreateNotePage from '../../pages/notes/create'
import { 
  render, 
  screen, 
  waitFor,
  mockRouter,
  setupAuthenticatedUser 
} from '../utils/test-utils'

// Mock the SDK
const mockCreateNote = jest.fn()
const mockUploadAudio = jest.fn()
jest.mock('@notas-voz/sdk', () => ({
  NotasVozClient: jest.fn().mockImplementation(() => ({
    notes: {
      createNote: mockCreateNote,
    },
    upload: {
      uploadAudio: mockUploadAudio,
    },
  })),
}))

describe('Note Creation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupAuthenticatedUser()
    mockRouter.push.mockClear()
  })

  describe('File Upload Method', () => {
    it('should create note with file upload', async () => {
      const user = userEvent.setup()
      
      // Mock successful responses
      mockCreateNote.mockResolvedValue({
        id: 'new-note-id',
        title: 'Nueva Nota',
        status: 'pending'
      })
      mockUploadAudio.mockResolvedValue({
        audioUrl: 'https://example.com/uploaded-audio.mp3',
        transcript: 'Transcripción del audio',
        summary: 'Resumen del audio'
      })

      render(<CreateNotePage />)

      // Click on "Subir archivo" method
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      expect(screen.getByText('Seleccionar archivo de audio')).toBeInTheDocument()

      // Create a mock file
      const mockFile = new File(['audio content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      })

      // Mock file input
      const fileInput = screen.getByLabelText(/seleccionar archivo/i)
      await user.upload(fileInput, mockFile)

      // Wait for file to be processed
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument()
      })

      // Click create note button
      const createButton = screen.getByText('Crear Nota')
      expect(createButton).not.toBeDisabled()
      
      await user.click(createButton)

      // Should show loading state
      expect(screen.getByText(/creando nota/i)).toBeInTheDocument()

      // Wait for creation to complete
      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledWith({
          title: expect.any(String),
        })
      })

      await waitFor(() => {
        expect(mockUploadAudio).toHaveBeenCalledWith(
          'new-note-id',
          expect.any(File)
        )
      })

      // Should redirect to note detail
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/notes/new-note-id')
      })
    })

    it('should handle file validation errors', async () => {
      const user = userEvent.setup()

      render(<CreateNotePage />)

      // Click on "Subir archivo" method
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      // Try to upload invalid file type
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain'
      })

      const fileInput = screen.getByLabelText(/seleccionar archivo/i)
      await user.upload(fileInput, mockFile)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/tipo de archivo no válido/i)).toBeInTheDocument()
      })
    })

    it('should handle large file errors', async () => {
      const user = userEvent.setup()

      render(<CreateNotePage />)

      // Click on "Subir archivo" method
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      // Create a large mock file (> 50MB)
      const largeContent = 'a'.repeat(51 * 1024 * 1024)
      const mockFile = new File([largeContent], 'large-audio.mp3', {
        type: 'audio/mpeg'
      })

      const fileInput = screen.getByLabelText(/seleccionar archivo/i)
      await user.upload(fileInput, mockFile)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/archivo demasiado grande/i)).toBeInTheDocument()
      })
    })
  })

  describe('Recording Method', () => {
    it('should create note with audio recording', async () => {
      const user = userEvent.setup()
      
      // Mock successful responses
      mockCreateNote.mockResolvedValue({
        id: 'new-note-id',
        title: 'Nueva Nota',
        status: 'pending'
      })
      mockUploadAudio.mockResolvedValue({
        audioUrl: 'https://example.com/recorded-audio.mp3',
        transcript: 'Transcripción de la grabación',
        summary: 'Resumen de la grabación'
      })

      render(<CreateNotePage />)

      // Click on "Grabar audio" method
      const recordButton = screen.getByText('Grabar audio')
      await user.click(recordButton)

      expect(screen.getByText('Grabar nueva nota')).toBeInTheDocument()

      // Start recording
      const startRecordingButton = screen.getByRole('button', { name: /iniciar grabación/i })
      await user.click(startRecordingButton)

      // Should show recording state
      expect(screen.getByText(/grabando/i)).toBeInTheDocument()

      // Stop recording after a short delay
      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /detener grabación/i })
        return user.click(stopButton)
      })

      // Should show recorded audio controls
      await waitFor(() => {
        expect(screen.getByText('Reproducir')).toBeInTheDocument()
        expect(screen.getByText('Grabar de nuevo')).toBeInTheDocument()
      })

      // Click create note button
      const createButton = screen.getByText('Crear Nota')
      expect(createButton).not.toBeDisabled()
      
      await user.click(createButton)

      // Should create note and upload recording
      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockUploadAudio).toHaveBeenCalledWith(
          'new-note-id',
          expect.any(Blob)
        )
      })

      // Should redirect to note detail
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/notes/new-note-id')
      })
    })

    it('should handle recording permission errors', async () => {
      const user = userEvent.setup()

      // Mock getUserMedia to reject
      const mockGetUserMedia = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      )
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true
      })

      render(<CreateNotePage />)

      // Click on "Grabar audio" method
      const recordButton = screen.getByText('Grabar audio')
      await user.click(recordButton)

      // Try to start recording
      const startRecordingButton = screen.getByRole('button', { name: /iniciar grabación/i })
      await user.click(startRecordingButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error al acceder al micrófono/i)).toBeInTheDocument()
      })
    })

    it('should allow re-recording', async () => {
      const user = userEvent.setup()

      render(<CreateNotePage />)

      // Click on "Grabar audio" method
      const recordButton = screen.getByText('Grabar audio')
      await user.click(recordButton)

      // Start and stop recording
      const startRecordingButton = screen.getByRole('button', { name: /iniciar grabación/i })
      await user.click(startRecordingButton)

      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /detener grabación/i })
        return user.click(stopButton)
      })

      // Click "Grabar de nuevo"
      await waitFor(() => {
        const recordAgainButton = screen.getByText('Grabar de nuevo')
        return user.click(recordAgainButton)
      })

      // Should go back to initial recording state
      expect(screen.getByRole('button', { name: /iniciar grabación/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle note creation API errors', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      mockCreateNote.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      })

      render(<CreateNotePage />)

      // Click on "Subir archivo" method
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      // Upload a valid file
      const mockFile = new File(['audio content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      })
      const fileInput = screen.getByLabelText(/seleccionar archivo/i)
      await user.upload(fileInput, mockFile)

      // Click create note button
      const createButton = screen.getByText('Crear Nota')
      await user.click(createButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error al crear la nota/i)).toBeInTheDocument()
      })
    })

    it('should handle upload API errors', async () => {
      const user = userEvent.setup()
      
      mockCreateNote.mockResolvedValue({
        id: 'new-note-id',
        title: 'Nueva Nota',
        status: 'pending'
      })
      
      // Mock upload error
      mockUploadAudio.mockRejectedValue({
        response: {
          status: 413,
          data: { message: 'File too large' }
        }
      })

      render(<CreateNotePage />)

      // Click on "Subir archivo" method and upload file
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      const mockFile = new File(['audio content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      })
      const fileInput = screen.getByLabelText(/seleccionar archivo/i)
      await user.upload(fileInput, mockFile)

      // Click create note button
      const createButton = screen.getByText('Crear Nota')
      await user.click(createButton)

      // Should show upload error message
      await waitFor(() => {
        expect(screen.getByText(/error al subir el audio/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should go back to dashboard when clicking back button', async () => {
      const user = userEvent.setup()

      render(<CreateNotePage />)

      // Click back button
      const backButton = screen.getByRole('button', { name: /volver/i })
      await user.click(backButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should switch between creation methods', async () => {
      const user = userEvent.setup()

      render(<CreateNotePage />)

      // Initially should show method selection
      expect(screen.getByText('¿Cómo quieres crear tu nota?')).toBeInTheDocument()

      // Click on "Subir archivo"
      const fileUploadButton = screen.getByText('Subir archivo')
      await user.click(fileUploadButton)

      expect(screen.getByText('Seleccionar archivo de audio')).toBeInTheDocument()

      // Go back and select recording method
      const backToMethodButton = screen.getByRole('button', { name: /volver/i })
      await user.click(backToMethodButton)

      expect(screen.getByText('¿Cómo quieres crear tu nota?')).toBeInTheDocument()

      const recordButton = screen.getByText('Grabar audio')
      await user.click(recordButton)

      expect(screen.getByText('Grabar nueva nota')).toBeInTheDocument()
    })
  })
}