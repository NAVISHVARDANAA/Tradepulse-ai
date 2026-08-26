import { supabase } from '../supabase/client'

export type ExperiencePreferences={displayName:string;locale:string;timeZone:string;theme:'system'|'dark'|'light';density:'comfortable'|'compact';reducedMotion:boolean;highContrast:boolean}

export async function getExperiencePreferences():Promise<ExperiencePreferences>{
  const {data,error}=await supabase.from('profiles').select('display_name,locale,time_zone,theme_preference,display_density,reduced_motion,high_contrast').single()
  if(error)throw error
  return{displayName:data.display_name??'',locale:data.locale,timeZone:data.time_zone,theme:data.theme_preference,density:data.display_density,reducedMotion:data.reduced_motion,highContrast:data.high_contrast}
}

export async function saveExperiencePreferences(value:ExperiencePreferences){
  const{error}=await supabase.rpc('set_customer_experience_preferences',{p_display_name:value.displayName,p_locale:value.locale,p_time_zone:value.timeZone,p_theme:value.theme,p_density:value.density,p_reduced_motion:value.reducedMotion,p_high_contrast:value.highContrast})
  if(error)throw error
}

export async function saveCustomerOnboarding(currentStep:number,status:'in_progress'|'completed'|'skipped'){
  const{data}=await supabase.auth.getUser()
  if(!data.user)return
  const{error}=await supabase.rpc('save_customer_onboarding',{p_current_step:currentStep,p_status:status,p_tour_version:'product-tour-v3'})
  if(error)throw error
}
