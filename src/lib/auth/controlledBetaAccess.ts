import { supabase } from '../supabase/client'
import { authRedirectUrl } from './browserCallback'

export type ControlledBetaReturnTarget = 'account-security' | 'paper-investing'

export const CONTROLLED_BETA_SIGN_IN_MESSAGE =
  'Access is invite-only. If this email is approved, a secure sign-in link will arrive shortly.'

export async function requestControlledBetaSignIn(
  email: string,
  returnTarget: ControlledBetaReturnTarget,
) {
  try {
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: authRedirectUrl(returnTarget),
        shouldCreateUser: false,
      },
    })
  } catch {
    // Approved and unknown addresses receive the same customer-safe response.
  }
}
