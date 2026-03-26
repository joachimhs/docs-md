---
title: "Runbook: Incident Response"
type: runbook
status: active
created: "2025-10-25"
updated: "2026-02-15"
tags: [operations, incidents]
---

# Runbook: Incident Response

This runbook defines the standard incident response process for the Acme Platform. All engineers in the on-call rotation must be familiar with this procedure.

## Severity Levels

| Severity | Definition | Response SLA |
|----------|------------|--------------|
| P1 | Complete service outage or data loss | 15 minutes |
| P2 | Significant degradation affecting >10% of users | 30 minutes |
| P3 | Minor degradation or latency increase; workaround available | 2 hours |
| P4 | Cosmetic issues or minor bugs with no user impact | Next business day |

## Step 1: Acknowledge the Alert

When PagerDuty pages you, acknowledge the alert within the SLA window for the severity level. Acknowledging signals that you are investigating and pauses escalation.

Log in to the [PagerDuty dashboard](https://acme.pagerduty.com) or use the mobile app.

## Step 2: Assess Impact

Before diving into debugging, spend two minutes establishing the blast radius:

1. Check the [status page](https://status.acme.io) — is there an existing open incident?
2. Open the [Grafana overview dashboard](http://grafana.internal/d/platform-overview) and look for anomalies in error rate, latency (p50/p95/p99), and throughput.
3. Check the `#alerts` Slack channel for correlated alerts from other services.
4. If another on-call engineer already opened an incident, join the incident channel and coordinate rather than working in parallel.

## Step 3: Open an Incident

If no incident is open, create one:

```bash
acme-incident create \
  --severity P2 \
  --title "Elevated 5xx errors on billing-api" \
  --slack-channel "#inc-$(date +%Y%m%d)-billing"
```

The CLI will:
- Create a Slack channel for the incident
- Post the incident summary to `#incidents`
- Page the relevant service owners if severity is P1 or P2

## Step 4: Communicate

Post an initial status update to the incident Slack channel within 5 minutes of acknowledgement. Use the template:

```
**Status:** Investigating
**Impact:** Elevated error rate on billing-api (~8% of requests returning 500)
**Affected services:** billing-api, payment-processor
**Next update in:** 15 minutes
```

For P1 incidents, post updates at least every 15 minutes. For P2, every 30 minutes.

## Step 5: Investigate

### Common Diagnostic Commands

Check recent error logs for a service:

```bash
aws logs filter-log-events \
  --log-group-name /acme/billing-api/production \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "ERROR"
```

Check current ECS task health:

```bash
aws ecs describe-services \
  --cluster acme-production \
  --services billing-api \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
```

### Runbooks for Specific Scenarios

- **Database connection exhaustion** → see `runbook-002-db-connection-pool.md`
- **Memory leak / OOM kills** → see `runbook-003-oom-recovery.md`
- **Failed deployment causing regression** → use `acme-deploy rollback` (see deployment guide)

## Step 6: Resolve

Once the issue is mitigated:

1. Confirm error rates and latency have returned to baseline in Grafana.
2. Mark the incident as resolved in PagerDuty.
3. Post a resolution message to the incident Slack channel.
4. Schedule a post-mortem within 48 hours for P1 and P2 incidents.

## Step 7: Post-Mortem

Use the post-mortem template in Notion under `Engineering > Post-Mortems`. The document must include: timeline, root cause, contributing factors, impact summary, and action items with owners and due dates. Action items are tracked in the `#post-mortem-actions` Slack channel.
