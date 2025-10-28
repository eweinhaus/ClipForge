import { renderHook, act } from '@testing-library/react';
import { useThumbnailPreload } from '../../hooks/useThumbnailPreload';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.IntersectionObserver = mockIntersectionObserver;

describe('useThumbnailPreload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    expect(result.current.isVisible).toBe(false);
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.cachedSrc).toBeUndefined();
  });

  test('sets up IntersectionObserver on mount', () => {
    renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );
  });

  test('loads thumbnail when visible', async () => {
    const { result } = renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    // Simulate intersection callback
    const callback = mockIntersectionObserver.mock.calls[0][0];
    act(() => {
      callback([{ isIntersecting: true }]);
    });
    
    expect(result.current.isVisible).toBe(true);
  });

  test('handles image load success', async () => {
    const { result } = renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    // Mock successful image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: null
    };
    
    global.Image = jest.fn(() => mockImage);
    
    // Trigger visibility
    const callback = mockIntersectionObserver.mock.calls[0][0];
    act(() => {
      callback([{ isIntersecting: true }]);
    });
    
    // Simulate successful load
    act(() => {
      mockImage.onload();
    });
    
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  test('handles image load error', async () => {
    const { result } = renderHook(() => useThumbnailPreload('test-id', 'invalid-thumbnail.jpg'));
    
    // Mock failed image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: null
    };
    
    global.Image = jest.fn(() => mockImage);
    
    // Trigger visibility
    const callback = mockIntersectionObserver.mock.calls[0][0];
    act(() => {
      callback([{ isIntersecting: true }]);
    });
    
    // Simulate load error
    act(() => {
      mockImage.onerror();
    });
    
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  test('caches loaded thumbnails', async () => {
    const { result } = renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    // Mock successful image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: null
    };
    
    global.Image = jest.fn(() => mockImage);
    
    // Trigger visibility and load
    const callback = mockIntersectionObserver.mock.calls[0][0];
    act(() => {
      callback([{ isIntersecting: true }]);
    });
    
    act(() => {
      mockImage.onload();
    });
    
    expect(result.current.cachedSrc).toBe('test-thumbnail.jpg');
  });

  test('cleans up observer on unmount', () => {
    const mockDisconnect = jest.fn();
    mockIntersectionObserver.mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: mockDisconnect,
    }));
    
    const { unmount } = renderHook(() => useThumbnailPreload('test-id', 'test-thumbnail.jpg'));
    
    unmount();
    
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
