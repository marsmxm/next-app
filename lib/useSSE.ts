import { useEffect, useRef } from 'react'

interface UseSSEOptions {
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  enabled?: boolean
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const { onMessage, onError, onOpen, enabled = true } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const connectEventSource = () => {
      try {
        eventSourceRef.current = new EventSource(url)

        eventSourceRef.current.onopen = () => {
          console.log('SSE connection opened')
          onOpen?.()
        }

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            onMessage?.(data)
          } catch (error) {
            console.error('Error parsing SSE data:', error)
          }
        }

        eventSourceRef.current.onerror = (error) => {
          console.error('SSE error:', error)
          onError?.(error)
          
          // Attempt to reconnect after 3 seconds
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            reconnectTimeoutRef.current = setTimeout(connectEventSource, 3000)
          }
        }
      } catch (error) {
        console.error('Error creating EventSource:', error)
      }
    }

    connectEventSource()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [url, enabled, onMessage, onError, onOpen])

  return {
    close: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }
}