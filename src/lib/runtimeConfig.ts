export type PublicRuntimeConfig={supabaseUrl:string;supabaseAnonKey:string}

function requirePublicValue(name:string,value:string|undefined){if(!value?.trim())throw new Error(`Missing ${name} environment variable.`);return value.trim()}

export function getPublicRuntimeConfig():PublicRuntimeConfig{
  const supabaseUrl=requirePublicValue('VITE_SUPABASE_URL',import.meta.env.VITE_SUPABASE_URL)
  const supabaseAnonKey=requirePublicValue('VITE_SUPABASE_ANON_KEY',import.meta.env.VITE_SUPABASE_ANON_KEY)
  let parsed:URL
  try{parsed=new URL(supabaseUrl)}catch{throw new Error('VITE_SUPABASE_URL must be a valid URL.')}
  const localHost=['localhost','127.0.0.1'].includes(parsed.hostname)
  if(import.meta.env.PROD&&parsed.protocol!=='https:')throw new Error('Production Supabase connections require HTTPS.')
  if(!localHost&&!parsed.hostname.endsWith('.supabase.co'))throw new Error('VITE_SUPABASE_URL must use an approved Supabase origin.')
  if(supabaseAnonKey.length<32||/service[_-]?role|secret/i.test(supabaseAnonKey))throw new Error('VITE_SUPABASE_ANON_KEY is not a valid public client key.')
  return{supabaseUrl:parsed.origin,supabaseAnonKey}
}
