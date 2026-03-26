---
title: "Spec-001: Authentication and Authorization System"
type: spec
status: approved
created: "2025-11-20"
updated: "2026-02-01"
owner: "@alice"
tags: [auth, security]
---

# Spec-001: Authentication and Authorization System

## Overview

This specification defines the authentication and authorization system for the Acme Platform. It covers the token model, session lifecycle, permission model, and integration points for all platform services. All services that handle user requests must implement this specification.

## Goals

- Provide a single, consistent authentication mechanism across all platform services.
- Support both human users (via browser sessions) and machine clients (via API keys and service tokens).
- Enforce least-privilege access through a role-based permission system.
- Meet SOC 2 Type II requirements for access control and audit logging.
- Support multi-tenant isolation: users in one organization must never be able to access resources belonging to another organization.

## Non-Goals

- This spec does not cover single sign-on (SSO) federation with external identity providers in detail; that will be addressed in a future spec.
- This spec does not define the UI for login or account management pages.

## Authentication Model

### Human Users

Human users authenticate via email and password. Passwords are hashed using **Argon2id** with the following parameters:

- Memory: 64 MB
- Iterations: 3
- Parallelism: 4
- Salt: 16 bytes, randomly generated per password

Upon successful authentication, the server issues a short-lived **access token** (JWT, 15-minute TTL) and a **refresh token** (opaque, 30-day TTL, stored in an HttpOnly cookie).

### Machine Clients

Machine clients (services, CI pipelines, integrations) authenticate using **API keys**. API keys are 32-byte random values encoded as base64url, prefixed with `acme_` for easy identification in logs and secret scanners.

```
acme_4hG8kQzLmNpR2sXvYwJdCfBtAeUoIi7H
```

API keys are stored as SHA-256 hashes in the database. The plaintext key is shown to the user exactly once at creation time.

### Service-to-Service

Internal services authenticate to each other using **short-lived JWTs** signed with a shared ECDSA P-256 key managed via AWS Secrets Manager. Tokens have a 5-minute TTL and include a `jti` (JWT ID) claim that is validated against a Redis set to prevent replay attacks.

## Authorization Model

### Roles

The platform uses a flat role model at the organization level:

| Role | Description |
|------|-------------|
| `owner` | Full administrative access to the organization |
| `admin` | Can manage members and most resources; cannot delete the organization |
| `member` | Standard access; can create and manage resources they own |
| `viewer` | Read-only access to all resources in the organization |

### Resource-Level Permissions

Individual resources (projects, pipelines, secrets) support explicit permission overrides via an Access Control List (ACL). ACL entries take precedence over the role-level defaults.

```json
{
  "resource_id": "proj_abc123",
  "principal": "user_xyz789",
  "permission": "write"
}
```

### Middleware Integration

All HTTP services must include the `@acme/auth-middleware` package and configure it as the first middleware in the request pipeline:

```typescript
import { authMiddleware } from "@acme/auth-middleware";

app.use(authMiddleware({
  audience: "acme-platform",
  requiredScopes: ["read:resources"],
  onUnauthorized: (req, res) => res.status(401).json({ error: "Unauthorized" }),
}));
```

## Audit Logging

Every authentication event (login, token refresh, token revocation, API key usage) and every authorization decision (grant, deny) must be written to the centralized audit log. Log entries must include: timestamp, actor identity, resource ID, action, outcome, and client IP.

## Security Requirements

- All tokens must be transmitted over TLS 1.2 or higher; HTTP requests must be rejected or redirected.
- Refresh tokens are single-use and rotated on every use (refresh token rotation).
- Failed authentication attempts are rate-limited to 10 per minute per IP using a sliding window counter in Redis.
- API keys can be scoped to specific IP ranges or CIDR blocks at creation time.
