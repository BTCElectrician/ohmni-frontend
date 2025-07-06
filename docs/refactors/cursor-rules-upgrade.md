Below is the **one-stop implementation playbook**— rules, file names, shell commands, and validation steps —so you can drop everything into the repo without jumping between messages.

---

## 🗺️ Master Checklist

| Step | Action                                         | Output                                |
| ---- | ---------------------------------------------- | ------------------------------------- |
| 1    | **Create rules folder**                        | `.cursor/rules/`                      |
| 2    | **Add 8 rule files** (copy-paste below)        | `.mdc` files                          |
| 3    | **Delete** legacy `.cursorrules` (or empty it) | ☑️                                    |
| 4    | **Commit & push**                              | branch/PR with rules                  |
| 5    | **Run Agent smoke-test**                       | ask: “What rules govern the backend?” |
| 6    | **CI passes** (unit, lint, type-check)         | green check                           |
| 7    | **Merge** to `main`                            | new default rules 🎉                  |

---

## 1 Make the folder

```bash
mkdir -p .cursor/rules
```

---

## 2 Drop-in rule files

> **Copy every block verbatim into the matching filename.**

### 2.1 `.cursor/rules/00-project-overview.mdc`

```md
---
id: "project-overview"
priority: 1000
scope: ["agent", "ask"]
when:
  paths: ["**/*"]
---

# ABCO AI — Ohmni Monorepo

* **Mission**  Offline-capable, mobile-first assistant for field electricians (NEC look-ups, AI chat, uploads, notes).
* **Topology**  
  1. **frontend/** → Next.js 15.3.3 (App Router, RSC)  
  2. **backend/**  → Flask 3.1 (PostgreSQL, Redis, AI clients)  
  3. **Azure**    → AI Search, Cosmos DB (Mongo API), Blob Storage
* **Core Endpoints**  `/api/auth/*  /api/chat/*  /api/nfpa70/*  /api/upload/*  /api/notes/*`
* **Hard Rules**  
  1. Front-end never talks straight to DB—API only.  
  2. Preserve offline workflow (React Query hydration + Zustand queue).  
  3. Stick to pinned dependency versions (see stack files).  
  4. CI must stay green (see *ci-deploy.mdc*).
```

---

### 2.2 `.cursor/rules/frontend-stack.mdc`

```md
---
id: "frontend-stack"
priority: 900
scope: ["agent"]
when:
  paths: ["frontend/**", "app/**", "components/**", "hooks/**"]
  languages: ["typescript", "tsx", "css", "js"]
---

# 📱 Front-End Canon

* **Framework / libs**  
  * Next.js 15.3.3 · React 19.1 · TypeScript 5.x (`strict`)  
  * Tailwind 3.4.1 + shadcn/ui · Lucide-React  
  * TanStack Query 5.80.7 · Zustand 4.5.2  
  * NextAuth.js 5.0.0-beta.28 · next-pwa
* **Golden Rules**  
  1. **Never** hard-code backend URL—use `process.env.NEXT_PUBLIC_BACKEND_URL`.  
  2. Use helper in `frontend/lib/api.ts`; SSE via browser streams.  
  3. Components `PascalCase.tsx`; hooks `useX.ts`; utils `camelCase.ts`.  
  4. Tailwind classes **literal**; dynamic strings safelisted in `tailwind.config.mjs`.  
  5. Provide skeleton loaders, high-contrast palette, ≥ 44 px touch targets, optimistic UI with rollback.
```

---

### 2.3 `.cursor/rules/backend-stack.mdc`

```md
---
id: "backend-stack"
priority: 850
scope: ["agent"]
when:
  paths: ["backend/**", "api/**", "integrations/**", "services/**", "models/**"]
  languages: ["python"]
---

# 🐍 Flask 3.1 API – Ohmni Backend Canon

* **Runtime**  Python 3.11   (gunicorn 23.0 `-k sync`, app factory `app_minimal:create_app`)
* **Key libs**  Flask 3.1.1 · SQLAlchemy 2.0.41 (+ Flask-SQLAlchemy) · Alembic via Flask-Migrate  
  * AI clients  `openai 1.84` · `anthropic 0.52` · `google-generativeai 0.8.5`  
  * Vector search  `azure-search-documents 11.5.2`
* **Datastores**  PostgreSQL, Redis, Azure Cognitive Search (`construction-knowledge`), local `uploads/`
* **Layout (trimmed)**
```

backend/api/  backend/services/  backend/utils/
integrations/  models/  migrations/  app\_minimal.py

```
* **Refactor Directives**  
1. Centralise AI client → `backend/ai_clients.py`.  
2. Shared vision prompts → `backend/prompts/shared.py`.  
3. File-ext checks → `backend/utils/file_utils.py`.  
4. One Redis init → `extensions/redis.py`.  
5. Single `@skip_options` decorator.  
6. Anthropic/OpenAI wrappers → `backend/ai_providers/`.  
7. Upload-task logic → `backend/services/upload_service.py`.  
8. Chat-title logic → `backend/services/chat_title.py`.
* **Guard-rails**  
* Never touch `migrations/*`, `requirements*.txt`, `pyproject.toml` without explicit bump.  
* Every model change ships with `alembic revision --autogenerate`.  
* Ban stray `print()` / un-parameterised SQL.
* **Tests**  `pytest -q`
```

---

### 2.4 `.cursor/rules/backend-env.mdc`

````md
---
id: "backend-env"
priority: 840
scope: ["agent"]
when:
  paths: ["backend/**", "api/**", "integrations/**"]
  languages: ["python"]
---

# 🔐 Runtime Env-Vars & Dev Commands

| Var | Purpose |
|-----|---------|
| `POSTGRES_URL` | DB (`postgresql+psycopg2://…`) |
| `REDIS_URL` / `REDIS_TLS_URL` | rate-limit + cache |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` | LLM creds |
| `AZURE_SEARCH_SERVICE_NAME` / `AZURE_SEARCH_ADMIN_KEY` | vector index |
| `JWT_SECRET_KEY` / `SECRET_KEY` | auth & Flask sessions |

### Local dev
```bash
FLASK_CONFIG=development python app_minimal.py
pytest -q
````

### Render deploy

```bash
pip install -r render_requirements.txt
flask db upgrade
gunicorn -c gunicorn.conf.py main:app
```

````

---

### 2.5 `.cursor/rules/style-guide.mdc`

```md
---
id: "style-guide"
priority: 750
scope: ["agent", "ask"]
when:
  paths: ["**/*.ts", "**/*.tsx", "**/*.py"]
  languages: ["typescript", "tsx", "python"]
---

# ✨ Coding Conventions

* **TypeScript**  `strict: true`, no `any`, explicit generics.  
* **Python 3.11**  black + isort; annotate public functions.  
* **Commits**  Conventional Commits (`feat:`, `fix:`…).  
* **Docs**  React → JSDoc; Python → Google docstrings.

```bash
pnpm --filter frontend lint && pnpm --filter frontend format
poetry run black . && poetry run isort .
````

````

---

### 2.6 `.cursor/rules/ci-deploy.mdc`

```md
---
id: "ci-deploy"
priority: 700
scope: ["agent"]
when:
  paths: ["**/*"]
  languages: ["typescript", "tsx", "python", "yaml", "json"]
---

# 🚦 CI / Deployment Checklist

1. **Tests**
   ```bash
   pnpm --filter frontend test
   pytest -q
````

2. **Static analysis**  `pnpm type-check` · `ruff check backend/`
3. **Build**  `NEXT_PUBLIC_BACKEND_URL` set for Vercel preview.
4. **Bundle budget**  front-end < 250 kB gzipped; prefer dynamic imports.
5. **Rule snapshot**  CI fails if `.cursor/rules/**` changed & snapshot missing.

````

---

### 2.7 `.cursor/rules/domain-electrical.mdc`

```md
---
id: "domain-electrical"
priority: 800
scope: ["agent", "ask"]
when:
  paths: ["**/*"]
  languages: ["typescript", "tsx", "python", "md", "json"]
---

# ⚡ Domain Heuristics — Commercial Electrical

* Users work offline in gloves; latency high, bandwidth spotty.  
* Key queries → room details, NFPA 70 look-ups, fixture counts.  
* **JSON schema is canonical**—do not rename keys unless told.  
* Keep NEC refs & unit calcs intact; no auto unit conversion.  
* Data paths  Cosmos DB `ohmnioraclebrain` · Blob `drawings/<PO>-<disc>-<sheet>-<rev>.pdf`
````

---

### 2.8 `.cursor/rules/ui-ux-guidelines.mdc`

```md
---
id: "ui-ux-guidelines"
priority: 600
scope: ["agent"]
when:
  paths: ["frontend/**", "components/**", "app/**"]
  languages: ["tsx", "css", "typescript"]
---

# 🎨 UI / A11y Guardrails

* **Palette**  Primary `#149DEA` · Success `#10B981` · Warning `#F59E0B` · Error `#EF4444`
* **Fonts**  Montserrat (headers) · Poppins (body) · JetBrains Mono (code)
* **Images**  Use Next.js `<Image />`; no raw `<img>`; set width/height.
* **Accessibility**  ARIA labels, keyboard nav, visible focus, contrast ≥ 4.5 : 1, respect `prefers-reduced-motion`.
* **Web-vitals**  LCP < 2.5 s · CLS < 0.1; load non-critical code with `dynamic()`.
```

---

## 3 Remove the legacy rules file

```bash
rm -f .cursorrules       # or git rm if tracked
```

---

## 4 Commit & push

```bash
git add .cursor/rules
git commit -m "chore(cursor): migrate to granular v2 rule set"
git push origin feature/cursor-rules
```

Open a PR; CI should run tests, type-checks, linters, and the rule-snapshot gate.

---

## 5 Smoke-test Cursor

1. Open Cursor → *Chat*.
2. Ask: **“What rules govern the frontend?”**
3. Response should list bullets from *frontend-stack* and *ui-ux*.
4. Repeat for **“backend rules?”**—should echo *backend-stack* and *backend-env*.

If any critical bullet is missing, bump its file’s `priority` by +20.

---

## 6 Done!

*Agents now receive precise, up-to-date constraints every time they touch the repo.*
Merge to `main`, delete the feature branch, and enjoy hands-free, context-aware refactors.
