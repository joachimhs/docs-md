---
title: "Guide: Deploying to Production"
type: guide
status: outdated
created: "2025-10-20"
updated: "2025-12-05"
tags: [deployment, ci-cd]
---

# Guide: Deploying to Production

> **Warning:** This guide is outdated. It describes the deployment process as of December 2025 using the v1 CI pipeline. The platform has since migrated to GitHub Actions and Argo CD. An updated deployment guide is in progress. For current deployment questions, ask in `#platform-eng`.

## Overview

Deployments to the Acme Platform production environment are managed through a combination of CircleCI (for build and test) and a custom deploy script that uses the AWS CLI to update ECS services. This document describes that process.

## Prerequisites

- Access to the `acme-prod` AWS account (request via the access management portal)
- The `acme-deploy` CLI tool installed (`npm install -g @acme/deploy-cli`)
- AWS credentials configured with the `acme-prod` profile
- Membership in the `platform-deployers` GitHub team

## Deployment Process

### 1. Merge to Main

Deployments are triggered by merges to the `main` branch. The CircleCI workflow defined in `.circleci/config.yml` runs on every push to `main`:

1. Install dependencies
2. Run unit tests and integration tests
3. Build Docker images and push to ECR
4. Tag the image with the Git commit SHA

### 2. Promote to Staging

After the CI workflow completes, the image is automatically deployed to the **staging** environment. Monitor the deployment in the CircleCI dashboard and verify that smoke tests pass.

### 3. Promote to Production

Production deploys are manual and require approval from a member of the `platform-leads` GitHub team. To promote from staging to production:

```bash
acme-deploy promote \
  --service billing-api \
  --from-env staging \
  --to-env production \
  --commit-sha abc1234
```

The CLI will:
- Verify that the image was successfully deployed to staging
- Open a GitHub deployment for audit trail purposes
- Update the ECS task definition with the new image
- Trigger a rolling update and wait for health checks

### 4. Monitor the Rollout

Watch the ECS service events in the AWS Console or use the CLI:

```bash
acme-deploy status --service billing-api --env production
```

A successful rollout will show all tasks in `RUNNING` state with the new task definition revision.

## Rollback

If a deployment causes errors, roll back to the previous image:

```bash
acme-deploy rollback --service billing-api --env production
```

This redeploys the previous task definition revision. Rollbacks typically complete within 3–5 minutes.

## Deployment Checklist

Before promoting to production, confirm the following:

- [ ] All CI checks are green on the commit being deployed
- [ ] The staging smoke test suite passed
- [ ] No open P1 incidents on the status page
- [ ] The on-call engineer has been notified
- [ ] The relevant feature flags are configured in the production LaunchDarkly environment
- [ ] A rollback plan is documented in the deployment PR

## Notifications

Deployment start and completion events are automatically posted to `#deployments` in Slack. If the deployment fails, the on-call engineer receives a PagerDuty alert.
