import { Accessibility, CheckCircle2, Download, LoaderCircle, Monitor, Smartphone } from 'lucide-react'
import { useCallback,useEffect,useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import { getExperiencePreferences,saveExperiencePreferences,type ExperiencePreferences } from '../lib/queries/customerExperience'

type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
const defaults:ExperiencePreferences={displayName:'',locale:'en-IN',timeZone:'Asia/Kolkata',theme:'system',density:'comfortable',reducedMotion:false,highContrast:false}

function applyPreferences(value:ExperiencePreferences){
  document.documentElement.dataset.theme=value.theme
  document.documentElement.dataset.density=value.density
  document.documentElement.classList.toggle('user-reduced-motion',value.reducedMotion)
  document.documentElement.classList.toggle('high-contrast',value.highContrast)
}

export function CustomerExperiencePanel(){
  const{session}=useAuth();const[value,setValue]=useState(defaults);const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);const[message,setMessage]=useState<string|null>(null);const[installPrompt,setInstallPrompt]=useState<InstallPromptEvent|null>(null)
  const refresh=useCallback(async()=>{if(!session)return;setLoading(true);try{const next=await getExperiencePreferences();setValue(next);applyPreferences(next);setError(null)}catch{setError('Your experience preferences could not be loaded.')}finally{setLoading(false)}},[session])
  useEffect(()=>{void refresh()},[refresh])
  useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent)};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[])
  if(!session)return null
  const update=<K extends keyof ExperiencePreferences>(key:K,next:ExperiencePreferences[K])=>setValue(current=>({...current,[key]:next}))
  const save=async()=>{setLoading(true);setError(null);setMessage(null);try{await saveExperiencePreferences(value);applyPreferences(value);setMessage('Profile and accessibility preferences saved.')}catch{setError('Your preferences could not be saved safely.')}finally{setLoading(false)}}
  const install=async()=>{if(!installPrompt)return;await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted')setMessage('TradePulse AI was added to this device.');setInstallPrompt(null)}
  return <section className="panel customer-experience-panel">
    <div className="panel-header"><div><p className="eyebrow">Profile + accessibility · Phase 4O</p><h2>Your TradePulse experience</h2></div><span className="status-badge"><Accessibility size={14}/> Accessible</span></div>
    <p className="panel-description">Keep your profile, regional display and accessibility choices consistent across signed-in devices.</p>
    {error&&<p className="error-message" role="alert">{error}</p>}{message&&<p className="success-message" role="status">{message}</p>}
    <div className="experience-grid">
      <label><span>Display name</span><input value={value.displayName} maxLength={80} autoComplete="name" onChange={event=>update('displayName',event.target.value)}/></label>
      <label><span>Language and region</span><select value={value.locale} onChange={event=>update('locale',event.target.value)}><option value="en-IN">English (India)</option><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option></select></label>
      <label><span>Time zone</span><select value={value.timeZone} onChange={event=>update('timeZone',event.target.value)}><option value="Asia/Kolkata">India</option><option value="Europe/London">United Kingdom</option><option value="America/New_York">US Eastern</option><option value="UTC">UTC</option></select></label>
      <label><span>Theme</span><select value={value.theme} onChange={event=>update('theme',event.target.value as ExperiencePreferences['theme'])}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
      <label><span>Display density</span><select value={value.density} onChange={event=>update('density',event.target.value as ExperiencePreferences['density'])}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      <div className="accessibility-options"><label><input type="checkbox" checked={value.reducedMotion} onChange={event=>update('reducedMotion',event.target.checked)}/> Reduce motion</label><label><input type="checkbox" checked={value.highContrast} onChange={event=>update('highContrast',event.target.checked)}/> High contrast</label></div>
    </div>
    <div className="experience-actions"><button className="primary-button" disabled={loading} onClick={()=>void save()}>{loading?<LoaderCircle className="spinning" size={16}/>:<CheckCircle2 size={16}/>} Save experience</button>{installPrompt?<button className="secondary-button" onClick={()=>void install()}><Download size={16}/> Install app</button>:<span className="install-status"><Smartphone size={16}/> Install appears on supported browsers</span>}</div>
    <p className="data-source-note"><Monitor size={14}/> The installable app caches only versioned static assets. Authentication, market data, research and account information remain network-only.</p>
  </section>
}
