// Store active connections
export const connections = new Set<ReadableStreamDefaultController>()

// Function to broadcast updates to all connected clients
export function broadcastUpdate(data: any) {
  const message = JSON.stringify({ type: 'update', data, timestamp: new Date().toISOString() })
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(`data: ${message}\n\n`)
    } catch (error) {
      // Remove failed connections
      connections.delete(controller)
    }
  })
}
