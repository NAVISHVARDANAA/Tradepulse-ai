export const DEMO_MODE_EVENT = 'tradepulse-demo-mode-change'
export const DEMO_MODE_KEY = 'tradepulse-demo-mode-v1'

export function isDemoModeEnabled() {
  return sessionStorage.getItem(DEMO_MODE_KEY) === 'enabled'
}

export function setDemoModeEnabled(enabled: boolean) {
  if (enabled) sessionStorage.setItem(DEMO_MODE_KEY, 'enabled')
  else sessionStorage.removeItem(DEMO_MODE_KEY)

  window.dispatchEvent(new CustomEvent(DEMO_MODE_EVENT, { detail: { enabled } }))
}
