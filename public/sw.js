const CACHE='tradepulse-static-v1'
const SHELL=['/','/manifest.webmanifest','/tradepulse-icon.svg']
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))))
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())))
self.addEventListener('fetch',event=>{
  const request=event.request
  if(request.method!=='GET')return
  const url=new URL(request.url)
  if(url.origin!==self.location.origin||url.pathname.startsWith('/functions/')||url.pathname.includes('supabase'))return
  if(request.mode==='navigate')event.respondWith(fetch(request).catch(()=>caches.match('/')))
  else if(url.pathname.startsWith('/assets/')||SHELL.includes(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})))
})
