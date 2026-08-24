const DEFAULT_MAX_JSON_BYTES = 16 * 1024
const MAX_SECRET_BYTES = 512

function configuredBrowserOrigin() {
  const candidate = Deno.env.get('TRADEPULSE_WEB_ORIGIN')?.trim()
  if (!candidate) return '*'

  try {
    const url = new URL(candidate)
    const isLocalDevelopment =
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    const isSecureOrigin = url.protocol === 'https:'

    if (
      url.origin === candidate &&
      (isSecureOrigin || isLocalDevelopment) &&
      !url.username &&
      !url.password
    ) {
      return candidate
    }
  } catch {
    // Fall through to a non-matching origin instead of reflecting invalid input.
  }

  return 'null'
}

const apiSecurityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

// Browser-facing functions may accept bearer tokens, but never advertise the
// scheduler-only x-sync-secret header through CORS.
export const corsHeaders = {
  'Access-Control-Allow-Origin': configuredBrowserOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'retry-after, x-request-id',
  Vary: 'Origin',
}

function responseHeaders(includeBrowserCors: boolean, requestId: string) {
  return {
    ...(includeBrowserCors ? corsHeaders : {}),
    ...apiSecurityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-ID': requestId,
  }
}

function responseBody(body: unknown, status: number, requestId: string) {
  if (
    status >= 400 &&
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body)
  ) {
    return { ...body, requestId }
  }
  return body
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  const requestId = crypto.randomUUID()
  return new Response(JSON.stringify(responseBody(body, status, requestId)), {
    status,
    headers: {
      ...responseHeaders(true, requestId),
      ...Object.fromEntries(new Headers(extraHeaders)),
    },
  })
}

export function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      ...apiSecurityHeaders,
      'X-Request-ID': crypto.randomUUID(),
    },
  })
}

export function internalJsonResponse(body: unknown, status = 200) {
  const requestId = crypto.randomUUID()
  return new Response(JSON.stringify(responseBody(body, status, requestId)), {
    status,
    headers: responseHeaders(false, requestId),
  })
}

export class RequestValidationError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage)
    this.name = 'RequestValidationError'
  }
}

export async function parseJsonBody<T>(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<T> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json' && !contentType?.endsWith('+json')) {
    throw new RequestValidationError(415, 'Content-Type must be application/json')
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestValidationError(413, 'Request body is too large')
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestValidationError(413, 'Request body is too large')
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new RequestValidationError(400, 'Invalid JSON request')
  }
}

async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  )
}

export async function hasValidInternalSecret(request: Request, environmentName: string) {
  const expected = Deno.env.get(environmentName)
  const supplied = request.headers.get('x-sync-secret')

  if (
    !expected ||
    !supplied ||
    new TextEncoder().encode(expected).byteLength > MAX_SECRET_BYTES ||
    new TextEncoder().encode(supplied).byteLength > MAX_SECRET_BYTES
  ) {
    return false
  }

  const [expectedDigest, suppliedDigest] = await Promise.all([
    sha256(expected),
    sha256(supplied),
  ])

  let mismatch = 0
  for (let index = 0; index < expectedDigest.length; index += 1) {
    mismatch |= expectedDigest[index] ^ suppliedDigest[index]
  }

  return mismatch === 0
}
