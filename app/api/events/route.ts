import { NextRequest } from 'next/server'
import { connections } from '@/lib/sse-utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return new Response('Date parameter is required', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      connections.add(controller)
      
      // Send initial connection message
      const data = JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })
      controller.enqueue(`data: ${data}\n\n`)

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })
          controller.enqueue(`data: ${heartbeatData}\n\n`)
        } catch (error) {
          clearInterval(heartbeat)
          connections.delete(controller)
        }
      }, 30000) // Send heartbeat every 30 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        connections.delete(controller)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
