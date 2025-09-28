import { renderHook, act } from '@testing-library/react'
import { useAudioRecorder } from '../useAudioRecorder'

// Mock MediaRecorder
class MockMediaRecorder extends EventTarget implements MediaRecorder {
  state: RecordingState = 'inactive'
  stream?: MediaStream
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onerror: ((event: MediaRecorderErrorEvent) => void) | null = null
  onpause: ((event: Event) => void) | null = null
  onresume: ((event: Event) => void) | null = null
  onstart: ((event: Event) => void) | null = null
  onstop: ((event: Event) => void) | null = null

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    super()
    this.stream = stream
  }

  start() {
    this.state = 'recording'
    if (this.onstart) {
      this.onstart(new Event('start'))
    }
  }

  stop() {
    this.state = 'inactive'
    // Simulate data available
    if (this.ondataavailable) {
      const blob = new Blob(['test audio data'], { type: 'audio/wav' })
      this.ondataavailable(new BlobEvent('dataavailable', { data: blob }))
    }
    if (this.onstop) {
      this.onstop(new Event('stop'))
    }
  }

  pause() {
    this.state = 'paused'
    if (this.onpause) {
      this.onpause(new Event('pause'))
    }
  }

  resume() {
    this.state = 'recording'
    if (this.onresume) {
      this.onresume(new Event('resume'))
    }
  }

  requestData() {
    // Mock implementation
  }

  static isTypeSupported(type: string) {
    return true
  }

  // MediaRecorder specific properties
  mimeType = 'audio/wav'
  videoBitsPerSecond = 0
  audioBitsPerSecond = 0
}

// Replace the global MediaRecorder with our mock
;(global as any).MediaRecorder = MockMediaRecorder

describe('useAudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAudioRecorder())

    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.duration).toBe(0)
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.audioUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('starts recording successfully', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('handles getUserMedia error', async () => {
    // Mock getUserMedia to reject
    const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Permission denied'))
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true
    })

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.error).toContain('Permission denied')
  })

  it('stops recording and creates audio blob', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    // Start recording first
    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)

    // Stop recording
    act(() => {
      result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('mocked-url')
  })

  it('pauses and resumes recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    // Start recording
    await act(async () => {
      await result.current.startRecording()
    })

    // Pause recording
    act(() => {
      result.current.pauseRecording()
    })

    expect(result.current.isPaused).toBe(true)
    expect(result.current.isRecording).toBe(true) // Still recording, just paused

    // Resume recording
    act(() => {
      result.current.resumeRecording()
    })

    expect(result.current.isPaused).toBe(false)
  })

  it('updates duration during recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.duration).toBe(2)
  })

  it('resets state correctly', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    // Start and stop recording to have some state
    await act(async () => {
      await result.current.startRecording()
    })

    act(() => {
      result.current.stopRecording()
    })

    expect(result.current.audioBlob).not.toBeNull()
    expect(result.current.duration).toBeGreaterThan(0)

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.duration).toBe(0)
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.audioUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    const mockRevokeObjectURL = jest.spyOn(URL, 'revokeObjectURL')

    unmount()

    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
}