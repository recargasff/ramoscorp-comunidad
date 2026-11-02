# RamosCorp Comunidad: comunidad de desarrolladores

## Goal

Create a welcoming developer space inside Ramoscorp Comunidad for beginners, students, self-taught developers, and experienced builders to discover one another, share progress, get feedback, and collaborate. No professional experience is required.

## Navigation and independent screens

Build these as separate, responsive screens, not one long crowded dashboard:

1. **Explorar** — developer discovery with filters for skills, technologies, interests, experience level, and collaboration availability. Reuse the existing community profile skills/tools/interests fields.
2. **Proyectos** — publish and discover projects with status (idea, building, completed, paused), technologies, repository/demo links, and a clear “busco colaboradores” flag.
3. **Colaboradores** — project-specific collaboration requests, with inbox/outbox and clear pending/accepted/declined states.
4. **Aprender y ayudar** — shared resources, tutorials, documentation, tools, and questions.
5. **Perfil de desarrollador** — extend the existing community profile with skills, tools, projects, learning interests, and availability; do not duplicate identity/profile records.

## Data and security

- Use the existing Supabase project and existing auth.users identity.
- Preserve existing community tables and rows.
- Reuse community_profiles for developer discovery/profile data.
- The new migration creates only developer-scoped tables: developer_projects, developer_collaboration_requests, and developer_resources.
- RLS is enabled on all new tables. Public discovery is read-only; mutations require authentication and owner/participant policies.
- Never expose private messages, emails, tokens, or admin controls as developer profile fields.
- Apply the migration only after reviewing its policies and testing the preview. Do not apply to production as part of this PR.

## UI and implementation

- React + TypeScript, Tailwind, responsive mobile-first layout.
- Use independent page components and route/state boundaries. Keep src/App.tsx as a minimal integration point rather than adding more giant HTML templates to its existing monolith.
- Follow Ramoscorp's current visual identity and existing app navigation.
- Empty states should invite a first project/resource/profile update, not pretend there are active users or projects.
- Add accessible loading, error, empty, and success states. Avoid dead buttons and fake data.

## Rollout

1. Schema and RLS review (this PR).
2. Implement the screen components and connect them to Supabase.
3. Test auth, RLS, profile privacy, project CRUD, collaboration-request lifecycle, and resource CRUD in a Vercel preview.
4. Run build and smoke checks; verify the preview on mobile.
5. Merge and deploy only after explicit review. Do not change production or unrelated community features as part of this integration.
