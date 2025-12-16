// Simple in-process Server-Sent Events (SSE) endpoint for message broadcasts
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed')

  // Initialize global clients array
  if (!global.__sse_clients) global.__sse_clients = []

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  // Heartbeat
  const keepAlive = setInterval(() => res.write(': heartbeat\n\n'), 20000)

  const client = res
  global.__sse_clients.push(client)

  req.on('close', () => {
    clearInterval(keepAlive)
    global.__sse_clients = (global.__sse_clients || []).filter(c => c !== client)
  })
}
