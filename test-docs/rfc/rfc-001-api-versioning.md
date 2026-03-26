---
title: "RFC-001: API Versioning Strategy"
type: rfc
status: discussion
created: "2026-01-20"
updated: "2026-03-10"
owner: "@bob"
tags: [api, versioning]
---

# RFC-001: API Versioning Strategy

## Summary

This RFC proposes a versioning strategy for public Acme Platform APIs. It covers how versions are expressed in the URL, how breaking changes are defined, the deprecation timeline, and how we communicate changes to consumers. Comments and objections are welcome in the pull request discussion.

## Motivation

As the platform grows and more external teams integrate against our APIs, we need a clear, published policy for how we version and evolve endpoints. Without a defined strategy, we risk breaking consumers unexpectedly, accumulating technical debt in the form of version-specific code paths, or over-constraining the API design to avoid ever making breaking changes.

The current informal approach — bumping the major version occasionally when things break — has already caused confusion for two internal teams and one partner integration.

## Proposed Strategy

### Version Expression

API versions are expressed as a path prefix: `/v{N}/`. For example:

```
GET https://api.acme.io/v1/organizations/{org_id}/members
GET https://api.acme.io/v2/organizations/{org_id}/members
```

Header-based versioning (e.g., `API-Version: 2026-01-01`) was considered as an alternative (see below) but is not proposed here.

### What Constitutes a Breaking Change

A new major version (`v1` → `v2`) is required for any of the following:

- Removing an endpoint
- Removing a required or optional field from a response body
- Changing the type or format of a field (e.g., `string` to `number`, date format changes)
- Changing authentication requirements for an endpoint
- Modifying the semantics of an existing field

Additive changes — adding new optional fields to responses, adding new endpoints, adding new optional query parameters — are **not** breaking and do not require a version bump.

### Deprecation Timeline

When a new major version is released:

1. The previous version is marked **deprecated** with a `Deprecation` response header on every request.
2. Consumers receive an email notification and a Slack message to `#api-consumers`.
3. The deprecated version remains available for **12 months** from the date of the new version's GA release.
4. After 12 months, the deprecated version is removed. Requests return `410 Gone` with a migration guide URL in the response body.

### Versioning Scope

Versioning applies at the API level, not at the individual endpoint level. All endpoints within a given version share the same deprecation timeline.

## Alternatives Considered

### Date-Based Versioning (Stripe Model)

Stripe uses a date-based version string (e.g., `2023-10-16`) passed as a header or account setting. This allows very granular per-endpoint versioning and eliminates the need for parallel URL paths.

**Pros:** No URL duplication, fine-grained control, consumers can pin to a specific behavior snapshot.

**Cons:** Significantly higher implementation complexity — requires a compatibility layer that transforms responses based on the requested version date. Our team does not have the capacity to build and maintain this system in the near term.

### Semantic Versioning with Subresource URLs

Some APIs version individual resources independently (e.g., `/users/v2/`, `/projects/v1/`). This reduces churn for stable resources when other resources change.

**Cons:** Consumers must track versions per resource, increasing cognitive overhead. Rejected for simplicity.

## Open Questions

1. Should the unversioned path (e.g., `/organizations/`) be an alias for the latest version or return a `400` directing clients to use a versioned path?
2. What is the process for requesting an exception to the 12-month deprecation window for critical consumers who cannot migrate in time?
3. Should we publish an API changelog as a structured machine-readable file (e.g., OpenAPI overlays) in addition to release notes?

## Request for Comments

Please leave feedback on this RFC in the pull request by 2026-04-01. The API Working Group will review comments and publish a final decision as ADR-005.
