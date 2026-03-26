---
title: "ADR-003: Adopt Monorepo Structure for Platform Services"
type: adr
status: superseded
created: "2025-09-05"
updated: "2025-12-01"
owner: "@carol"
tags: [infrastructure, security]
superseded_by: "adr-004"
---

# ADR-003: Adopt Monorepo Structure for Platform Services

## Status

Superseded by ADR-004 — see that document for the updated decision.

## Context

In mid-2025, the Acme Platform consisted of seven independently versioned Git repositories. As the number of cross-cutting changes increased (shared library updates, security patches applied across services, coordinated deployments), the multi-repo approach was causing friction. Engineers were spending significant time opening pull requests across repositories, resolving version drift between shared packages, and tracking which services had adopted critical security patches.

At the time this ADR was written, the team evaluated three approaches:

1. **Status quo** — continue with multiple repositories, improve tooling around cross-repo PRs.
2. **Monorepo with Nx** — consolidate all services into a single repository managed with the Nx build system.
3. **Monorepo with Turborepo** — consolidate into a single repository managed with Turborepo.

Security considerations were a significant factor: the existing multi-repo setup made it difficult to audit which services had applied a given CVE patch. Dependency scanning tools (Dependabot, Snyk) generated separate PRs per repository, and there was no centralized view of the security posture across all services. A monorepo with a single lockfile and unified dependency graph would substantially improve the ability to track and enforce security requirements.

## Decision (Original)

Adopt a monorepo structure using **Nx** as the build orchestration tool. All platform services and shared libraries will be migrated into the `acme-platform` monorepo. The migration will be completed in three phases over Q4 2025.

## Why This Was Superseded

After completing Phase 1 of the Nx migration, the team encountered significant performance issues with the Nx cloud cache and found the plugin model difficult to extend for our Go services. ADR-004 revisits this decision and replaces Nx with Turborepo while retaining the monorepo structure itself.

The core decision — to use a monorepo — remains valid and is carried forward in ADR-004.

## Consequences (As Originally Written)

### Positive

- Unified dependency management: one lockfile per language, one Dependabot configuration, one Snyk scan.
- Atomic commits for cross-service changes.
- Simplified CI: one pipeline configuration, shared cache, parallel task execution.
- Improved security posture: security patches can be applied and verified in a single PR.

### Negative

- Initial migration effort: estimated 3 weeks of engineering time per team.
- Nx has a learning curve for engineers unfamiliar with monorepo tooling.
- Repository clone time increases as the codebase grows; shallow clones and sparse checkout required for large repos.

## Alternatives Considered at the Time

**Maintaining multiple repos with improved tooling** was rejected because it treated symptoms rather than root causes, and the tooling investment would provide less long-term value than consolidation.
