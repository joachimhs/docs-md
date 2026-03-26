---
title: "Guide: Local Development Setup"
type: guide
status: active
created: "2025-10-15"
updated: "2026-02-20"
tags: [development, setup]
---

# Guide: Local Development Setup

This guide walks you through setting up a complete local development environment for the Acme Platform. By the end, you will have all services running locally with hot-reload and a seeded database.

## Prerequisites

Before you begin, ensure you have the following installed:

- **macOS or Linux** (Windows is not officially supported; WSL2 may work)
- **Node.js 20.x** (use `nvm` or `fnm` to manage versions)
- **Go 1.22+**
- **Docker Desktop 4.x** or **OrbStack**
- **AWS CLI v2** (configured with a dev profile)
- `git`, `make`, `jq`

## Step 1: Clone the Repository

```bash
git clone git@github.com:acme/acme-platform.git
cd acme-platform
```

If you do not have SSH key access, contact `#platform-eng` to get added to the GitHub organization.

## Step 2: Install Dependencies

The repository uses **Turborepo** to manage the monorepo. Run the root-level install command to install dependencies for all packages:

```bash
npm install
```

For Go services, dependencies are managed via modules and will be fetched automatically on build. You can pre-warm the cache:

```bash
make go-mod-download
```

## Step 3: Start Infrastructure Services

Local infrastructure (PostgreSQL, Redis, LocalStack for AWS emulation) is managed via Docker Compose:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Verify the services are healthy:

```bash
docker compose -f docker/docker-compose.dev.yml ps
```

You should see `postgres`, `redis`, and `localstack` with status `healthy`.

## Step 4: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

The defaults in `.env.example` are pre-configured for the local Docker setup. The only value you need to change is `AWS_PROFILE`:

```
AWS_PROFILE=acme-dev
```

Never commit `.env.local` to version control. It is listed in `.gitignore`.

## Step 5: Run Database Migrations

```bash
npm run db:migrate
```

This runs all pending migrations against the local PostgreSQL instance. To also seed the database with development fixtures:

```bash
npm run db:seed
```

The seed script creates two test organizations, five test users, and sample data for each service.

## Step 6: Start the Development Servers

To start all services in parallel with hot-reload:

```bash
npm run dev
```

Turborepo will start each service defined in `turbo.json`. You should see output from each service prefixed with its package name. Once all services report `ready`, you can access:

- **API Gateway**: `http://localhost:4000`
- **Auth Service**: `http://localhost:4001`
- **Admin UI**: `http://localhost:3000`

### Starting a Single Service

If you only need to work on one service, you can start it individually:

```bash
npm run dev --filter=@acme/auth-service
```

## Troubleshooting

### Port conflicts

If a service fails to start due to a port conflict, check what is running on that port:

```bash
lsof -i :4000
```

Kill the process or change the port in your `.env.local`.

### Database connection refused

Ensure the Docker containers are running and healthy. If PostgreSQL is still starting up, wait 10–15 seconds and retry migrations.

### LocalStack not responding

Restart LocalStack and re-run the setup script that provisions local S3 buckets and SQS queues:

```bash
docker compose restart localstack
npm run infra:setup-local
```
