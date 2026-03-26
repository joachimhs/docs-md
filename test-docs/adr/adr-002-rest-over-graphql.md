---
title: "ADR-002: Use REST Instead of GraphQL for Public APIs"
type: adr
status: proposed
created: "2025-12-10"
updated: "2026-01-05"
owner: "@bob"
tags: [api, architecture]
---

# ADR-002: Use REST Instead of GraphQL for Public APIs

## Status

Proposed — under review by API Working Group

## Context

As the Acme Platform begins exposing APIs to third-party developers and internal consumer teams, we need to decide on a consistent API style. Two strong options have been advocated within the team: REST over HTTP/JSON and GraphQL.

Several teams have already built internal services using REST, and we have existing tooling (OpenAPI spec generation, Prism for contract testing, and a shared middleware library) that assumes REST. However, there is growing interest in GraphQL, particularly from the frontend team, who cite the ability to request only the fields they need and to co-locate queries with components as key benefits.

The decision affects how we design, document, version, and evolve all public-facing endpoints. It also affects client SDK generation, API gateway configuration, and developer portal tooling.

### Evaluation Criteria

- Developer experience for external integrators
- Tooling maturity in our current stack (Node.js, Python, Go)
- Caching behavior and CDN compatibility
- Ease of versioning and deprecation
- Security model (authorization at field level vs. endpoint level)

## Decision

We propose standardizing on REST with JSON for all public and partner-facing APIs. Internal service-to-service communication may use gRPC where latency is a concern, but the public API surface will be RESTful.

GraphQL may be used within the frontend application as a BFF (Backend for Frontend) layer that aggregates REST responses, but will not be exposed directly to external developers.

## Rationale

REST is better understood by the broader developer community and easier to document with OpenAPI. Our existing toolchain (Prism, Stoplight, and the shared auth middleware) is REST-first. HTTP-level caching via CDN is straightforward with GET endpoints, which would require non-trivial workarounds with GraphQL's POST-based query model.

Versioning REST APIs with path-based versioning (`/v1/`, `/v2/`) is a well-understood pattern with predictable deprecation paths. GraphQL schema evolution, while possible, requires more discipline and tooling that the team does not yet have.

## Consequences

### Positive

- Consistent API style across all public endpoints.
- Full compatibility with existing OpenAPI-based tooling and the developer portal.
- Simpler caching strategy: CDN caches GET requests by URL.
- Lower onboarding cost for third-party developers familiar with REST.

### Negative

- Frontend teams lose direct access to flexible field selection at the API boundary; they must work through the BFF layer or accept over-fetching.
- Designing good REST resources requires upfront schema planning; mistakes are harder to fix after a version is public.
- Some complex relational queries (e.g., deeply nested resource graphs) are awkward to express as REST endpoints.

## Alternatives Considered

**GraphQL as the primary API** was rejected primarily due to CDN caching limitations, tooling gaps, and the learning curve for external integrators who are more familiar with REST conventions.

**gRPC for public APIs** was rejected because browser clients cannot easily consume gRPC without a transcoding proxy, adding unnecessary complexity.
