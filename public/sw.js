self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{};}catch{payload={body:event.data?event.data.text():''};}
  const title=payload.title||'Ramoscorp Comunidad';
  const options={
    body:payload.body||'Tienes una nueva notificación.',
    icon:payload.icon||'/ramoscorp-icon.svg',
    badge:payload.badge||'/ramoscorp-icon.svg',
    image:payload.image||undefined,
    data:{url:payload.url||'/'},
    tag:payload.notificationId||'ramoscorp-community',
    renotify:false,
    timestamp:Date.now()
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let target;
  try{
    const candidate=new URL(event.notification.data&&event.notification.data.url||'/',self.location.origin);
    target=candidate.origin===self.location.origin?candidate.href:self.location.origin+'/';
  }catch{
    target=self.location.origin+'/';
  }
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus'in client){
        await client.focus();
        if('navigate'in client)await client.navigate(target);
        return;
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
