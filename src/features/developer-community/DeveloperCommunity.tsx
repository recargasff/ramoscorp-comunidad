import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import './developer-community.css';

type Project = {
  id: string;
  owner_id: string;
  title: string;
  summary: string;
  description: string | null;
  status: 'idea' | 'building' | 'completed' | 'paused';
  technologies: string[];
  repository_url: string | null;
  demo_url: string | null;
  looking_for_collaborators: boolean;
  created_at: string;
};

type Resource = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  category: string;
  technology: string | null;
  resource_url: string;
  created_at: string;
};

type Collaboration = {
  id: string;
  project_id: string;
  requester_id: string;
  recipient_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  project?: Project;
};

type Screen = 'explore' | 'projects' | 'collaborations' | 'learn';

const statusLabels: Record<Project['status'], string> = {
  idea: 'Idea',
  building: 'En desarrollo',
  completed: 'Completado',
  paused: 'Pausado',
};

const statusClasses: Record<Project['status'], string> = {
  idea: 'dc-status-idea',
  building: 'dc-status-building',
  completed: 'dc-status-completed',
  paused: 'dc-status-paused',
};

const safeExternalUrl = (value: string | null | undefined) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

export default function DeveloperCommunity() {
  const [screen, setScreen] = useState<Screen>('explore');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<'all' | 'open'>('all');
  const [projectForm, setProjectForm] = useState({
    title: '', summary: '', description: '', status: 'idea' as Project['status'],
    technologies: '', repository_url: '', demo_url: '', looking_for_collaborators: true,
  });
  const [resourceForm, setResourceForm] = useState({
    title: '', description: '', category: 'tutorial', technology: '', resource_url: '',
  });
  const [collabMessages, setCollabMessages] = useState<Record<string, string>>({});

  const loadData = useCallback(async (userId: string | null) => {
    setLoading(true);
    setError('');
    const [projectResult, resourceResult, collaborationResult] = await Promise.all([
      supabase.from('developer_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('developer_resources').select('*').order('created_at', { ascending: false }),
      userId
        ? supabase.from('developer_collaboration_requests').select('*')
            .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError = projectResult.error || resourceResult.error || collaborationResult.error;
    if (firstError) {
      setError(firstError.message.includes('does not exist') || firstError.message.includes('schema cache')
        ? 'Las tablas del módulo todavía no están disponibles. La migración de Supabase sigue pendiente.'
        : 'No se pudieron cargar los datos. Revisa la conexión e inténtalo de nuevo.');
    } else {
      const nextProjects = (projectResult.data || []) as Project[];
      setProjects(nextProjects);
      setResources((resourceResult.data || []) as Resource[]);
      const projectMap = new Map(nextProjects.map(project => [project.id, project]));
      setCollaborations(((collaborationResult.data || []) as Collaboration[]).map(item => ({
        ...item,
        project: projectMap.get(item.project_id),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const userId = data.session?.user.id || null;
      setSessionUserId(userId);
      void loadData(userId);
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const userId = session?.user.id || null;
      setSessionUserId(userId);
      void loadData(userId);
    });
    return () => {
      active = false;
      auth.subscription.unsubscribe();
    };
  }, [loadData]);

  const filteredProjects = useMemo(() => projects.filter(project => {
    const matchesSearch = `${project.title} ${project.summary} ${project.technologies.join(' ')}`
      .toLowerCase().includes(projectSearch.toLowerCase());
    return matchesSearch && (projectFilter === 'all' || project.looking_for_collaborators);
  }), [projects, projectSearch, projectFilter]);

  const ownedProjects = projects.filter(project => project.owner_id === sessionUserId);
  const pendingReceived = collaborations.filter(item => item.recipient_id === sessionUserId && item.status === 'pending');
  const sentRequests = collaborations.filter(item => item.requester_id === sessionUserId);

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionUserId || busy) return;
    const title = projectForm.title.trim();
    const summary = projectForm.summary.trim();
    if (!title || !summary) {
      setNotice('Completa el nombre y el resumen del proyecto.');
      return;
    }
    setBusy(true);
    setNotice('');
    const technologies = projectForm.technologies.split(',').map(item => item.trim()).filter(Boolean).slice(0, 12);
    const { error: insertError } = await supabase.from('developer_projects').insert({
      owner_id: sessionUserId,
      title,
      summary,
      description: projectForm.description.trim() || null,
      status: projectForm.status,
      technologies,
      repository_url: safeExternalUrl(projectForm.repository_url) || null,
      demo_url: safeExternalUrl(projectForm.demo_url) || null,
      looking_for_collaborators: projectForm.looking_for_collaborators,
    });
    if (insertError) setNotice('No se pudo publicar el proyecto. Revisa los campos e inténtalo de nuevo.');
    else {
      setNotice('Proyecto publicado.');
      setProjectForm({ title: '', summary: '', description: '', status: 'idea', technologies: '', repo_url: '', demo_url: '', looking_for_collaborators: true });
      setShowProjectForm(false);
      await loadData(sessionUserId);
    }
    setBusy(false);
  };

  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionUserId || busy) return;
    const title = resourceForm.title.trim();
    const url = safeExternalUrl(resourceForm.resource_url);
    if (!title || !url) {
      setNotice('Añade un título y un enlace válido (https://).');
      return;
    }
    setBusy(true);
    setNotice('');
    const { error: insertError } = await supabase.from('developer_resources').insert({
      author_id: sessionUserId,
      title,
      description: resourceForm.description.trim() || null,
      category: resourceForm.category,
      technology: resourceForm.technology.trim() || null,
      resource_url: url,
    });
    if (insertError) setNotice('No se pudo compartir el recurso. Inténtalo de nuevo.');
    else {
      setNotice('Recurso compartido.');
      setResourceForm({ title: '', description: '', category: 'tutorial', technology: '', resource_url: '' });
      setShowResourceForm(false);
      await loadData(sessionUserId);
    }
    setBusy(false);
  };

  const requestCollaboration = async (project: Project) => {
    if (!sessionUserId) {
      setNotice('Inicia sesión en Ramoscorp Comunidad para enviar solicitudes.');
      return;
    }
    if (project.owner_id === sessionUserId) {
      setNotice('Este proyecto ya es tuyo.');
      return;
    }
    if (collaborations.some(item => item.project_id === project.id && item.requester_id === sessionUserId)) {
      setNotice('Ya enviaste una solicitud para este proyecto.');
      return;
    }
    setBusy(true);
    setNotice('');
    const message = (collabMessages[project.id] || '').trim() || 'Me gustaría colaborar en este proyecto.';
    const { error: insertError } = await supabase.from('developer_collaboration_requests').insert({
      project_id: project.id,
      requester_id: sessionUserId,
      recipient_id: project.owner_id,
      message,
    });
    if (insertError) setNotice('No se pudo enviar la solicitud. Comprueba que el proyecto siga abierto.');
    else {
      setNotice('Solicitud enviada al creador del proyecto.');
      await loadData(sessionUserId);
    }
    setBusy(false);
  };

  const respondToCollaboration = async (item: Collaboration, status: 'accepted' | 'declined') => {
    if (!sessionUserId || item.recipient_id !== sessionUserId || item.status !== 'pending') return;
    setBusy(true);
    const { error: updateError } = await supabase.from('developer_collaboration_requests')
      .update({ status }).eq('id', item.id).eq('status', 'pending');
    if (updateError) setNotice('No se pudo actualizar la solicitud.');
    else {
      setNotice(status === 'accepted' ? 'Solicitud aceptada.' : 'Solicitud rechazada.');
      await loadData(sessionUserId);
    }
    setBusy(false);
  };

  const navItems: { id: Screen; label: string; icon: string }[] = [
    { id: 'explore', label: 'Explorar', icon: '⌕' },
    { id: 'projects', label: 'Proyectos', icon: '⌘' },
    { id: 'collaborations', label: 'Colaboraciones', icon: '↗' },
    { id: 'learn', label: 'Aprender y ayudar', icon: '▤' },
  ];

  return (
    <div className="dc-shell">
      <header className="dc-topbar">
        <a className="dc-brand" href="/" aria-label="Volver a Ramoscorp Comunidad">
          <span className="dc-brand-mark">RC</span>
          <span><strong>Ramoscorp</strong><small>Comunidad de desarrolladores</small></span>
        </a>
        <a className="dc-return" href="/">← Comunidad</a>
      </header>
      <div className="dc-layout">
        <aside className="dc-sidebar" aria-label="Navegación de desarrolladores">
          <div className="dc-sidebar-label">DESARROLLADORES</div>
          {navItems.map(item => (
            <button key={item.id} className={`dc-nav-item ${screen === item.id ? 'is-active' : ''}`}
              onClick={() => { setScreen(item.id); setNotice(''); }}>
              <span className="dc-nav-icon">{item.icon}</span>{item.label}
              {item.id === 'collaborations' && pendingReceived.length > 0 && <span className="dc-count">{pendingReceived.length}</span>}
            </button>
          ))}
          <div className="dc-sidebar-note">
            <strong>Construye en comunidad.</strong>
            <span>Encuentra proyectos, comparte recursos y aprende colaborando.</span>
          </div>
        </aside>

        <main className="dc-main">
          <div className="dc-mobile-nav">
            {navItems.map(item => <button key={item.id} className={screen === item.id ? 'is-active' : ''}
              onClick={() => { setScreen(item.id); setNotice(''); }}>{item.label}</button>)}
          </div>

          {notice && <div className="dc-notice" role="status">{notice}</div>}
          {error && <div className="dc-error" role="alert">{error}<button onClick={() => loadData(sessionUserId)}>Reintentar</button></div>}

          {screen === 'explore' && <>
            <section className="dc-hero">
              <span className="dc-eyebrow">RAMOSCORP · DEV</span>
              <h1>Las ideas crecen<br /><em>cuando se construyen juntos.</em></h1>
              <p>Descubre proyectos, comparte lo que sabes y encuentra personas con ganas de crear.</p>
              <div className="dc-hero-actions">
                <button className="dc-primary" onClick={() => { setScreen('projects'); setShowProjectForm(true); }}>＋ Publicar proyecto</button>
                <button className="dc-secondary" onClick={() => setScreen('learn')}>Explorar recursos</button>
              </div>
            </section>
            <section className="dc-section">
              <div className="dc-section-head"><div><span className="dc-eyebrow">EN COMUNIDAD</span><h2>Proyectos recientes</h2></div><button className="dc-text-button" onClick={() => setScreen('projects')}>Ver todos ↗</button></div>
              {loading ? <div className="dc-loading">Cargando proyectos…</div> : <ProjectGrid projects={projects.slice(0, 3)} userId={sessionUserId} onRequest={requestCollaboration} busy={busy} />}
            </section>
            <section className="dc-section dc-callout">
              <div><span className="dc-eyebrow">APRENDE · COMPARTE · CONSTRUYE</span><h2>Tu próximo proyecto<br />puede empezar aquí.</h2></div>
              <button className="dc-primary" onClick={() => { setScreen('projects'); setShowProjectForm(true); }}>Crear un proyecto</button>
            </section>
          </>}

          {screen === 'projects' && <>
            <div className="dc-page-heading"><span className="dc-eyebrow">PORTAFOLIO COMUNITARIO</span><h1>Proyectos</h1><p>Ideas en marcha, experimentos y productos creados por la comunidad.</p></div>
            <div className="dc-toolbar">
              <input value={projectSearch} onChange={event => setProjectSearch(event.target.value)} placeholder="Buscar por proyecto o tecnología…" aria-label="Buscar proyectos" />
              <select value={projectFilter} onChange={event => setProjectFilter(event.target.value as 'all' | 'open')} aria-label="Filtrar proyectos">
                <option value="all">Todos los proyectos</option><option value="open">Buscan colaboradores</option>
              </select>
              <button className="dc-primary" onClick={() => setShowProjectForm(value => !value)}>{showProjectForm ? 'Cerrar formulario' : '＋ Nuevo proyecto'}</button>
            </div>
            {showProjectForm && <form className="dc-form" onSubmit={createProject}>
              <div className="dc-form-title"><h2>Publica tu proyecto</h2><p>Comparte lo que estás construyendo.</p></div>
              <div className="dc-form-grid">
                <label>Nombre<input required maxLength={90} value={projectForm.title} onChange={e => setProjectForm({...projectForm,title:e.target.value})} placeholder="Ej. App para organizar tareas" /></label>
                <label>Estado<select value={projectForm.status} onChange={e => setProjectForm({...projectForm,status:e.target.value as Project['status']})}>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label className="dc-span-2">Resumen<input required maxLength={220} value={projectForm.summary} onChange={e => setProjectForm({...projectForm,summary:e.target.value})} placeholder="¿Qué hace y para quién?" /></label>
                <label className="dc-span-2">Descripción<textarea rows={3} maxLength={4000} value={projectForm.description} onChange={e => setProjectForm({...projectForm,description:e.target.value})} placeholder="Cuéntanos un poco más…" /></label>
                <label className="dc-span-2">Tecnologías<input value={projectForm.technologies} onChange={e => setProjectForm({...projectForm,technologies:e.target.value})} placeholder="React, TypeScript, Supabase (separadas por comas)" /></label>
                <label>Repositorio<input type="url" value={projectForm.repository_url} onChange={e => setProjectForm({...projectForm,repository_url:e.target.value})} placeholder="https://github.com/…" /></label>
                <label>Demo<input type="url" value={projectForm.demo_url} onChange={e => setProjectForm({...projectForm,demo_url:e.target.value})} placeholder="https://…" /></label>
              </div>
              <label className="dc-checkbox"><input type="checkbox" checked={projectForm.looking_for_collaborators} onChange={e => setProjectForm({...projectForm,looking_for_collaborators:e.target.checked})} /> Busco colaboradores</label>
              <div className="dc-form-actions"><button type="button" className="dc-secondary" onClick={() => setShowProjectForm(false)}>Cancelar</button><button type="submit" className="dc-primary" disabled={busy}>{busy ? 'Publicando…' : 'Publicar proyecto'}</button></div>
            </form>}
            {loading ? <div className="dc-loading">Cargando proyectos…</div> : <ProjectGrid projects={filteredProjects} userId={sessionUserId} onRequest={requestCollaboration} busy={busy} />}
          </>}

          {screen === 'collaborations' && <>
            <div className="dc-page-heading"><span className="dc-eyebrow">TRABAJO EN EQUIPO</span><h1>Colaboraciones</h1><p>Gestiona las invitaciones que recibes y las solicitudes que has enviado.</p></div>
            {!sessionUserId ? <SignInPrompt /> : loading ? <div className="dc-loading">Cargando solicitudes…</div> : collaborations.length === 0 ? <EmptyState title="Todavía no hay solicitudes" body="Cuando solicites colaborar en un proyecto o alguien te escriba, aparecerá aquí." /> :
              <div className="dc-collab-list">{collaborations.map(item => <article className="dc-collab-card" key={item.id}>
                <div className="dc-collab-main"><span className={`dc-status ${item.status === 'pending' ? 'dc-status-building' : item.status === 'accepted' ? 'dc-status-completed' : 'dc-status-paused'}`}>{item.status === 'pending' ? 'Pendiente' : item.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span><h3>{item.project?.title || 'Proyecto'}</h3><p>{item.message}</p><small>{item.requester_id === sessionUserId ? 'Solicitud enviada' : 'Solicitud recibida'} · {new Date(item.created_at).toLocaleDateString()}</small></div>
                {item.recipient_id === sessionUserId && item.status === 'pending' && <div className="dc-collab-actions"><button className="dc-primary" disabled={busy} onClick={() => respondToCollaboration(item,'accepted')}>Aceptar</button><button className="dc-secondary" disabled={busy} onClick={() => respondToCollaboration(item,'declined')}>Rechazar</button></div>}
              </article>)}</div>}
          </>}

          {screen === 'learn' && <>
            <div className="dc-page-heading"><span className="dc-eyebrow">CONOCIMIENTO ABIERTO</span><h1>Aprender y ayudar</h1><p>Recursos compartidos para aprender una tecnología o resolver un problema.</p></div>
            <div className="dc-toolbar"><div className="dc-toolbar-spacer" /><button className="dc-primary" onClick={() => setShowResourceForm(value => !value)}>{showResourceForm ? 'Cerrar formulario' : '＋ Compartir recurso'}</button></div>
            {showResourceForm && <form className="dc-form" onSubmit={createResource}>
              <div className="dc-form-title"><h2>Comparte un recurso</h2><p>Enlace a una guía, documentación, tutorial o herramienta.</p></div>
              <div className="dc-form-grid">
                <label>Título<input required maxLength={100} value={resourceForm.title} onChange={e => setResourceForm({...resourceForm,title:e.target.value})} /></label>
                <label>Categoría<select value={resourceForm.category} onChange={e => setResourceForm({...resourceForm,category:e.target.value})}>{[['tutorial','Tutorial'],['documentation','Documentación'],['tool','Herramienta'],['question','Pregunta'],['course','Curso'],['other','Otro']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label className="dc-span-2">Descripción<textarea rows={2} maxLength={1200} value={resourceForm.description} onChange={e => setResourceForm({...resourceForm,description:e.target.value})} /></label>
                <label>Tecnología<input value={resourceForm.technology} onChange={e => setResourceForm({...resourceForm,technology:e.target.value})} placeholder="Ej. Python" /></label>
                <label>Enlace<input required type="url" value={resourceForm.resource_url} onChange={e => setResourceForm({...resourceForm,resource_url:e.target.value})} placeholder="https://…" /></label>
              </div>
              <div className="dc-form-actions"><button type="button" className="dc-secondary" onClick={() => setShowResourceForm(false)}>Cancelar</button><button type="submit" className="dc-primary" disabled={busy}>{busy ? 'Compartiendo…' : 'Compartir'}</button></div>
            </form>}
            {loading ? <div className="dc-loading">Cargando recursos…</div> : resources.length === 0 ? <EmptyState title="Aún no hay recursos" body="Comparte la primera guía, documentación o herramienta que te haya servido." /> :
              <div className="dc-resource-grid">{resources.map(resource => <article className="dc-resource-card" key={resource.id}><span className="dc-resource-category">{{documentation:'Documentación',course:'Curso',tutorial:'Tutorial',tool:'Herramienta',question:'Pregunta',other:'Otro'}[resource.category] || resource.category}</span><h3>{resource.title}</h3>{resource.description && <p>{resource.description}</p>}<div className="dc-resource-meta">{resource.technology && <span>{resource.technology}</span>}<a href={safeExternalUrl(resource.resource_url)} target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a></div></article>)}</div>}
          </>}
        </main>
      </div>
      <footer className="dc-footer"><span>Ramoscorp · Comunidad de desarrolladores</span><span>Un espacio para construir y aprender en conjunto.</span></footer>
    </div>
  );
}

function ProjectGrid({ projects, userId, onRequest, busy }: { projects: Project[]; userId: string | null; onRequest: (project: Project) => void; busy: boolean }) {
  if (!projects.length) return <EmptyState title="No hay proyectos todavía" body="Publica un proyecto o vuelve más tarde para descubrir nuevas ideas." />;
  return <div className="dc-project-grid">{projects.map(project => <article className="dc-project-card" key={project.id}>
    <div className="dc-project-top"><span className={`dc-status ${statusClasses[project.status]}`}>{statusLabels[project.status]}</span>{project.looking_for_collaborators && <span className="dc-open-label">Buscando equipo</span>}</div>
    <h3>{project.title}</h3><p>{project.summary}</p>
    {project.technologies?.length > 0 && <div className="dc-tags">{project.technologies.map(tag => <span key={tag}>{tag}</span>)}</div>}
    <div className="dc-project-links">{project.repository_url && safeExternalUrl(project.repository_url) && <a href={safeExternalUrl(project.repository_url)} target="_blank" rel="noopener noreferrer">Repositorio ↗</a>}{project.demo_url && safeExternalUrl(project.demo_url) && <a href={safeExternalUrl(project.demo_url)} target="_blank" rel="noopener noreferrer">Demo ↗</a>}</div>
    <div className="dc-project-bottom"><span>{new Date(project.created_at).toLocaleDateString()}</span>{project.owner_id !== userId && project.looking_for_collaborators && <button className="dc-text-button" disabled={busy} onClick={() => onRequest(project)}>Solicitar colaborar ↗</button>}</div>
  </article>)}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="dc-empty"><span className="dc-empty-mark">RC</span><h3>{title}</h3><p>{body}</p></div>;
}

function SignInPrompt() {
  return <div className="dc-signin"><h2>Inicia sesión para colaborar</h2><p>Usa tu cuenta de Ramoscorp Comunidad para enviar y gestionar solicitudes.</p><a className="dc-primary" href="/">Ir a iniciar sesión</a></div>;
}
