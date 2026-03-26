---
title: "Meeting: Platform Documentation Kickoff"
type: meeting
status: final
created: "2025-10-01"
updated: "2025-10-03"
tags: [planning]
participants: ["Alice", "Bob", "Carol", "Dave"]
---

# Meeting: Platform Documentation Kickoff

**Date:** 2025-10-01
**Time:** 10:00–11:00 AM PT
**Location:** Zoom (link in calendar invite)
**Facilitator:** Alice
**Note-taker:** Carol

## Attendees

- Alice (Platform Lead)
- Bob (API Team)
- Carol (Infrastructure)
- Dave (Notifications Team)

## Agenda

1. Why we are doing this
2. Documentation structure and types
3. Ownership and contribution process
4. Tooling decision
5. Timeline and next steps

## Discussion Notes

### 1. Why We Are Doing This

Alice opened by explaining the motivation for this effort. The platform has grown significantly over the past year, and institutional knowledge is increasingly locked in individual Slack threads, engineers' heads, and scattered Notion pages. Three recent incidents were extended in duration because the responding engineer couldn't find the relevant runbook. Two new team members reported feeling lost because there was no canonical overview of how the system is structured.

The goal is to create a structured, version-controlled documentation repository that lives close to the code and is easy to search and browse.

### 2. Documentation Structure and Types

The group agreed on the following document types and their intended use:

- **ADR** — for significant, hard-to-reverse technical decisions. Should capture context, alternatives, and consequences.
- **Spec** — for detailed design of major features. Reviewed and approved before implementation.
- **Guide** — for practical how-to documentation aimed at engineers doing day-to-day work.
- **Runbook** — for operational procedures. Should be concise and action-oriented, written for someone in the middle of an incident.
- **RFC** — for proposals that need broad input before a decision is made.
- **Meeting** — for capturing decisions and action items from significant discussions.

Carol noted that runbooks in particular should be treated as living documents and reviewed regularly, not just written once and forgotten.

### 3. Ownership and Contribution Process

Each document type has an owner field. Owners are responsible for keeping their documents up to date and reviewing PRs that modify them. Any engineer can propose a new ADR or RFC; the contribution guide will explain the process.

Bob raised a concern about stale documentation becoming worse than no documentation. The group agreed to add a `status` field to all documents (e.g., `active`, `outdated`, `superseded`) so that readers can immediately see whether content is current.

Dave asked about tooling for searching across documents. This will be addressed in a separate technical discussion.

### 4. Tooling Decision

The group agreed to build a lightweight internal documentation browser rather than using an off-the-shelf wiki. This allows the docs to live in the Git repository alongside the code, benefit from standard code review processes, and be searched programmatically by internal tooling.

The browser will parse YAML frontmatter from Markdown files and provide a searchable, filterable interface.

### 5. Timeline and Next Steps

| Action Item | Owner | Due Date |
|-------------|-------|----------|
| Draft initial document templates | Alice | 2025-10-08 |
| Set up `test-docs/` with sample files | Bob | 2025-10-10 |
| Write contribution guide | Carol | 2025-10-15 |
| Begin documentation browser implementation | Dave | 2025-10-15 |
| Migrate three existing Notion runbooks | Carol | 2025-10-22 |

## Decisions Made

- Documentation lives in the `test-docs/` directory at the repository root.
- All documents use YAML frontmatter with a standard set of required fields.
- A `status` field is required on all documents.
- The internal documentation browser will be the primary access point.

## Next Meeting

Follow-up review of the documentation browser prototype: scheduled for 2025-10-22 at 10:00 AM PT.
