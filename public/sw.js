self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{};}catch{payload={body:event.data?event.data.text():''};}
  const title=payload.title||'RamosCorp Comunidad';
  const options={
    body:payload.body||'Tienes una nueva notificación.',
    data:{url:payload.url||'/'},
    tag:payload.notificationId||'ramoscorp-community',
    renotify:false,
    timestamp:Date.now()
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data&&event.notification.data.url||'/',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(target);return;}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
