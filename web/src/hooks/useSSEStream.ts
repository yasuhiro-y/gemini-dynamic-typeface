'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSSEStreamOptions {
  onError?: (error: Error) => void;
}

export interface UseSSEStreamReturn<T> {
  isStreaming: boolean;
  start: (url: string, body: object, onMessage: (data: T) => void) => Promise<void>;
  cancel: () => void;
}

export function useSSEStream<T = unknown>(options?: UseSSEStreamOptions): UseSSEStreamReturn<T> {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const start = useCallback(async (
    url: string,
    body: object,
    onMessage: (data: T) => void
  ) => {
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (each ends with \n\n)
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          // Extract data from the message
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(6)) as T;
              onMessage(data);
            } catch {
              // Skip invalid JSON
            }
          }

          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        return;
      }
      options?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [options]);

  return {
    isStreaming,
    start,
    cancel,
  };
}
