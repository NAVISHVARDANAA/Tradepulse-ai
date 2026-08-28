import { createClient } from '@supabase/supabase-js'
import { getPublicRuntimeConfig } from '../runtimeConfig'

const { supabaseUrl, supabaseAnonKey } = getPublicRuntimeConfig()

export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:false,
    flowType:'implicit',
  },
  global:{headers:{'x-application-name':'tradepulse-web'}},
})
