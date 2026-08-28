import type { Session } from '@supabase/supabase-js'

import { supabase } from '../supabase/client'

const returnTargets = new Set(['account-security', 'paper-investing'])
const queryParameters = [
  'code',
  'error',
  'error_code',
  'error_description',
  'sb_flow_id',
]

type AuthBootstrapResult = {
  session: Session | null
  error: string | null
}

let bootstrapPromise: Promise<AuthBootstrapResult> | null = null

function hashParameters(url: URL) {
  return new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '')
}

function callbackParameter(url: URL, hash: URLSearchParams, name: string) {
  return url.searchParams.get(name) ?? hash.get(name)
}

function returnTarget(url: URL) {
  const requested = url.searchParams.get('auth_return')
  return requested && returnTargets.has(requested) ? requested : 'paper-investing'
}

function cleanCallbackUrl(url: URL, target: string) {
  queryParameters.forEach((parameter) => url.searchParams.delete(parameter))
  url.searchParams.delete('auth_return')
  url.hash = `#${target}`
  window.history.replaceState(window.history.state, '', url.toString())
}

function callbackError(code: string | null) {
  if (code === 'otp_expired') {
    return 'This secure sign-in link expired or was already used. Request a new link and open only the newest email.'
  }
  return 'Secure sign-in could not be completed. Request a new link and open it in this browser.'
}

async function resolveAuthSession(): Promise<AuthBootstrapResult> {
  const url = new URL(window.location.href)
  const hash = hashParameters(url)
  const target = returnTarget(url)
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  const code = url.searchParams.get('code')
  const errorCode = callbackParameter(url, hash, 'error_code')
  const callbackFailure = callbackParameter(url, hash, 'error')
  const errorDescription = callbackParameter(url, hash, 'error_description')
  const expectsCallback = url.searchParams.has('auth_return')

  const { data: existing, error: existingError } = await supabase.auth
    .getSession()
    .catch(() => ({ data: { session: null }, error: new Error('Session recovery failed') }))

  if (callbackFailure || errorCode || errorDescription) {
    cleanCallbackUrl(url, target)
    if (existing.session) return { session: existing.session, error: null }
    return { session: null, error: callbackError(errorCode) }
  }

  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      return {
        session: data.session,
        error: error ? callbackError(error.code ?? null) : null,
      }
    } catch {
      return { session: existing.session, error: callbackError(null) }
    } finally {
      cleanCallbackUrl(url, target)
    }
  }

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      return {
        session: data.session,
        error: error ? callbackError(error.code ?? null) : null,
      }
    } catch {
      return { session: existing.session, error: callbackError(null) }
    } finally {
      cleanCallbackUrl(url, target)
    }
  }

  if (expectsCallback && !existing.session) {
    cleanCallbackUrl(url, target)
    return {
      session: null,
      error: 'The secure sign-in response did not contain a session. Request a new link and open only the newest email.',
    }
  }

  return {
    session: existing.session,
    error: existingError ? 'Your secure session could not be restored. Please sign in again.' : null,
  }
}

export function bootstrapAuthSession() {
  bootstrapPromise ??= resolveAuthSession()
  return bootstrapPromise
}

export function scrollToAuthReturnTarget() {
  const target = window.location.hash.slice(1)
  if (!returnTargets.has(target)) return

  let attempts = 0
  const scrollWhenMounted = () => {
    const element = document.getElementById(target)
    if (element) {
      element.scrollIntoView({ block: 'start' })
      return
    }

    attempts += 1
    if (attempts < 10) window.requestAnimationFrame(scrollWhenMounted)
  }

  window.requestAnimationFrame(scrollWhenMounted)
}

export function authRedirectUrl(target: 'account-security' | 'paper-investing') {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('auth_return', target)
  return url.toString()
}
