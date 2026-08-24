type EdgeHandler = (request: Request) => Response | Promise<Response>

const serviceCodePattern = /^[a-z0-9][a-z0-9-]{0,63}$/

type EdgeObservation = {
  event: 'edge_request_completed' | 'edge_request_unhandled'
  serviceCode: string
  requestId: string
  method: string
  status: number
  outcome: 'success' | 'customer_error' | 'service_error'
  latencyMs: number
}

function outcome(status: number): EdgeObservation['outcome'] {
  if (status >= 500) return 'service_error'
  if (status >= 400) return 'customer_error'
  return 'success'
}

function emitObservation(observation: EdgeObservation) {
  const serialized = JSON.stringify(observation)

  if (observation.outcome === 'service_error') {
    console.error(serialized)
    return
  }

  if (observation.outcome === 'customer_error') {
    console.warn(serialized)
    return
  }

  console.info(serialized)
}

/**
 * Emits one bounded, privacy-safe JSON event for every Edge invocation.
 * Request bodies, headers, query strings, user identifiers, IP addresses,
 * provider payloads and exception messages are deliberately excluded.
 */
export function observeEdgeHandler(serviceCode: string, handler: EdgeHandler): EdgeHandler {
  if (!serviceCodePattern.test(serviceCode)) {
    throw new Error('Invalid observability service code')
  }

  return async (request: Request) => {
    const startedAt = performance.now()

    try {
      const response = await handler(request)
      const requestId = response.headers.get('x-request-id') ?? crypto.randomUUID()
      const status = response.status

      emitObservation({
        event: 'edge_request_completed',
        serviceCode,
        requestId,
        method: request.method,
        status,
        outcome: outcome(status),
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      })

      return response
    } catch {
      emitObservation({
        event: 'edge_request_unhandled',
        serviceCode,
        requestId: crypto.randomUUID(),
        method: request.method,
        status: 500,
        outcome: 'service_error',
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      })

      throw new Error('Unhandled Edge Function failure')
    }
  }
}
