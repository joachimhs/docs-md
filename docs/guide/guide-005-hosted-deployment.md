---
title: "Hosted Deployment Guide"
type: guide
status: active
created: "2026-03-28"
updated: "2026-03-28"
tags: [deployment, authentication, docker, hosting]
---

# Hosted Deployment Guide

This guide covers deploying docsmd as a centrally hosted documentation wiki for your team. It covers authentication, role-based access control, Docker packaging, static site export, and production configuration.

When run locally with `docsmd browse`, everything is open — no login, no restrictions. The features in this guide activate when you deploy docsmd on a server for shared access.

---

## Deployment Options

docsmd supports three deployment modes:

| Mode | Best For | Server Required | Auth Support |
|------|----------|-----------------|--------------|
| **Node server** | Teams with shared access | Yes | Full |
| **Docker container** | Production deployments | Yes (Docker) | Full |
| **Static export** | Public documentation sites | No | None |

---

## Authentication

Authentication is disabled by default. When enabled, docsmd supports two modes: **simple** (email + password) and **OAuth** (GitHub, GitLab, Google).

### Roles and Permissions

Every authenticated user has one of three roles:

| Role | Read | Edit | Commit | Push | Admin |
|------|------|------|--------|------|-------|
| **viewer** | Yes | — | — | — | — |
| **editor** | Yes | Yes | Yes | — | — |
| **admin** | Yes | Yes | Yes | Yes | Yes |

- **Viewers** can browse all documents, search, and view history and diffs.
- **Editors** can also create and edit documents and commit changes.
- **Admins** can also push commits to the remote repository.

When `public_read` is enabled (the default), unauthenticated visitors can read documents but cannot edit or commit.

### How Roles Are Assigned

Role assignment follows a priority order:

1. If the user's email appears in `auth.roles.admin`, they get **admin**.
2. If the user's email appears in `auth.roles.editor`, they get **editor**.
3. Otherwise, they get their default role — either the role in their user entry (simple auth) or `auth.oauth.default_role` (OAuth).

This means the `roles` config always takes precedence over per-user roles.

---

## Simple Authentication (Email + Password)

Simple auth stores users in a YAML file with bcrypt-hashed passwords. Good for small teams that don't need SSO.

### Step 1: Add Users

```bash
docsmd user add alice@example.com --name "Alice" --role admin
docsmd user add bob@example.com --name "Bob" --role editor
docsmd user add carol@example.com --name "Carol" --role viewer
```

Each command prompts for a password (minimum 6 characters). Passwords are hashed with bcrypt and stored in `docs/.docsmd-users.yml`:

```yaml
users:
  - email: alice@example.com
    name: Alice
    password_hash: "$2a$10$..."
    role: admin
  - email: bob@example.com
    name: Bob
    password_hash: "$2a$10$..."
    role: editor
  - email: carol@example.com
    name: Carol
    password_hash: "$2a$10$..."
    role: viewer
```

To list all configured users:

```bash
docsmd user list
```

### Step 2: Enable Auth in Config

Add to `docs/.docsmd.yml`:

```yaml
auth:
  enabled: true
  mode: simple
  public_read: true        # Allow anonymous reading (set to false to require login for everything)
  simple:
    session_secret: "your-secret-at-least-32-characters-long"
```

If you omit `session_secret`, docsmd generates an ephemeral one at startup. This means all sessions are lost when the server restarts. For production, always set a secret — either in the config or via the `DOCSMD_SESSION_SECRET` environment variable.

### Step 3: Override Roles (Optional)

You can override per-user roles in the config. This is useful when the same users file is shared across environments:

```yaml
auth:
  enabled: true
  mode: simple
  roles:
    admin:
      - alice@example.com
    editor:
      - bob@example.com
      - carol@example.com
```

### What Users See

- A login page at `/auth/login` with email and password fields.
- After login, the header shows their name, avatar initial, and a role badge.
- A "Continue without signing in" link for read-only access (if `public_read` is true).
- Viewers see a "Sign in to edit" prompt instead of the Edit button.
- The "+ New" button and Push button are hidden for users without the required role.

---

## OAuth Authentication (GitHub, GitLab, Google)

OAuth lets users sign in with their existing Git provider account. No passwords to manage.

### Step 1: Create an OAuth App

**GitHub:**
1. Go to **Settings > Developer settings > OAuth Apps > New OAuth App**
2. Set the callback URL to `https://your-domain.com/auth/callback`
3. Note the Client ID and Client Secret

**GitLab:**
1. Go to **User Settings > Applications > New Application**
2. Set the callback URL to `https://your-domain.com/auth/callback`
3. Select the `read_user` scope
4. Note the Application ID and Secret

**Google:**
1. Go to the **Google Cloud Console > APIs & Services > Credentials**
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `https://your-domain.com/auth/callback` as an authorized redirect URI
4. Note the Client ID and Client Secret

### Step 2: Configure

```yaml
auth:
  enabled: true
  mode: oauth
  public_read: true
  oauth:
    provider: github           # "github", "gitlab", or "google"
    allowed_domains:           # Restrict sign-in by email domain (empty = allow all)
      - example.com
      - mycompany.org
    default_role: viewer       # Role for users not in the roles lists
  roles:
    admin:
      - alice@example.com
    editor:
      - bob@example.com
      - carol@example.com
```

### Step 3: Set Secrets via Environment Variables

Never commit OAuth secrets to your config file. Use environment variables instead:

```bash
export DOCSMD_OAUTH_CLIENT_ID=your_client_id
export DOCSMD_OAUTH_CLIENT_SECRET=your_client_secret
export DOCSMD_SESSION_SECRET=your_session_signing_secret
export ORIGIN=https://your-domain.com
```

The `ORIGIN` variable is required for OAuth — it tells docsmd the canonical URL for constructing callback URLs.

### What Users See

- A login page at `/auth/login` with a "Sign in with GitHub" (or GitLab/Google) button.
- Clicking the button redirects to the provider, then back to docsmd.
- After login, the header shows their name, provider avatar, and role badge.
- The `allowed_domains` filter rejects users whose email domain isn't in the list, redirecting them back to the login page with an error.

---

## Docker Deployment

The included Dockerfile builds a production-ready container image.

### Building the Image

```bash
# From the docsmd directory
npm run build           # Build web app + CLI
docker build -t docsmd .
```

### Running the Container

The container expects a Git repository mounted at `/repo`:

```bash
docker run -d \
  -p 5173:5173 \
  -v /path/to/your/repo:/repo:rw \
  -e ORIGIN=http://localhost:5173 \
  docsmd
```

Then open `http://localhost:5173`.

### Docker Compose

For a more complete setup, use the included `docker-compose.yml`:

```yaml
version: "3.8"
services:
  docsmd:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - /path/to/your/repo:/repo:rw
    environment:
      - ORIGIN=https://docs.example.com
      - DOCSMD_SESSION_SECRET=your_secret_here
      # OAuth (if using)
      - DOCSMD_OAUTH_CLIENT_ID=your_client_id
      - DOCSMD_OAUTH_CLIENT_SECRET=your_client_secret
    restart: unless-stopped
```

```bash
docker-compose up -d
```

### What's in the Container

- Node.js 20 (Alpine) with Git installed
- The pre-built SvelteKit app (`build/`)
- The compiled CLI (`dist/`)
- Document templates (`templates/`)
- Production dependencies only (no dev dependencies)
- Health check that pings `/api/health` every 30 seconds

### Health Check

The container includes a health check. You can also call it manually:

```bash
curl http://localhost:5173/api/health
```

```json
{
  "status": "healthy",
  "docs_root": "/repo/docs",
  "docs_found": true,
  "timestamp": "2026-03-28T12:00:00.000Z"
}
```

Returns `"degraded"` if the docs directory is not found (e.g., the volume mount is missing).

---

## Static Site Export

Build a static HTML version of your documentation for hosting on any web server, CDN, or GitHub Pages. No Node.js server required.

### Building

```bash
docsmd build --static
```

This pre-renders every document page as an HTML file and outputs to `build-static/`.

### Serving

Any HTTP server works:

```bash
npx serve build-static
```

Or deploy to Netlify, Vercel, GitHub Pages, S3, or any static host.

### What's Different in Static Mode

- All document pages are pre-rendered at build time.
- Search works client-side (the search index is pre-built).
- Edit, Commit, and Push buttons are hidden — the site is read-only.
- No authentication — static sites don't have a server to enforce it.
- No SSE live reload — there's no server to push events.
- The `/api/` endpoints do not exist.

Static export is useful for publishing documentation publicly while keeping the editable version behind authentication on a separate deployment.

---

## Live Reload (SSE)

When running as a Node server (not static), docsmd watches the `docs/` directory for changes. When markdown files are added, modified, or deleted by external tools — your text editor, AI agents, `git pull`, scripts — the manifest and search index are automatically rebuilt.

Connected browsers receive real-time notifications via Server-Sent Events (SSE):

```bash
curl -N http://localhost:5173/api/events
```

Events look like:

```
data: {"event":"docs-changed","data":{"path":"/path/to/docs/guide/guide-001.md"},"timestamp":1711641600000}
```

This is useful for building integrations that react to documentation changes.

---

## Auto-Pull (Syncing with Remote)

When deploying docsmd as a hosted server, you typically want it to stay in sync with changes pushed to the remote repository by other team members, CI pipelines, or other tools.

### Enabling Auto-Pull

Add to `docs/.docsmd.yml`:

```yaml
hosting:
  auto_pull: true
  auto_pull_interval: 60   # seconds (default: 60)
```

When enabled, docsmd periodically fetches and fast-forward merges from the remote.

### How It Works

Auto-pull follows three rules based on the local repository state:

| Local State | Action |
|-------------|--------|
| **Clean** (no local changes) | Pull automatically |
| **Uncommitted changes** (dirty working tree) | Stash changes, pull, restore stash |
| **Unpushed commits** (ahead of remote) | **Blocked** — user must push or reset |

When auto-pull is blocked, a yellow banner appears below the header:

> Auto-pull paused: 2 unpushed commit(s). **[Push]** **[Reset]**

- **Push** sends the local commits to the remote, then auto-pull resumes.
- **Reset** discards all unpushed commits and resets the branch to match the remote. Uncommitted file changes are preserved via stash.

### Manual Pull

Even without auto-pull enabled, the header shows a **Pull** button whenever the local branch is behind the remote. Clicking it triggers a one-time pull with the same stash-if-dirty logic.

### Pull API

Integrations can trigger pulls programmatically:

```bash
# Trigger a pull
curl -X POST http://localhost:5173/api/git/pull

# Reset to remote (discards unpushed commits)
curl -X POST http://localhost:5173/api/git/pull \
  -H 'Content-Type: application/json' \
  -d '{"action": "reset"}'

# Check auto-pull status
curl http://localhost:5173/api/git/pull
```

The status endpoint returns:

```json
{
  "state": "active",
  "lastPull": "2026-03-28T14:30:00.000Z",
  "lastMessage": "Pulled successfully"
}
```

Possible `state` values: `active`, `blocked`, `disabled`, `no-remote`.

---

## Environment Variables Reference

All sensitive configuration should be set via environment variables rather than committed to `.docsmd.yml`.

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCSMD_REPO_ROOT` | Path to the Git repository root | Current working directory |
| `DOCSMD_DOCS_DIR` | Name of the docs subdirectory | `docs` |
| `DOCSMD_ADAPTER` | Build adapter: `node` or `static` | `node` |
| `DOCSMD_BASE_PATH` | URL prefix for subdirectory deployments | `/` |
| `DOCSMD_SESSION_SECRET` | Secret for signing session cookies | Auto-generated (ephemeral) |
| `DOCSMD_OAUTH_CLIENT_ID` | OAuth provider client ID | (none) |
| `DOCSMD_OAUTH_CLIENT_SECRET` | OAuth provider client secret | (none) |
| `ORIGIN` | Canonical URL (required for OAuth callbacks) | `http://localhost:5176` |
| `PORT` | Server port | `5173` |
| `HOST` | Bind address | `localhost` |
| `NODE_ENV` | `production` or `development` | `development` |

---

## Full Configuration Example

A complete `.docsmd.yml` for a team deployment with GitHub OAuth:

```yaml
spec_version: "0.1.0"

project:
  name: "Acme Engineering Docs"
  description: "Internal engineering documentation"

auth:
  enabled: true
  mode: oauth
  public_read: false           # Require login to read
  oauth:
    provider: github
    allowed_domains:
      - acme.com
    default_role: viewer
  roles:
    admin:
      - lead@acme.com
      - devops@acme.com
    editor:
      - dev1@acme.com
      - dev2@acme.com
      - dev3@acme.com

hosting:
  adapter: node
  base_path: /
  auto_pull: true
  auto_pull_interval: 60

search:
  result_limit: 100
  snippet_length: 300

ui:
  theme: auto
  sidebar_default: expanded
  default_editor: richtext
```

---

## Production Checklist

Before going live with a hosted deployment:

- [ ] Set `DOCSMD_SESSION_SECRET` to a strong random value (at least 32 characters)
- [ ] Set `ORIGIN` to your public URL (e.g., `https://docs.example.com`)
- [ ] Set `NODE_ENV=production`
- [ ] If using OAuth: register the app with the correct callback URL (`{ORIGIN}/auth/callback`)
- [ ] If using OAuth: set `DOCSMD_OAUTH_CLIENT_ID` and `DOCSMD_OAUTH_CLIENT_SECRET`
- [ ] Ensure the Git repository is mounted (Docker) or accessible (bare metal)
- [ ] Configure a reverse proxy (nginx, Caddy) with HTTPS termination
- [ ] Verify the health endpoint: `curl https://your-domain.com/api/health`
- [ ] Test login and role assignments with a real user
- [ ] If using `allowed_domains`, verify that restricted domains are correctly rejected
- [ ] Set up monitoring on the `/api/health` endpoint
- [ ] If using auto-pull: set `hosting.auto_pull: true` in config and verify with `GET /api/git/pull`
