---
title: "ADR-001: Use PostgreSQL as the Primary Database"
type: adr
status: accepted
created: "2025-11-01"
updated: "2025-11-20"
owner: "@alice"
tags: [database, infrastructure]
decision_date: "2025-11-15"
participants: ["Alice", "Bob", "Carol"]
---

# ADR-001: Use PostgreSQL as the Primary Database

## Status

Accepted

## Context

The Acme Platform needs a primary relational database to store user records, team configurations, audit logs, and transactional business data. As the platform has grown, we have accumulated three separate data stores: a legacy MySQL 5.7 instance, a managed Amazon Aurora MySQL cluster, and a SQLite file used in some service integration tests. This fragmentation increases operational burden, complicates migrations, and makes it difficult to enforce consistent backup and compliance policies.

We evaluated several options during Q4 2025: PostgreSQL (managed via Amazon RDS), MySQL 8, Amazon Aurora PostgreSQL, and CockroachDB. The team considered the following criteria:

- **Operational maturity** — how well-understood is the tooling among existing engineers?
- **Feature richness** — does the database support JSONB, full-text search, row-level security, and advanced indexing?
- **Cost** — what is the projected cost at our current and 3x scale?
- **Migration path** — can we migrate existing data without an extended downtime window?

## Decision

We will adopt PostgreSQL 16 on Amazon RDS as the single primary relational database for all Acme Platform services. All new services must use this instance (or a read replica provisioned from it). Existing services will be migrated on a rolling basis over Q1 and Q2 2026.

Aurora MySQL remains available for the legacy billing service until that service is rewritten, expected in Q3 2026. SQLite is permitted only in test environments.

## Consequences

### Positive

- Unified operational model: one backup strategy, one monitoring dashboard, one set of runbooks.
- Access to PostgreSQL-specific features: JSONB columns for semi-structured data, full-text search with `tsvector`, and row-level security for multi-tenant isolation.
- Strong community and ecosystem support, including first-class support from most ORM libraries used in the platform.
- Amazon RDS Multi-AZ provides automatic failover with minimal configuration.

### Negative

- Engineers familiar only with MySQL will need a short onboarding period to understand PostgreSQL-specific behavior (e.g., transaction isolation defaults, sequence handling, `ILIKE` vs `LIKE`).
- The billing service migration is deferred, leaving two active databases for the next two quarters.
- RDS instance costs are slightly higher than the current Aurora MySQL configuration, estimated at +12% per month. This is accepted given the long-term simplification benefit.

## Alternatives Considered

**CockroachDB** was rejected due to limited RLS support and higher operational complexity for the team's current size.

**Aurora PostgreSQL** remains a potential future upgrade path but was not selected now to avoid locking into Aurora-specific extensions before the team has stabilized the data model.
