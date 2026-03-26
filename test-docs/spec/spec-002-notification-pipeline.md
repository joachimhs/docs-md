---
title: "Spec-002: Notification Pipeline"
type: spec
status: draft
created: "2026-01-10"
updated: "2026-03-01"
owner: "@dave"
tags: [notifications, messaging]
---

# Spec-002: Notification Pipeline

## Overview

This specification defines the Notification Pipeline — the system responsible for routing, formatting, and delivering notifications to users and external systems. Notifications are triggered by platform events (deployment completions, alert firings, policy violations, user mentions) and delivered through one or more configured channels (email, Slack, webhook, in-app).

## Goals

- Decouple event producers from notification delivery: services emit events without knowing how they will be delivered.
- Support per-user and per-organization channel preferences and quiet hours.
- Guarantee at-least-once delivery with deduplication to prevent duplicate notifications within a configurable window.
- Provide an audit trail of all notifications sent, including delivery status.

## Architecture

### Event Ingestion

Services publish notification events to the `platform.notifications` Amazon SQS queue using a standard envelope format:

```json
{
  "event_id": "evt_01HQ5V3KZXR8MYPBCD9F7GW2NE",
  "event_type": "deployment.completed",
  "actor_id": "user_abc123",
  "resource_id": "deploy_xyz789",
  "organization_id": "org_def456",
  "payload": {
    "service": "billing-api",
    "environment": "production",
    "status": "success",
    "duration_seconds": 142
  },
  "occurred_at": "2026-03-01T14:32:00Z"
}
```

The `event_id` uses ULID format to ensure monotonic ordering and global uniqueness.

### Notification Router

The **Notification Router** is a consumer of the SQS queue. For each incoming event, it:

1. Looks up notification rules for the organization that match the event type.
2. Resolves the set of recipients based on the rule configuration (e.g., "all org members with `admin` role", "the user who triggered the action").
3. Loads each recipient's channel preferences and applies quiet-hours filtering.
4. Enqueues one delivery task per channel per recipient into the `platform.notification-deliveries` queue.

### Delivery Workers

Separate worker processes consume from the delivery queue for each channel type. Each worker:

- Renders the notification body using a Handlebars template.
- Calls the appropriate delivery adapter (AWS SES for email, Slack API for Slack, HTTP POST for webhooks).
- Records the delivery attempt (status, timestamp, provider response) in the `notification_deliveries` table.
- On failure, retries with exponential backoff up to 5 times before marking the delivery as `failed`.

## Data Model

### Notification Rules

```sql
CREATE TABLE notification_rules (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  event_type  TEXT NOT NULL,
  recipient_scope  TEXT NOT NULL, -- 'role:admin', 'user:abc', 'all'
  channels    TEXT[] NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### User Preferences

Users can configure per-channel preferences and define quiet hours:

```json
{
  "user_id": "user_abc123",
  "preferences": {
    "email": { "enabled": true, "digest": "immediate" },
    "slack": { "enabled": true, "digest": "immediate" },
    "in_app": { "enabled": true }
  },
  "quiet_hours": {
    "enabled": true,
    "timezone": "America/New_York",
    "start": "22:00",
    "end": "08:00"
  }
}
```

## Deduplication

To prevent duplicate notifications (e.g., if an event is replicated due to SQS at-least-once semantics), the router uses an idempotency key of `SHA-256(event_id + recipient_id + channel)`. Before enqueuing a delivery task, the router checks a 24-hour TTL key in Redis. If the key exists, the task is skipped.

## Open Questions

- Should digest mode (batching multiple events into a single notification per time window) be in scope for the initial implementation, or deferred?
- What is the retention policy for the `notification_deliveries` audit table? Proposed: 90 days.
- Should we support custom Handlebars templates per organization, or use a fixed set of platform-managed templates initially?
