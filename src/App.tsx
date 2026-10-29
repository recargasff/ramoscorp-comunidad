import {useEffect,useRef} from 'react';
import {supabase} from './lib/supabase';

const html = `
<div class="app">
  <header>
    <div class="top">
      <button id="mn" aria-label="Abrir menú"><svg class="i"><use href="#menu"/></svg></button>
      <button id="bk" aria-label="Volver" hidden><svg class="i"><use href="#back"/></svg></button>
      <span class="brand" id="ttl">Comunidad</span>
      <a class="av" id="topav" href="#perfil" aria-label="Tu perfil">T</a>
    </div>
    <div class="tabs" id="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="all">Para ti</button>
      <button role="tab" aria-selected="false" data-tab="mine">Mis grupos</button>
    </div>
    <div id="tools" hidden>
      <input id="q" type="search" placeholder="Buscar grupos" aria-label="Buscar grupos">
      <div class="chips" id="chips"></div>
    </div>
  </header>
  <main>
    <div id="vFeed">
      <div class="comp">
        <span class="av" id="composerAv">T</span>
        <div class="grow">
          <textarea id="txt" rows="2" placeholder="¿Qué quieres compartir con la comunidad?" aria-label="Nueva publicación"></textarea>
          <div class="pv" id="imgP" hidden><img id="imgV" alt="Vista previa"><button id="imgX" aria-label="Quitar imagen">✕</button></div>
          <input id="lk" type="url" placeholder="Pega un enlace o video (https://…)" aria-label="Enlace" hidden>
          <textarea id="cd" class="mono" rows="4" placeholder="Pega tu código" aria-label="Código" spellcheck="false" hidden></textarea>
          <div class="tools"><label aria-label="Agregar imagen"><input type="file" id="fi" accept="image/*" hidden><svg class="i"><use href="#image"/></svg></label><button id="tl" aria-label="Agregar enlace o video"><svg class="i"><use href="#link"/></svg></button><button id="tc" aria-label="Agregar código"><svg class="i"><use href="#code"/></svg></button></div>
          <div class="row" style="padding:0;border:0">
            <select id="grpSel" aria-label="Grupo"></select>
            <button class="pub" id="pub" disabled>Publicar</button>
          </div>
        </div>
      </div>
      <div id="feed"></div>
    </div>
    <div id="view" hidden></div>
  </main>
</div>
<nav class="bar"><div>
  <a href="#" data-n="f" aria-label="Inicio"><svg class="i"><use href="#home"/></svg></a>
  <a href="#grupos" data-n="g" aria-label="Grupos"><svg class="i"><use href="#users"/></svg></a>
  <button class="new" id="new" aria-label="Crear publicación"><svg class="i"><use href="#plus"/></svg></button>
  <a href="#avisos" data-n="n" aria-label="Avisos"><svg class="i"><use href="#bell"/></svg></a>
  <a href="#perfil" data-n="u" aria-label="Perfil"><svg class="i"><use href="#user"/></svg></a>
</div></nav>
<div class="back" id="dback" hidden></div>
<aside class="drawer" id="drawer" aria-label="Menú">
  <div class="dh"><span class="av" id="dav">T</span><div><b id="dn">Tú</b><span class="d" id="de"></span></div></div>
  <div class="dl">
    <a href="#reportes">Reportes realizados</a>
    <a href="#feedback">Feedback enviado</a>
    <a href="#invitacion">Código de invitación</a>
    <button id="swa">Cambiar de cuenta</button>
    <button class="danger" id="lo">Cerrar sesión</button>
  </div>
</aside>
<section id="login" aria-label="Iniciar sesión">
  <div class="lw">
    <div class="mark">RamosCorpTech</div>
    <h1>Bienvenido a la comunidad</h1>
    <p class="d" id="ls">Inicia sesión para entrar a la comunidad.</p>
    <label class="fl">Correo electrónico<input id="em" type="email" autocomplete="email" inputmode="email"></label>
    <label class="fl">Contraseña<input id="pw" type="password" autocomplete="current-password"></label>
    <p class="err" id="le" role="alert"></p>
    <button class="pub wide" id="lb">Iniciar sesión</button>
    <div class="or"><span>o</span></div>
    <button class="join wide" id="rc">Continuar con RamosCorpTech</button>
  </div>
</section>
<div id="intro" hidden aria-hidden="true"><div><div class="w" id="iw"></div><div class="ln"></div></div></div>
<div class="back" id="back" hidden></div>
<div class="sheet" id="sheet" role="dialog" aria-label="Reportar publicación" hidden>
  <h2>Reportar publicación</h2>
  <label><input type="radio" name="r" value="spam"> Es spam</label>
  <label><input type="radio" name="r" value="harassment"> Contenido ofensivo</label>
  <label><input type="radio" name="r" value="other"> Información falsa</label>
  <label><input type="radio" name="r" value="other"> Problema técnico</label>
  <div class="btns"><button id="cancel">Cancelar</button><button class="go" id="send" disabled>Enviar reporte</button></div>
</div>
<div id="toast" role="status" hidden></div>
`;

const icons = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></symbol>
<symbol id="users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.3c2.2.6 3.5 2.6 3.5 5.7"/></symbol>
<symbol id="plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol><symbol id="bell" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></symbol>
<symbol id="user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></symbol><symbol id="chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></symbol>
<symbol id="heart" viewBox="0 0 24 24"><path d="M12 20s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.1-8 11-8 11z"/></symbol><symbol id="share" viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></symbol>
<symbol id="more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></symbol><symbol id="image" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></symbol>
<symbol id="link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></symbol><symbol id="code" viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></symbol>
<symbol id="menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol><symbol id="back" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
</defs></svg>`;

type Group={id:string;name:string;description:string;emoji:string;category:string;image_url:string;rules:string;joined:boolean;members:number};
type Post={id:string;author_id:string;body:string;created_at:string;author:string;avatar_url:string|null;likes:number;liked:boolean;content:any};
const esc=(s:any)=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]!));
const initials=(s:string)=>s.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'T';
const ago=(s:string)=>{const n=Math.max(0,Math.floor((Date.now()-new Date(s).getTime())/60000));return n<1?'ahora':n<60?n+' min':n<1440?Math.floor(n/60)+' h':Math.floor(n/1440)+' d';};
const parseBody=(body:string)=>{try{const x=JSON.parse(body);if(x&&x.__rcPost===1)return x;}catch{}return {__rcPost:1,text:body,link:'',code:'',image:''};};
const hrefFor=(hash:string)=>{location.hash=hash;};
export default function App(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  root.innerHTML=icons+html;
  const $=(id:string)=>root.querySelector<HTMLElement>('#'+id)!;
  const app=()=>root.querySelector<HTMLElement>('.app')!;
  let session:any=null,user:any=null,profile:any=null,groups:Group[]=[],posts:Post[]=[],comments:any[]=[],notifications:any[]=[],reports:any[]=[],feedbacks:any[]=[];
  let tab='all',category='Todos',query='',imageFile:File|null=null,reportTarget:{type:string,id:string}|null=null,reportLabel='';
  const cats=['Todos'];const activeJoined=()=>groups.filter(g=>g.joined&&!g.rules?.includes('[readonly]'));
  const toast=(message:string)=>{const el=$('toast');el.textContent=message;el.hidden=false;window.setTimeout(()=>{el.hidden=true},2600)};
  const icon=(name:string)=>'<svg class="i"><use href="#'+name+'"/></svg>';
  const avatar=(p:any,sizeClass='')=>p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc(initials(p?.display_name||p?.email||'T'));
  const intro=()=>{const el=$('intro');$('iw').innerHTML='RamosCorpTech'.split('').map((c,i)=>'<span style="--i:'+i+'">'+esc(c)+'</span>').join('');el.hidden=false;el.classList.remove('out');window.setTimeout(()=>el.classList.add('out'),1600);window.setTimeout(()=>el.hidden=true,2000)};
  const drawer=(open:boolean)=>{$('drawer').classList.toggle('open',open);$('dback').hidden=!open;if(open){$('dav').innerHTML=avatar(profile);$('dn').textContent=profile?.display_name||'Tú';$('de').textContent=user?.email||'Cuenta RamosCorpTech'}};
  const closeSheet=()=>{$('sheet').hidden=true;$('back').hidden=true;root.querySelectorAll<HTMLInputElement>('input[name="r"]').forEach(r=>r.checked=false);($('send') as HTMLButtonElement).disabled=true;reportTarget=null;};
  const selectGroupOptions=()=>{const sel=$('grpSel') as HTMLSelectElement;const old=sel.value;const js=activeJoined();sel.innerHTML=js.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.name)+'</option>').join('');if(js.some(g=>g.id===old))sel.value=old;($('txt') as HTMLTextAreaElement).disabled=!js.length;($('txt') as HTMLTextAreaElement).placeholder=js.length?'¿Qué quieres compartir con la comunidad?':'Únete a un grupo para publicar';updatePublish();};
  const updatePublish=()=>{const text=($('txt') as HTMLTextAreaElement).value.trim(),link=($('lk') as HTMLInputElement).value.trim(),code=($('cd') as HTMLTextAreaElement).value.trim();($('pub') as HTMLButtonElement).disabled=!(activeJoined().length&&(text||imageFile||link||code));};
  const getGroup=(id:string)=>groups.find(g=>g.id===id);
  const attachment=(p:Post)=>{let out='';const c=p.content;if(c.image)out+='<img class="pi" src="'+esc(c.image)+'" alt="Imagen adjunta">';if(c.link){let u:URL|undefined;try{u=new URL(c.link)}catch{}const video=!!u&&/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname);out+='<a class="lk" href="'+esc(c.link)+'" target="_blank" rel="noopener noreferrer">'+icon(video?'chat':'link')+'<b>'+esc(video?'Abrir video':'Abrir enlace')+'</b><small>'+esc(c.link)+'</small></a>';}if(c.code)out+='<div class="cb"><pre><code>'+esc(c.code)+'</code></pre><button class="join" data-copy="'+esc(p.id)+'">Copiar</button></div>';return out;};
  const renderFeed=()=>{const list=posts.filter(p=>(tab==='all'||!!getGroup(p.content.group_id)?.joined)&&(!query||(p.content.text+' '+p.author).toLowerCase().includes(query.toLowerCase())));$('feed').innerHTML=list.length?list.map(p=>{const g=getGroup(p.content.group_id);return '<article class="post"><span class="av">'+avatar({display_name:p.author,avatar_url:p.avatar_url})+'</span><div class="grow"><div class="meta"><b>'+esc(p.author)+'</b><span>@'+esc(p.author_id.slice(0,8))+' · '+ago(p.created_at)+'</span>'+(g?'<a class="tag" href="#g-'+esc(g.id)+'">'+esc(g.name)+'</a>':'')+'<button class="more" data-more="'+esc(p.id)+'" aria-label="Más opciones">'+icon('more')+'</button></div>'+(p.content.text?'<p>'+esc(p.content.text)+'</p>':'')+attachment(p)+'<div class="acts"><a href="#p-'+esc(p.id)+'" aria-label="Comentarios">'+icon('chat')+p.content.commentsCount+'</a><button data-like="'+esc(p.id)+'" class="'+(p.liked?'on':'')+'" aria-label="Me gusta" aria-pressed="'+p.liked+'">'+icon('heart')+p.likes+'</button><button data-share="'+esc(p.id)+'" aria-label="Compartir">'+icon('share')+'</button></div></div></article>';}).join(''):'<p class="empty">Aún no hay publicaciones. Únete a un grupo y comparte la primera.</p>';};
  const renderGroups=(g?:Group)=>{if(!g){const list=groups.filter(x=>(category==='Todos'||x.category===category)&&(x.name+' '+x.description).toLowerCase().includes(query.toLowerCase()));$('view').innerHTML=list.length?list.map(x=>'<div class="row"><span class="av">'+esc(x.emoji||initials(x.name))+'</span><a class="main" href="#g-'+esc(x.id)+'"><b>'+esc(x.name)+'</b><span class="tag">'+esc(x.category)+'</span><span class="d">'+esc(x.description)+'</span></a><button class="join '+(x.joined?'on':'')+'" data-j="'+esc(x.id)+'">'+(x.joined?'Unido':'Unirme')+'</button></div>').join(''):'<p class="empty">No hay grupos disponibles.</p>';return;}
   const msgs=comments.filter(m=>m.group_id===g.id);$('view').innerHTML='<section class="gh"><span class="tag">'+esc(g.category)+'</span><p>'+esc(g.description)+'</p><div class="gm"><span>'+g.members+' miembros</span><button class="join '+(g.joined?'on':'')+'" data-j="'+esc(g.id)+'">'+(g.joined?'Unido':'Unirme')+'</button></div></section>'+msgs.map(m=>'<div class="msg"><span class="av">'+avatar({display_name:m.author,avatar_url:m.avatar_url})+'</span><div class="grow"><b>'+esc(m.author)+'</b><span>'+ago(m.created_at)+'</span><p>'+esc(m.body)+'</p></div></div>').join('')+(g.joined?'<div class="mc"><textarea id="mt" rows="1" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea><button class="pub" id="ms" disabled>Enviar</button></div>':'<p class="notice">Únete al grupo para participar en la conversación.</p>');
   const mt=$('mt') as HTMLTextAreaElement;if(mt){mt.addEventListener('input',()=>{($('ms') as HTMLButtonElement).disabled=!mt.value.trim()});$('ms').addEventListener('click',async()=>{const body=mt.value.trim();if(!body)return;const {error}=await supabase.from('community_group_messages').insert({group_id:g.id,author_id:user.id,body});if(error)toast('No se pudo enviar el mensaje.');else{await loadGroupMessages(g.id);renderGroups(g);toast('Mensaje enviado.');}});}
  };
  const renderPost=(p:Post)=>{const g=getGroup(p.content.group_id);const cm=comments.filter(c=>c.post_id===p.id);$('view').innerHTML='<article class="post"><span class="av">'+avatar({display_name:p.author,avatar_url:p.avatar_url})+'</span><div class="grow"><div class="meta"><b>'+esc(p.author)+'</b><span>@'+esc(p.author_id.slice(0,8))+' · '+ago(p.created_at)+'</span>'+(g?'<a class="tag" href="#g-'+esc(g.id)+'">'+esc(g.name)+'</a>':'')+'</div>'+(p.content.text?'<p>'+esc(p.content.text)+'</p>':'')+attachment(p)+'</div></article>'+(cm.length?cm.map(c=>'<div class="msg"><span class="av">'+avatar({display_name:c.author,avatar_url:c.avatar_url})+'</span><div class="grow"><div class="meta"><b>'+esc(c.author)+'</b><span>'+ago(c.created_at)+'</span><button class="more" data-comment-more="'+esc(c.id)+'" aria-label="Reportar comentario">'+icon('more')+'</button></div><p>'+esc(c.body)+'</p></div></div>').join(''):'<p class="notice">Aún no hay comentarios. Escribe el primero.</p>')+'<div class="mc"><textarea id="ct" rows="1" placeholder="Escribe un comentario" aria-label="Comentario"></textarea><button class="pub" id="cs" disabled>Comentar</button></div>';
    const ct=$('ct') as HTMLTextAreaElement;ct.addEventListener('input',()=>{($('cs') as HTMLButtonElement).disabled=!ct.value.trim()});$('cs').addEventListener('click',async()=>{const body=ct.value.trim();if(!body)return;const {error}=await supabase.from('community_comments').insert({post_id:p.id,author_id:user.id,body});if(error)toast('No se pudo publicar el comentario.');else{await loadComments(p.id);renderPost(p);toast('Comentario publicado.');}});
  };
  const renderNotifications=()=>{$('view').innerHTML='<div class="gm" style="padding:12px 16px"><span>'+notifications.filter(n=>!n.read_at).length+' sin leer</span><button class="join" id="rd">Marcar todas como leídas</button></div>'+(notifications.length?notifications.map(n=>'<button class="msg nt" data-r="'+esc(n.id)+'" style="width:100%;text-align:left"><span class="av">'+icon('bell')+'</span><div class="grow"><p style="margin:0">'+esc(n.title)+'</p><small>'+esc(n.body||ago(n.created_at))+'</small></div>'+(!n.read_at?'<i class="ud"></i>':'')+'</button>').join(''):'<p class="empty">No tienes notificaciones.</p>');};
  const renderProfile=()=>{$('view').innerHTML='<section class="gh"><div class="pr"><span class="av">'+avatar(profile)+'</span><div><b>'+esc(profile?.display_name||'Tú')+'</b><span class="d">@'+esc(user.email||'cuenta')+'</span></div></div><p>'+esc(profile?.bio||'Cuéntale a la comunidad quién eres.')+'</p><div class="gm"><span>'+posts.filter(p=>p.author_id===user.id).length+' publicaciones · '+groups.filter(g=>g.joined).length+' grupos</span></div></section><section class="gh"><label class="fl">Nombre<input id="pn" maxlength="60" value="'+esc(profile?.display_name||'')+'"></label><label class="fl">Biografía<textarea id="pb" rows="2" maxlength="280">'+esc(profile?.bio||'')+'</textarea></label><button class="pub" id="ps">Guardar perfil</button></section><section class="gh"><label class="fl">Foto de perfil<input id="pf" type="file" accept="image/*"></label><p class="d" style="margin:0 0 10px">Cuenta: '+esc(user.email||'Cuenta RamosCorpTech')+'</p><button class="join" id="lo2">Cerrar sesión</button></section>'+(posts.some(p=>p.author_id===user.id)?posts.filter(p=>p.author_id===user.id).map(p=>'<article class="post"><div class="grow"><div class="meta"><span>'+ago(p.created_at)+'</span></div>'+(p.content.text?'<p>'+esc(p.content.text)+'</p>':'')+attachment(p)+'</div></article>').join(''):'<p class="notice">Todavía no has publicado nada.</p>');
   $('ps').addEventListener('click',async()=>{const display_name=($('pn') as HTMLInputElement).value.trim()||'Miembro',bio=($('pb') as HTMLTextAreaElement).value.trim();const {error}=await supabase.from('community_profiles').upsert({user_id:user.id,display_name,bio,interests:profile?.interests||[],avatar_url:profile?.avatar_url||null},{onConflict:'user_id'});if(error)toast('No se pudo guardar el perfil.');else{profile={...profile,display_name,bio};toast('Perfil guardado.');renderProfile();}});
   $('pf').addEventListener('change',async()=>{const file=($('pf') as HTMLInputElement).files?.[0];if(!file)return;if(file.size>3*1024*1024){toast('La imagen pesa más de 3 MB.');return;}const ext=file.name.split('.').pop()?.toLowerCase()||'jpg',path=user.id+'/'+crypto.randomUUID()+'.'+ext;const {error}=await supabase.storage.from('community-avatars').upload(path,file,{upsert:true,contentType:file.type});if(error){toast('No se pudo subir la foto.');return;}const {data}=supabase.storage.from('community-avatars').getPublicUrl(path);const {error:pe}=await supabase.from('community_profiles').upsert({user_id:user.id,display_name:profile?.display_name||'Miembro',bio:profile?.bio||'',interests:profile?.interests||[],avatar_url:data.publicUrl},{onConflict:'user_id'});if(pe){toast('Foto subida, pero no se pudo guardar el perfil.');return;}profile={...profile,avatar_url:data.publicUrl};$('topav').innerHTML=avatar(profile);$('composerAv').innerHTML=avatar(profile);toast('Foto actualizada.');renderProfile();});
   $('lo2').addEventListener('click',()=>supabase.auth.signOut());
  };
  const renderReports=()=>{$('view').innerHTML=reports.length?reports.map(r=>'<div class="msg"><div class="grow"><div class="meta"><span class="tag">'+esc(r.target_type)+'</span><span>'+esc(r.reason)+' · '+ago(r.created_at)+'</span></div><p>'+esc(r.details||'Reporte enviado')+'</p></div></div>').join(''):'<p class="empty">Todavía no has enviado reportes.</p>';};
  const renderFeedback=()=>{$('view').innerHTML='<section class="gh"><label class="fl">Cuéntanos qué mejorarías<textarea id="fb" rows="3" maxlength="5000"></textarea></label><button class="pub" id="fs" disabled>Enviar feedback</button></section>'+(feedbacks.length?feedbacks.map(f=>'<div class="msg"><div class="grow"><p>'+esc(f.message)+'</p><small>'+ago(f.created_at)+'</small></div></div>').join(''):'<p class="notice">Tus comentarios enviados aparecerán aquí.</p>');const fb=$('fb') as HTMLTextAreaElement;fb.addEventListener('input',()=>{($('fs') as HTMLButtonElement).disabled=!fb.value.trim()});$('fs').addEventListener('click',async()=>{const message=fb.value.trim();if(message.length<10){toast('Escribe al menos 10 caracteres.');return;}const {error}=await supabase.from('contact_requests').insert({name:profile?.display_name||user.email||'Miembro',email:user.email,subject:'Feedback de RamosCorp Comunidad',message});if(error)toast('No se pudo enviar el feedback.');else{feedbacks.unshift({message,created_at:new Date().toISOString()});toast('Feedback enviado.');renderFeedback();}});
  };
  const renderInvite=()=>{const code='RCT-'+user.id.replace(/-/g,'').slice(0,6).toUpperCase();$('view').innerHTML='<section class="gh"><span class="d">Tu código de invitación</span><div class="gm" style="font-size:22px;font-weight:800;color:var(--text);margin-top:6px"><span>'+esc(code)+'</span><button class="join" id="cp">Copiar</button></div><p class="d">Código de referencia de tu cuenta. El sistema de canje aún no está configurado.</p></section><section class="gh"><label class="fl">¿Tienes un código?<input id="ci" placeholder="Escribe un código"></label><button class="pub" id="cr" disabled>Canjear código</button></section>';$('cp').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);toast('Código copiado.');}catch{toast('No se pudo copiar el código.');}});const ci=$('ci') as HTMLInputElement;ci.addEventListener('input',()=>{($('cr') as HTMLButtonElement).disabled=!ci.value.trim()});$('cr').addEventListener('click',()=>toast('El canje de códigos no está conectado a una tabla de invitaciones.'));};
  const render=()=>{const hash=location.hash,m=/^#g-([a-z0-9-]+)$/.exec(hash),g=m&&getGroup(m[1]),pm=/^#p-([a-z0-9-]+)$/.exec(hash),pp=pm&&posts.find(x=>x.id===pm[1]),v=g?'d':pp?'c':hash==='#grupos'?'l':hash==='#avisos'?'n':hash==='#perfil'?'u':hash==='#reportes'?'r':hash==='#feedback'?'k':hash==='#invitacion'?'i':'f';
   $('vFeed').hidden=v!=='f';$('view').hidden=v==='f';$('tabs').hidden=v!=='f';$('tools').hidden=v!=='l';$('bk').hidden=v!=='d'&&v!=='c';$('mn').hidden=!$('bk').hidden;
   $('ttl').textContent=({d:g?.name,l:'Grupos',c:'Publicación',n:'Avisos',u:'Perfil',r:'Reportes',k:'Feedback',i:'Invitación',f:'Comunidad'} as any)[v];
   const nv=({f:'f',c:'f',l:'g',d:'g',n:'n',u:'u'} as any)[v];root.querySelectorAll<HTMLElement>('nav.bar a').forEach(a=>{if(a.dataset.n===nv)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});root.querySelector('[data-n="n"]')?.classList.toggle('dot',notifications.some(n=>!n.read_at));drawer(false);$('topav').innerHTML=avatar(profile);$('composerAv').innerHTML=avatar(profile);
   if(v==='f'){selectGroupOptions();renderFeed();}else if(v==='c'&&pp){renderPost(pp);loadComments(pp.id).then(()=>{pp.content.commentsCount=comments.filter(x=>x.post_id===pp.id).length;renderPost(pp);});}else if(v==='d'&&g){renderGroups(g);loadGroupMessages(g.id).then(()=>renderGroups(g));}else if(v==='n')renderNotifications();else if(v==='u')renderProfile();else if(v==='r')renderReports();else if(v==='k')renderFeedback();else if(v==='i')renderInvite();else renderGroups(g||undefined);
  };
  const loadComments=async(postId:string)=>{const {data}=await supabase.from('community_comments').select('id,post_id,author_id,body,created_at').eq('post_id',postId).eq('is_hidden',false).order('created_at');const rows=data||[];const ids=[...new Set(rows.map(x=>x.author_id))];const {data:ps}=ids.length?await supabase.from('community_profiles').select('user_id,display_name,avatar_url').in('user_id',ids):{data:[]};const map=new Map((ps||[]).map(x=>[x.user_id,x]));comments=comments.filter(c=>c.post_id!==postId).concat(rows.map(x=>({...x,author:map.get(x.author_id)?.display_name||'Miembro',avatar_url:map.get(x.author_id)?.avatar_url||null})));};
  const loadGroupMessages=async(groupId:string)=>{const {data}=await supabase.from('community_group_messages').select('id,group_id,author_id,body,created_at').eq('group_id',groupId).order('created_at').limit(100);const rows=data||[];const ids=[...new Set(rows.map(x=>x.author_id))];const {data:ps}=ids.length?await supabase.from('community_profiles').select('user_id,display_name,avatar_url').in('user_id',ids):{data:[]};const map=new Map((ps||[]).map(x=>[x.user_id,x]));comments=comments.filter(c=>c.group_id!==groupId).concat(rows.map(x=>({...x,author:map.get(x.author_id)?.display_name||'Miembro',avatar_url:map.get(x.author_id)?.avatar_url||null})));};
  const loadAll=async()=>{if(!user)return;const {data:prof}=await supabase.from('community_profiles').select('*').eq('user_id',user.id).maybeSingle();profile=prof||{user_id:user.id,display_name:user.user_metadata?.full_name||user.email?.split('@')[0]||'Miembro',bio:'',interests:[],avatar_url:null};if(!prof)await supabase.from('community_profiles').upsert(profile,{onConflict:'user_id'});
   const {data:gs,error:ge}=await supabase.from('community_groups').select('id,name,description,emoji,category,image_url,rules').order('name');if(ge)toast('No se pudieron cargar los grupos.');const {data:jm}=await supabase.from('community_group_members').select('group_id').eq('user_id',user.id);const {data:members}=await supabase.from('community_group_members').select('group_id');const joins=new Set((jm||[]).map(x=>x.group_id)),counts=new Map<string,number>();(members||[]).forEach(x=>counts.set(x.group_id,(counts.get(x.group_id)||0)+1));groups=(gs||[]).map(g=>({...g,joined:joins.has(g.id),members:counts.get(g.id)||0}));
   const {data:rows,error:pe}=await supabase.from('community_posts').select('id,author_id,body,created_at').eq('is_hidden',false).order('created_at',{ascending:false}).limit(100);if(pe)toast('No se pudieron cargar las publicaciones.');const ids=[...new Set((rows||[]).map(x=>x.author_id))];const {data:ps}=ids.length?await supabase.from('community_profiles').select('user_id,display_name,avatar_url').in('user_id',ids):{data:[]};const map=new Map((ps||[]).map(x=>[x.user_id,x]));const postIds=(rows||[]).map(x=>x.id);const {data:reacts}=postIds.length?await supabase.from('community_reactions').select('post_id,user_id').in('post_id',postIds):{data:[]};posts=(rows||[]).map(x=>{const a=map.get(x.author_id),rs=(reacts||[]).filter(r=>r.post_id===x.id);const content=parseBody(x.body);content.commentsCount=0;return {...x,author:a?.display_name||'Miembro',avatar_url:a?.avatar_url||null,likes:rs.length,liked:rs.some(r=>r.user_id===user.id),content};});
   const {data:ns}=await supabase.from('community_notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);notifications=ns||[];const {data:rr}=await supabase.from('community_reports').select('*').eq('reporter_id',user.id).order('created_at',{ascending:false});reports=rr||[];const {data:ff}=await supabase.from('contact_requests').select('id,message,created_at').eq('email',user.email).eq('subject','Feedback de RamosCorp Comunidad').order('created_at',{ascending:false});feedbacks=ff||[];render();};
  const publish=async()=>{const text=($('txt') as HTMLTextAreaElement).value.trim(),link=($('lk') as HTMLInputElement).value.trim(),code=($('cd') as HTMLTextAreaElement).value.trim(),groupId=($('grpSel') as HTMLSelectElement).value;if(link&&!/^https?:\/\//i.test(link)){toast('El enlace debe empezar con http:// o https://');return;}let image='';if(imageFile){const ext=imageFile.name.split('.').pop()?.toLowerCase()||'jpg',path='posts/'+user.id+'/'+crypto.randomUUID()+'.'+ext;const {error}=await supabase.storage.from('community-avatars').upload(path,imageFile,{upsert:false,contentType:imageFile.type});if(error){toast('No se pudo subir la imagen.');return;}image=supabase.storage.from('community-avatars').getPublicUrl(path).data.publicUrl;}
   const body=JSON.stringify({__rcPost:1,text,link,code,image,group_id:groupId});if(body.length>2000){toast('El contenido supera el límite de la base de datos. Reduce la imagen o el texto.');return;}const {error}=await supabase.from('community_posts').insert({author_id:user.id,body});if(error){toast('No se pudo publicar. Revisa que estés unido al grupo.');return;}($('txt') as HTMLTextAreaElement).value='';($('lk') as HTMLInputElement).value='';($('cd') as HTMLTextAreaElement).value='';$('lk').hidden=true;$('cd').hidden=true;$('imgP').hidden=true;imageFile=null;($('fi') as HTMLInputElement).value='';await loadAll();toast('Publicación compartida.');};
  const join=async(group:Group)=>{const result=group.joined?await supabase.from('community_group_members').delete().eq('group_id',group.id).eq('user_id',user.id):await supabase.from('community_group_members').insert({group_id:group.id,user_id:user.id});if(result.error){toast('No se pudo actualizar la membresía.');return;}group.joined=!group.joined;group.members+=group.joined?1:-1;selectGroupOptions();render();toast(group.joined?'Te uniste al grupo.':'Saliste del grupo.');};
  const submitReport=async()=>{const choice=root.querySelector<HTMLInputElement>('input[name="r"]:checked');if(!reportTarget||!choice)return;const reason=choice.value;const details=reportLabel+' · '+$('sheet').querySelector('h2')!.textContent;const {error}=await supabase.from('community_reports').insert({reporter_id:user.id,target_type:reportTarget.type,target_id:reportTarget.id,reason,details:details.slice(0,1000)});if(error)toast('No se pudo enviar el reporte.');else{toast('Reporte enviado. Gracias por avisar.');await loadAll();}closeSheet();};
  const openReport=(type:string,id:string,label:string)=>{reportTarget={type,id};reportLabel=label;$('sheet').querySelector('h2')!.textContent=type==='post'?'Reportar publicación':'Reportar comentario';$('sheet').hidden=false;$('back').hidden=false;};
  const login=async()=>{const email=($('em') as HTMLInputElement).value.trim(),password=($('pw') as HTMLInputElement).value;if(!/^\S+@\S+\.\S+$/.test(email)){$('le').textContent='Escribe un correo válido.';return;}if(!password){$('le').textContent='Escribe tu contraseña.';return;}($('lb') as HTMLButtonElement).disabled=true;const {error}=await supabase.auth.signInWithPassword({email,password});($('lb') as HTMLButtonElement).disabled=false;if(error)$('le').textContent='No se pudo iniciar sesión. Verifica tus datos.';else $('le').textContent='';};
  const loginWithGoogle=async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});if(error)toast('No se pudo iniciar con RamosCorpTech.');};
  const attach=()=>{const file=($('fi') as HTMLInputElement).files?.[0];if(!file)return;if(file.size>3*1024*1024){toast('La imagen pesa más de 3 MB.');($('fi') as HTMLInputElement).value='';return;}imageFile=file;const url=URL.createObjectURL(file);($('imgV') as HTMLImageElement).src=url;$('imgP').hidden=false;updatePublish();};
  const clickFeed=(e:Event)=>{const t=e.target as HTMLElement;const like=t.closest<HTMLElement>('[data-like]'),more=t.closest<HTMLElement>('[data-more]'),share=t.closest<HTMLElement>('[data-share]'),copy=t.closest<HTMLElement>('[data-copy]');if(like){const p=posts.find(x=>x.id===like.dataset.like);if(p)toggleLike(p);return;}if(more){openReport('post',more.dataset.more||'','Publicación');return;}if(share){const p=posts.find(x=>x.id===share.dataset.share);if(p){const url=location.origin+'/#p-'+p.id;navigator.clipboard?.writeText(url).then(()=>toast('Enlace copiado.'),()=>toast('No se pudo copiar.'));}return;}if(copy){const p=posts.find(x=>x.id===copy.dataset.copy);if(p)navigator.clipboard?.writeText(p.content.code).then(()=>toast('Copiado.'),()=>toast('No se pudo copiar.'));}};
  const toggleLike=async(p:Post)=>{const {error}=p.liked?await supabase.from('community_reactions').delete().eq('post_id',p.id).eq('user_id',user.id):await supabase.from('community_reactions').insert({post_id:p.id,user_id:user.id,reaction:'like'});if(error){toast('No se pudo actualizar el me gusta.');return;}p.liked=!p.liked;p.likes+=p.liked?1:-1;renderFeed();};
  const clickView=async(e:Event)=>{const t=e.target as HTMLElement;const cm=t.closest<HTMLElement>('[data-comment-more]');if(cm){openReport('comment',cm.dataset.commentMore||'','Comentario');return;}const joinBtn=t.closest<HTMLElement>('[data-j]');if(joinBtn){const g=getGroup(joinBtn.dataset.j||'');if(g)await join(g);return;}const n=t.closest<HTMLElement>('[data-r]');if(n){const {error}=await supabase.from('community_notifications').update({read_at:new Date().toISOString()}).eq('id',n.dataset.r).eq('user_id',user.id);if(!error){notifications=notifications.map(x=>x.id===n.dataset.r?{...x,read_at:new Date().toISOString()}:x);renderNotifications();}return;}if(t.closest('#rd')){const {error}=await supabase.from('community_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);if(!error){notifications=notifications.map(x=>({...x,read_at:new Date().toISOString()}));renderNotifications();}return;}};
  const cleanup=()=>{window.removeEventListener('hashchange',render);};
  $('feed').addEventListener('click',clickFeed);$('view').addEventListener('click',clickView);
  $('tabs').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-tab]');if(!b)return;tab=b.dataset.tab||'all';root.querySelectorAll<HTMLElement>('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));renderFeed();});
  $('q').addEventListener('input',e=>{query=(e.target as HTMLInputElement).value;renderGroups();});
  $('txt').addEventListener('input',updatePublish);$('lk').addEventListener('input',updatePublish);$('cd').addEventListener('input',updatePublish);
  $('pub').addEventListener('click',publish);$('fi').addEventListener('change',attach);
  $('imgX').addEventListener('click',()=>{imageFile=null;($('fi') as HTMLInputElement).value='';$('imgP').hidden=true;updatePublish();});
  $('tl').addEventListener('click',()=>{const el=$('lk');el.hidden=!el.hidden;if(!el.hidden)el.focus();});
  $('tc').addEventListener('click',()=>{const el=$('cd');el.hidden=!el.hidden;if(!el.hidden)el.focus();});
  $('new').addEventListener('click',()=>{if(location.hash)location.hash='';window.scrollTo(0,0);window.setTimeout(()=>$('txt').focus(),60);});
  $('mn').addEventListener('click',()=>drawer(true));$('dback').addEventListener('click',()=>drawer(false));
  $('lo').addEventListener('click',()=>supabase.auth.signOut());$('swa').addEventListener('click',()=>supabase.auth.signOut());
  $('bk').addEventListener('click',()=>{location.hash=location.hash.startsWith('#p-')?'':'#grupos';});
  $('back').addEventListener('click',closeSheet);$('cancel').addEventListener('click',closeSheet);$('send').addEventListener('click',submitReport);
  root.querySelectorAll<HTMLInputElement>('input[name="r"]').forEach(r=>r.addEventListener('change',()=>{($('send') as HTMLButtonElement).disabled=false;}));
  $('lb').addEventListener('click',login);$('pw').addEventListener('keydown',e=>{if((e as KeyboardEvent).key==='Enter')login();});$('rc').addEventListener('click',loginWithGoogle);
  window.addEventListener('hashchange',render);
  const onAuth=async()=>{const {data}=await supabase.auth.getSession();session=data.session;user=session?.user||null;if(!user){$('login').hidden=false;return;}$('login').hidden=true;intro();await loadAll();};
  let sub:any;supabase.auth.onAuthStateChange((_e,s)=>{session=s;user=s?.user||null;if(!user){$('login').hidden=false;return;} $('login').hidden=true;window.setTimeout(()=>loadAll(),0);});
  onAuth();
  return ()=>{cleanup();sub?.unsubscribe?.();};
 },[]);
 return <div ref={host}/>;
}
