Local Supabase setup (development)

This document summarizes steps to run a local Supabase instance and connect the static site served from `localhost`.

1) Prereqs
- Docker Desktop running
- Supabase CLI installed
  - npm install -g supabase

2) Initialize (optional) and link to hosted project
- supabase init
- supabase login
- supabase link --project-ref <your-project-ref>
- supabase db pull --linked

3) Start local services
- supabase start
  - Note: the CLI prints local API URL and anon/service keys (typically http://localhost:54321)

4) Configure your application for local mode
- Create or update `.env.local` (see `.env.local.example`) with local URL and anon key:
  - NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_local_anon_key>

- Two ways to expose keys to the static site while developing locally:
  1. Edit `index.html` meta tags (quick):
     <meta name="supabase-url" content="http://localhost:54321">
     <meta name="supabase-key" content="sb_publishable_...">
  2. Provide an `env.json` file at site root (more convenient if using a simple static server):
     {
       "supabaseUrl":"http://localhost:54321",
       "supabaseKey":"sb_publishable_..."
     }

5) Allowed origins & redirect URLs
- In Supabase dashboard -> Authentication -> Settings -> URL Configuration, add the frontend origin(s):
  - http://localhost:8090 (or the port you serve the site on)
  - http://127.0.0.1:8090
- If using OAuth providers, add the same origin(s) to the provider config (e.g., Google Cloud Console).

6) Test
- Serve the static site (e.g., `npx http-server -p 8090`) and open DevTools console.
- Call `testSupabase()` (the site exposes this when Supabase is initialized) to run a basic select against `profiles`.

Notes
- Do NOT commit real anon/service keys to source control. Keep `.env.local` and `env.json` out of Git, and use `.env.local.example` for templates.
- If you prefer automation, a small build step can inject env variables into `index.html` at build time; I can add that if you want.