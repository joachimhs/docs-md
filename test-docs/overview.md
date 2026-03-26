---
title: "Acme Platform Overview"
type: doc
status: active
created: "2025-10-01"
updated: "2026-01-15"
tags: [overview, getting-started]
---

# Acme Platform Overview

Welcome to the Acme Platform internal documentation hub. This repository contains architecture decision records, technical specifications, operational runbooks, guides, and meeting notes that capture how we build and operate the Acme Platform.

## What Is the Acme Platform?

The Acme Platform is an internal system that powers customer-facing product features across the company. It is composed of several independently deployable services that share a common authentication layer, a unified data pipeline, and a standardized deployment toolchain. Engineering teams across the organization contribute to and depend on the platform.

The platform currently serves roughly 40 internal teams and handles millions of API requests per day. It is designed for high availability, observability, and incremental extensibility.

## How to Use This Documentation

Documentation is organized by type:

- **ADRs (Architecture Decision Records)** — Capture significant technical decisions, the context that drove them, and the trade-offs considered. Browse `adr/` for the full history.
- **Specs** — Detailed technical specifications for major features and subsystems. Found in `spec/`.
- **Guides** — Practical how-to documents for common development and operational tasks. Found in `guide/`.
- **Runbooks** — Step-by-step operational procedures for incidents and maintenance. Found in `runbook/`.
- **RFCs** — Requests for comments on proposed changes or new directions. Found in `rfc/`.
- **Meeting Notes** — Records of significant planning and architectural discussions. Found in `meeting/`.

## Getting Started

If you are new to the Acme Platform, we recommend starting with the following documents in order:

1. Read the [Local Dev Setup Guide](guide/guide-001-local-dev-setup.md) to get your environment running.
2. Review the [Auth System Spec](spec/spec-001-auth-system.md) to understand how authentication and authorization work.
3. Browse recent ADRs to understand the architectural direction of the platform.

## Contributing

All engineers are encouraged to propose ADRs and RFCs when making decisions that will affect more than one team or that are difficult to reverse. Use the templates in `templates/` as a starting point. Open a pull request and request reviews from the relevant tech leads.

### Review Process

Each document type has a defined review process:

- **ADRs** require review from at least two senior engineers and one tech lead before being marked `accepted`.
- **Specs** require approval from the owning team lead and one stakeholder from a consuming team.
- **Runbooks** are reviewed during on-call handoffs and updated at least quarterly.

## Contact

Questions about the platform or this documentation should be directed to `#platform-eng` in Slack or filed as issues in the `acme-platform` GitHub repository.
