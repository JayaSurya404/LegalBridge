# LegalBridge deployment configuration

## Frontend on Vercel

Deploy the `client` directory and configure:

```text
NEXT_PUBLIC_DATA_MODE=http
NEXT_PUBLIC_API_BASE_URL=https://api.example.org
```

Only the API base URL is public. Database, JWT, storage service-role, and AI
credentials must never use a `NEXT_PUBLIC_` prefix.

## FastAPI Docker service

Build `server/Dockerfile` on a persistent container platform. Configure:

```text
DATABASE_URL=postgresql+asyncpg://...
DATABASE_SSL=require
JWT_SECRET=...
CORS_ORIGINS=["https://your-project.vercel.app"]
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=legalbridge-documents
AI_PROVIDER=deterministic
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Create `legalbridge-documents` as a private Supabase Storage bucket. Uploads
and downloads pass through authenticated FastAPI endpoints; the frontend never
receives a public bucket URL. `STORAGE_PROVIDER=local` remains available for
localhost and single-instance environments.

Set `AI_PROVIDER=gemini` only when a backend-only Gemini key is configured.
The deterministic extractive provider remains fully functional without it.

## Release commands and health

Run these commands inside the backend container:

```text
alembic upgrade head
python -m app.scripts.bootstrap_casework_workspace
```

Use `/api/v1/health` for liveness and `/api/v1/ready` for database and storage
readiness. Production CORS must contain the exact HTTPS frontend origin; avoid
wildcards when credentials or bearer tokens are used.
