# AI Portfolio — Interactive AI Candidate Assistant

An intelligent, recruiter-facing portfolio where hiring managers talk to an **AI representation of a
software developer** instead of reading a static resume. The assistant answers questions about the
candidate's skills, projects, education and experience, streams its answers token by token, matches the
profile against a pasted job description, and can draft a profile update from an uploaded resume for an
operator to review.

The assistant is grounded: it answers **only** from the verified candidate profile, explicitly flags
missing information, and never invents education, grades, work experience or achievements.

Everything a visitor sees — branding, hero copy, suggested questions, feature flags, contact visibility
and the AI limits — is stored in the database and edited from a protected **operator console**. There is
no hard-coded site content to change in code.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [API Documentation](#api-documentation)
- [Operator Console](#operator-console)
- [Editable Site Settings](#editable-site-settings)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Features

### Recruiter chat
- Streaming answers rendered progressively as they arrive over Server-Sent Events.
- Markdown rendering with GitHub-flavoured tables, code blocks and clickable links.
- Typing indicator, auto-scroll, copy-response, retry on failure, and full error states.
- Suggested recruiter questions on the welcome screen, including a
  **"Why should we hire this candidate?"** featured mode.
- Enter to send, Shift+Enter for a new line.

### Grounded AI behaviour
- Verified candidate profile is the single source of truth.
- Missing information is stated as unavailable rather than guessed.
- Demonstrated skills are distinguished from technologies the candidate is still learning.
- Uploaded documents and job descriptions are treated as **data, never as instructions**
  (prompt-injection neutralisation).

### Conversation memory
- Multiple isolated conversations per client, scoped by an `X-Client-Id` header.
- Prior turns are replayed to the model (trimmed by message count and character budget).
- Clear and delete operations, with role/status/timestamp metadata stored per message.

### Job-description matching
- Pastes a job description and returns matched, missing and unverified requirements.
- An **auditable suitability score (0–100)** produced from an explicit, configurable rubric whose
  weights always sum to 100.
- The rubric, evidence and a "not a probability of hiring" disclaimer ship with every result.
- Exportable as a PDF report.

### Resume upload and processing
- **Operator-console only** PDF upload; the file is processed in memory and never persisted.
- Validated for type, size and PDF signature; text extracted and parsed into a profile draft.
- The draft is always marked **unverified** and requires explicit human confirmation before it can
  replace the verified profile.
- Side-by-side **resume version comparison** highlights added, changed and removed fields between two
  uploaded resumes.

### Operator console
- Session-based sign-in (username + password), a hashed bearer token, and automatic expiry.
- **Overview** dashboard: content counts, freshness timestamps, quick actions and a live AI probe.
- **Profile** editor: every section plus the raw JSON document, each validated before it is written.
- **Resume import**: upload, review, apply, and compare two versions.
- **Site settings**: branding, hero copy, suggested questions, feature flags, contact visibility,
  footer disclaimer and the AI limits/rubric.
- **Conversations** browser with a read-only transcript and delete.
- **Audit log**: every administrative change with actor, target and a short summary.

### Extras
- Dark and light mode, responsive layouts for desktop/tablet/mobile.
- Voice input (speech-to-text) and AI voice responses (text-to-speech).
- Multilingual answers: **English and Hindi**.
- PDF export of a conversation or a job-match report.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Framer Motion, TanStack React Query 5, React Hook Form + Zod, react-router-dom 6, react-markdown + remark-gfm, lucide-react, jsPDF |
| **Main backend** | Java 17, Spring Boot 3.3, Spring Web, Spring Security (stateless), Spring Data JPA / Hibernate, WebClient (WebFlux for server-to-server calls), Flyway, Actuator, Lombok |
| **AI service** | Python 3.11–3.14, FastAPI, Uvicorn, Pydantic v2 + pydantic-settings, httpx, pypdf, python-multipart |
| **LLM** | Groq API (`openai/gpt-oss-120b`) with a deterministic offline `mock` provider |
| **Database** | MySQL 8 (managed MySQL in production) |
| **Protocols** | REST + Server-Sent Events (SSE) end to end |

---

## Architecture

```
                    ┌────────────────────────────────────────────┐
                    │              Browser                        │
                    │  Public site (/)  ·  Console (/admin)       │
                    │  React 18 + Vite · Tailwind · React Query   │
                    └───────────────────────┬────────────────────┘
                                            │ HTTPS · JSON + SSE
                                            │ X-Client-Id, Authorization: Bearer
                    ┌───────────────────────▼────────────────────┐
                    │        Spring Boot backend  (:8080)         │
                    │  Controllers · Services · JPA · Flyway      │
                    │  AdminSessionFilter · Rate limiter · CORS   │
                    └──────┬──────────────────────────────┬───────┘
                           │ JDBC                         │ HTTP (server-to-server)
              ┌────────────▼───────────┐      ┌───────────▼────────────────────┐
              │  MySQL                 │      │   FastAPI AI service (:8000)    │
              │  candidate_profile     │      │   Prompts · Groq client · SSE   │
              │  app_settings          │      │   Resume parsing · Job matching │
              │  conversations         │      └───────────┬────────────────────┘
              │  messages              │                  │ HTTPS
              │  admin_session         │       ┌──────────▼──────────┐
              │  admin_audit_log       │       │     Groq LLM API    │
              └────────────────────────┘       └─────────────────────┘
```

Key design decisions:

- **The browser never talks to the AI service directly.** The backend owns the public API surface and
  proxies AI calls, so the Groq credential and internal endpoints stay private.
- **The Java backend owns persistence.** The Python service is stateless; it receives the profile and
  conversation history with each request and returns AI output only.
- **One guarded surface.** Every administrative route lives under `/api/admin/**` and is validated by a
  single session filter; there is no second authentication mechanism to keep in sync.
- **Content is data, not code.** The public site reads its copy, feature flags and AI limits from the
  settings document, so an operator can change the site without a redeploy.
- **The AI service degrades safely.** If `AI_PROVIDER=groq` is requested without a key, it transparently
  falls back to the deterministic `mock` provider.

---

## Repository Layout

```
Ai_Resume/
├── frontend/                 # React single-page application
│   └── src/
│       ├── pages/admin/      # console screens (overview · profile · resume · settings ·
│       │                     #                   conversations · ai · audit · login)
│       ├── components/
│       │   ├── admin/        # console shell, nav, form primitives, pagination, guards
│       │   ├── chat/         # chat panel, messages, composer, markdown
│       │   ├── common/       # design-system primitives (Button, Modal, Badge, …)
│       │   ├── jobmatch/     # job description form, score gauge, rubric breakdown
│       │   ├── layout/       # app shell, sidebar, top bar, theme toggle
│       │   ├── profile/      # public profile sections
│       │   ├── resume/       # dropzone, review, comparison
│       │   └── sections/     # welcome screen
│       ├── context/          # admin session + site settings providers
│       ├── hooks/            # server state + browser APIs (chat stream, speech, theme)
│       ├── services/         # thin HTTP clients (one module per backend resource)
│       ├── schemas/          # Zod validation schemas
│       ├── lib/              # pure helpers (pdf, resume diff, deep merge, formatting)
│       ├── constants/        # UI copy + bundled settings defaults
│       └── routes/           # the whole routing table (public site + console)
├── backend/                  # Spring Boot REST API
│   ├── mvnw.cmd / mvnw       # Maven Wrapper (no global Maven needed)
│   └── src/main/
│       ├── java/com/aiportfolio/
│       │   ├── controller/   # profile · conversations · job-match · health ·
│       │   │                 #   settings · admin · admin session
│       │   ├── service/      # business logic, streaming, settings, audit, admin insights
│       │   ├── client/       # AiServiceClient (WebClient)
│       │   ├── domain/       # JPA entities
│       │   ├── repository/   # Spring Data repositories
│       │   ├── security/     # AdminSessionFilter
│       │   ├── seeder/       # idempotent first-run profile seeding
│       │   ├── dto/          # request/response models
│       │   ├── exception/    # typed exceptions + global error handler
│       │   └── config/       # security, CORS, WebClient, rate limit, properties
│       └── resources/
│           ├── application.properties
│           ├── default-settings.json       # site settings defaults (public + internal)
│           ├── candidate-profile.json      # seeded verified profile
│           └── db/migration/                # V1__init.sql · V2__admin_console.sql
├── ai-service/               # FastAPI AI service
│   └── app/
│       ├── routers/          # ai (chat/job-match) · resume · health
│       ├── services/         # chat · job_match · resume · security
│       ├── providers/        # groq · mock · base
│       ├── prompts.py        # system prompts kept out of application logic
│       ├── schemas.py        # Pydantic request/response models
│       └── config.py         # settings + rubric + disclaimers
├── run-ai.bat                # one-click AI service start (creates .venv on first run)
├── run-backend.bat           # one-click backend start
├── run-all.bat               # opens all three services in separate windows
├── .env                      # the single environment file shared by all services
└── README.md
```

---

## API Documentation

### Public backend API (Spring Boot, default `http://localhost:8080`)

| Method | Path | Headers | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Aggregated health: database and AI service status. Never throws. |
| `GET` | `/api/profile` | — | Full verified candidate profile. |
| `GET` | `/api/profile/projects` | — | Projects section only. |
| `GET` | `/api/profile/skills` | — | Skills section only. |
| `GET` | `/api/profile/education` | — | Education section only. |
| `GET` | `/api/profile/links` | — | Social and coding profile links. |
| `GET` | `/api/settings` | — | Public site settings. The internal `ai` section is never returned. |
| `POST` | `/api/conversations` | `X-Client-Id` | Creates a conversation. |
| `GET` | `/api/conversations` | `X-Client-Id` | Lists the caller's conversations. |
| `GET` | `/api/conversations/{id}` | `X-Client-Id` | Conversation detail. |
| `GET` | `/api/conversations/{id}/messages` | `X-Client-Id` | Ordered message history. |
| `POST` | `/api/conversations/{id}/messages` | `X-Client-Id` | **SSE stream** of an AI answer. |
| `DELETE` | `/api/conversations/{id}` | `X-Client-Id` | Deletes a conversation and its messages. |
| `DELETE` | `/api/conversations/{id}/messages` | `X-Client-Id` | Clears a conversation's messages. |
| `POST` | `/api/job-match` | — | Compares a job description to the profile. |

`X-Client-Id` must match `[A-Za-z0-9_-]{8,64}` and isolates every conversation to its owner.

### Operator console API (`/api/admin/**`)

Every route below requires `Authorization: Bearer <token>` and carries the operator name into the audit
trail. `POST /api/admin/session` is the only exempt route.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/admin/session` | Sign in with `{ username, password }`; returns a token and its expiry. |
| `GET` | `/api/admin/session` | The operator behind the current token. |
| `DELETE` | `/api/admin/session` | Revokes the session server side. |
| `GET` | `/api/admin/stats` | Dashboard counters and content freshness timestamps. |
| `GET` | `/api/admin/profile` | The full profile document, as stored. |
| `PUT` | `/api/admin/profile` | Replaces the whole profile (validated). |
| `PUT` | `/api/admin/profile/sections/{section}` | Replaces one top-level section (validated). |
| `POST` | `/api/admin/resume/extract` | Multipart PDF upload → unverified profile draft. Never persisted. |
| `GET` | `/api/admin/settings` | The full settings document, including the internal `ai` section. |
| `PUT` | `/api/admin/settings` | Replaces the settings document (validated). |
| `POST` | `/api/admin/settings/reset` | Restores the bundled defaults. |
| `GET` | `/api/admin/conversations` | One page of conversations, newest activity first. |
| `GET` | `/api/admin/conversations/{id}` | A conversation with its ordered messages. |
| `DELETE` | `/api/admin/conversations/{id}` | Removes a conversation and its messages. |
| `GET` | `/api/admin/ai/diagnostics` | Live AI probe: reachable, provider, model, latency. |
| `GET` | `/api/admin/audit` | One page of the administrative trail. |

Failures use one envelope everywhere:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "…", "timestamp": "…", "path": "/api/admin/stats" } }
```

`401` means the session ended; the console drops the token and returns to the sign-in screen. `503`
means the console is disabled because no `ADMIN_PASSWORD` is configured.

### AI service API (FastAPI, default `http://localhost:8000`)

Internal only — never exposed to the browser.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness plus the active provider and model. |
| `GET` | `/` | Service banner listing endpoints. |
| `POST` | `/ai/chat/stream` | SSE stream of the assistant answer. |
| `POST` | `/ai/job-match` | Rubric-scored job match (structured JSON). |
| `POST` | `/ai/resume/extract` | PDF resume → unverified profile draft. |

### SSE protocol

The chat stream emits named events with a JSON `data` payload:

```
event: delta
data: {"text": "The candidate has "}

event: delta
data: {"text": "worked with Spring Boot."}

event: done
data: {"assistantMessageId": "d488b663-1e43-4750-a804-ce2f7ed6ee04", "content": "The candidate has worked with Spring Boot."}

event: error
data: {"code": "AI_SERVICE_UNAVAILABLE", "message": "The AI service is currently unavailable. Please try again shortly."}
```

`meta` opens the stream (conversation, user and assistant message ids), `delta` carries incremental
text, `done` carries the full persisted answer, and `error` terminates the stream cleanly so a partial
answer never corrupts conversation history. The active provider/model are reported by the AI service
(`GET http://localhost:8000/health`) and stored per assistant message, rather than being surfaced to the
browser.

---

## Operator Console

Open `http://localhost:5173/admin` and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from the root
`.env`.

| Screen | What it controls |
| --- | --- |
| **Overview** | Conversation/message/profile counters, profile and settings freshness, quick actions, and a live AI service probe. |
| **Profile** | The verified candidate profile — section by section, or as one raw JSON document. Every save is validated server-side. |
| **Resume import** | Upload a PDF, review the extracted draft field by field, apply the confirmed values, or compare two resume versions. |
| **Site settings** | Branding, hero copy, welcome stat labels, suggested questions, feature flags, contact visibility, footer disclaimer and the AI limits/rubric. |
| **Conversations** | Browse conversations, read a transcript, delete a conversation. |
| **AI & matching** | Chat history/rate limits, the job-match rubric (weights must total 100) and service diagnostics. |
| **Audit log** | Every administrative change, newest first: action, target, operator and a short summary. |

Session behaviour:

- A login issues a 256-bit random token; only its SHA-256 hash is stored, never the token itself.
- The token lives in `sessionStorage`, so it dies with the tab.
- `ADMIN_SESSION_TTL_MINUTES` (default 480) bounds its lifetime; expired sessions are deleted on sight.
- Leaving `ADMIN_PASSWORD` blank disables the console entirely — every admin route answers `503`.

---

## Editable Site Settings

Site content is stored as a single JSON document (`app_settings`) and served publicly through
`GET /api/settings`. The bundled `backend/src/main/resources/default-settings.json` is the fallback and
also fills in any section a stored document is missing, so the schema can grow without a migration.

| Section | Visibility | Contents |
| --- | --- | --- |
| `site` | public | Site name, short name, initials, tagline, accent colour, logo URL. |
| `hero` | public | Eyebrow, headline, summary, suggested-questions heading, welcome stat labels. |
| `questions` | public | The suggested recruiter prompts, one of which may be featured. |
| `features` | public | Feature flags: chat, job match, PDF export, language switch, voice input, theme switch. |
| `contact` | public | Whether the email address, phone number and location are shown. |
| `footer` | public | Footer text, and the AI disclaimer text plus its visibility. |
| `ai` | **internal** | Chat history limit, per-minute rate limit and the job-match rubric. Never returned publicly. |

The two operational limits in the internal `ai` section are seeded from the environment on a fresh
install, so a new deployment behaves exactly like the previous environment-variable-only setup.

Seeding is idempotent: on restart the backend never overwrites settings or the profile an operator has
already saved.

---

## Database Schema

Managed by **Flyway** (`backend/src/main/resources/db/migration/`).

```sql
-- V1__init.sql
CREATE TABLE candidate_profile (
    id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    profile_json JSON        NOT NULL,   -- the validated candidate profile
    updated_at   DATETIME(6) NOT NULL
);

CREATE TABLE conversations (
    id         BINARY(16)  NOT NULL PRIMARY KEY,   -- java.util.UUID
    client_id  VARCHAR(64) NOT NULL,               -- owning recruiter/browser
    title      VARCHAR(200),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
);
CREATE INDEX idx_conversations_client_id ON conversations (client_id);

CREATE TABLE messages (
    id              BINARY(16)  NOT NULL PRIMARY KEY,
    conversation_id BINARY(16)  NOT NULL,
    role            VARCHAR(16) NOT NULL,   -- USER | ASSISTANT
    content         TEXT        NOT NULL,
    status          VARCHAR(16) NOT NULL,   -- STREAMING | COMPLETED | FAILED
    provider        VARCHAR(32),
    created_at      DATETIME(6) NOT NULL,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);

-- V2__admin_console.sql
CREATE TABLE admin_session (
    id           BINARY(16)  NOT NULL PRIMARY KEY,
    token_hash   VARCHAR(64) NOT NULL,      -- SHA-256 of the bearer token
    username     VARCHAR(64) NOT NULL,
    created_at   DATETIME(6) NOT NULL,
    expires_at   DATETIME(6) NOT NULL,
    last_used_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_admin_session_token_hash UNIQUE (token_hash)
);
CREATE INDEX idx_admin_session_expires_at ON admin_session (expires_at);

CREATE TABLE app_settings (
    id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    settings_json JSON        NOT NULL,
    updated_at    DATETIME(6) NOT NULL
);

CREATE TABLE admin_audit_log (
    id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    action     VARCHAR(48) NOT NULL,
    target     VARCHAR(96) NOT NULL,
    summary    TEXT        NOT NULL,
    actor      VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL
);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
```

UUIDs are stored as `BINARY(16)` and instants as `DATETIME(6)`, matching the Hibernate 6 MySQL dialect
mappings exactly, so `ddl-auto=validate` passes against these Flyway-created tables.

The verified profile and the site settings are both stored as JSON so they can be updated without
changing the AI prompt, the frontend code or the database schema.

---

## Environment Variables

The project keeps a **single `.env` at the repository root** (gitignored) and every service
reads that one file:

| Service | How it is loaded |
| --- | --- |
| Backend | `spring.config.import=optional:file:../.env[.properties]` (Spring Boot, started from `backend/`) |
| AI service | `Settings(env_file=(".env", "../.env"))` (works from the repository root or from `ai-service/`) |
| Frontend | `envDir: '..'` in `vite.config.js`; only `VITE_*` variables reach the browser |

Every variable also has a working local default, so the file only overrides values, and
exporting the same variables in your shell works just as well.
**Never commit `.env` - it holds the `GROQ_API_KEY` secret and the console password.**

| Variable | Default | Purpose |
| --- | --- | --- |
| `MYSQL_DB` / `MYSQL_USER` / `MYSQL_PASSWORD` | `ai_portfolio` / `root` | Local MySQL bootstrap values. |
| `MYSQL_PORT` | `3306` | MySQL port. |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/ai_portfolio?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC` | JDBC URL. |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | `root` | Database credentials. |
| `BACKEND_PORT` | `8080` | Spring Boot HTTP port. |
| `AI_SERVICE_BASE_URL` | `http://localhost:8000` | AI service base URL (server-to-server). |
| `AI_CONNECT_TIMEOUT_MS` | `5000` | AI service connect timeout. |
| `AI_RESPONSE_TIMEOUT_MS` | `120000` | AI service response timeout (streaming can be slow). |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174,http://localhost:4173` | Browser origins allowed to call the backend. |
| `ADMIN_USERNAME` | `admin` | Operator console user name. |
| `ADMIN_PASSWORD` | *(empty)* | Operator console password. **Empty disables the console** (every admin route answers `503`). |
| `ADMIN_SESSION_TTL_MINUTES` | `480` | How long a console session stays valid. |
| `CHAT_RATE_LIMIT_PER_MINUTE` | `20` | Rolling per-client limit for AI endpoints. |
| `CHAT_HISTORY_LIMIT` | `20` | Messages replayed to the model as history. |
| `RESUME_MAX_FILE_SIZE` / `RESUME_MAX_REQUEST_SIZE` / `RESUME_MAX_BYTES` | `5MB` / `6MB` / `5242880` | Upload limits. |
| `AI_SERVICE_PORT` | `8000` | FastAPI port. |
| `AI_PROVIDER` | `mock` | `mock` (offline, deterministic) or `groq`. |
| `GROQ_API_KEY` | *(empty)* | Groq credential. Required only for `groq`. |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq model id. |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Groq API base URL. |
| `RESUME_MAX_MB` | `5` | Resume size cap enforced by the AI service. |
| `MAX_HISTORY_MESSAGES` / `MAX_HISTORY_CHARS` | `20` / `12000` | AI-service history trimming bounds. |
| `LLM_TIMEOUT_SECONDS` | `120` | Upstream LLM request timeout. |
| `ALLOWED_ORIGINS` | `http://localhost:8080` | Origins allowed to call the AI service (backend only). |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Backend base URL exposed to the browser. |

---

## Local Setup

### Prerequisites

- **Node.js 18+** and npm
- **JDK 17** and Maven 3.9+
- **Python 3.11–3.14**
- **MySQL 8+** running locally (no container runtime is required)

> Shortcut: once the database from step 1 exists, `.\run-all.bat` opens the AI service, the
> backend and the frontend in separate windows using exactly the commands documented below.

### 1. Database

Create the database once (the JDBC URL can also create it automatically on first connect):

```sql
CREATE DATABASE ai_portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Flyway applies `V1` and `V2` automatically on first backend start, and the candidate profile is seeded
once from `candidate-profile.json`.

### 2. AI service

```powershell
.\run-ai.bat
```

On the first run the script creates `ai-service/.venv` and installs `requirements.txt`;
after that it just starts Uvicorn with reload on the port from `.env` (`AI_SERVICE_PORT`,
default `8000`). No manual virtual-environment activation is needed.

### 3. Backend

```powershell
.\run-backend.bat
```

The datasource URL, user and password default to the local values above, so the backend
starts with no configuration at all. The repository-root `.env` is imported automatically
when it exists; exporting the same variables in your shell works just as well.

The script calls the checked-in Maven Wrapper (`backend\mvnw.cmd`), which downloads Maven
3.9.9 into `~/.m2/wrapper` on first use — a global `mvn` installation is not required.

Health check: `GET http://localhost:8080/api/health` should report `"status":"ok"`.

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

`VITE_API_BASE_URL` comes from the root `.env` and defaults to `http://localhost:8080/api`.

Open `http://localhost:5173` for the public site. The app runs end to end with the `mock` provider —
switch `AI_PROVIDER=groq` and set `GROQ_API_KEY` to use the real model.

### 5. Operator console

Set `ADMIN_PASSWORD` in `.env` before starting the backend, then open
`http://localhost:5173/admin` and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`. This is where all
site content, the candidate profile and the AI limits are managed.

---

## Testing

| Suite | Command | Coverage |
| --- | --- | --- |
| AI service | `cd ai-service && .\.venv\Scripts\python.exe -m pytest -q` | Prompt construction, streaming frames, job matching with evidence grounding, resume parsing, security neutralisation, health. |
| Backend | `cd backend && .\mvnw.cmd test` | Controllers, admin session auth, resume upload validation, streaming client, rate limiting, profile and settings validation, persistence. |
| Frontend | `cd frontend && npm run lint && npm run build` | ESLint and the production build. |

All AI tests run against the deterministic `mock` provider, so business logic is validated without any
live model calls.

Current status: **AI service 34 passing · backend 54 passing · frontend lint and production build green.**

Critical cases covered include profile retrieval, valid/invalid questions, missing profile information,
follow-up questions via history, stream completion and failure, job matching, invalid resume uploads,
admin session authentication and expiry, settings and profile validation, database failures and rate
limiting.

---

## Deployment

The application is designed for a three-service deployment. **No container runtime is used.**

| Component | Platform | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | Static build (`npm run build` → `dist/`). Set `VITE_API_BASE_URL` to the public backend URL. |
| Backend | **Render** (or any Java host) | Set the database, CORS, the `ADMIN_*` variables and the AI service variables. Expose `/api/health` for health checks. |
| AI service | **Render** (or any Python host) | Set `AI_PROVIDER=groq`, `GROQ_API_KEY`, and `ALLOWED_ORIGINS` to the backend origin. |
| Database | **Managed MySQL 8** | Flyway applies `V1` and `V2` on backend start. |

Deployment checklist:

1. Provision a managed MySQL 8 database and record its connection string.
2. Deploy the AI service first; confirm `GET /health` reports the expected provider.
3. Deploy the backend with `AI_SERVICE_BASE_URL` pointing at the deployed AI service.
4. Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` — leaving the password blank keeps the console
   disabled on the deployed instance.
5. Deploy the frontend with `VITE_API_BASE_URL` pointing at the deployed backend.
6. Set `CORS_ALLOWED_ORIGINS` to the exact frontend origin and `ALLOWED_ORIGINS` to the exact backend origin.
7. Verify **streaming** works through the hosting proxy — disable response buffering
   (the AI service already sends `X-Accel-Buffering: no` and `Cache-Control: no-cache`).
8. Enforce HTTPS on every public hop.

> **Note:** the local `mock` provider lets you validate the full stack before any hosting provider or
> LLM credentials are configured.

---

## Screenshots

> Add product screenshots to `docs/screenshots/` and reference them here. Recommended set:
> chat with a streaming answer, welcome screen with suggested questions, job-match report with the rubric
> gauge, the console overview, the settings editor, the resume review, and the dark-mode layout.
>
> **Live URL:** _pending deployment._

---

## Security

- **Secrets** live only in environment variables; the Groq key never reaches the frontend.
- **Administrative access** is a session-based console login, not a shared header key. Tokens are 256-bit
  random values, only their SHA-256 hash is stored, sessions expire on their own, and the console is
  disabled entirely until a password is configured.
- **Single guarded surface:** every admin route is validated by one filter and every mutation is written
  to the audit trail with the authenticated operator name.
- **Data isolation:** conversations are scoped to their `X-Client-Id` owner, and cross-client access
  returns not-found; the public settings endpoint strips the internal `ai` section.
- **Input validation** on every boundary: Jakarta Bean Validation on the backend, Pydantic v2 on the AI
  service, and Zod on the frontend. Profile and settings documents are validated before they are stored.
- **Rate limiting** on AI endpoints via a per-client sliding-window limiter.
- **Prompt-injection defence**: uploaded documents and job descriptions are sanitised and treated as
  data, never as instructions.
- **Diagnostic transparency:** AI failures are reported with status codes and error categories, while API
  keys and raw model responses are redacted from anything the browser receives.
- **CORS** restricted to explicit origins; **uploads** are type/size validated and never executed or
  persisted.
- **Migrations** via Flyway; health checks never leak stack traces; secrets and personal data are kept
  out of logs.

---

## Known Limitations

- Sessions, the rate limiter and the conversation store are **single-instance**; horizontal scaling needs
  a shared store (e.g. Redis) and a distributed rate limiter.
- The console uses **one shared operator account** rather than per-user accounts with roles.
- The AI service ships a deterministic `mock` provider for offline development; real answers require a
  Groq key.
- There is no automated retention scheduler yet; conversations are removed manually from the console.
- The frontend ships ESLint and a production build check but no component or end-to-end test suite.

---

## Future Improvements

- Per-user operator accounts with role-based access, and a session revocation list.
- Redis-backed rate limiting and conversation caching for multi-instance deployments.
- RAG over the candidate's repositories and public writing for richer evidence.
- Streaming job-match analysis (currently single-shot).
- Automated conversation retention and export policies.
- A frontend component and end-to-end test suite.
