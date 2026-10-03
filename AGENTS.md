# Stockly agent instructions

Before making any changes to this project, read `STOCKLY_HANDOFF.md` in full.

`STOCKLY_HANDOFF.md` is the source of truth for:
- current project state
- completed infrastructure setup
- GitHub, Supabase, and Vercel configuration
- authentication setup
- project architecture
- implementation roadmap
- known troubleshooting history

Do not recreate or replace the existing GitHub repository, Supabase project,
Vercel project, environment configuration, or authentication setup unless
explicitly instructed by the user.

Do not expose or commit secrets or `.env.local`.

Work phase-by-phase and keep changes minimal and maintainable.

After code changes, run appropriate checks such as:
- npm run lint
- npm run build

If the current task conflicts with information in `STOCKLY_HANDOFF.md`,
stop and clarify before making destructive infrastructure changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
