import { env } from '$env/dynamic/private';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import type { SpecMDConfig, DocTypeConfig } from '$lib/types';

// REPO_ROOT: from env or cwd
export const REPO_ROOT = env.SPECMD_REPO_ROOT || process.env.SPECMD_REPO_ROOT || process.cwd();

// DOCS_ROOT: configurable docs directory name (defaults to 'docs')
const docsDir = env.SPECMD_DOCS_DIR || process.env.SPECMD_DOCS_DIR || 'docs';
export const DOCS_ROOT = resolve(REPO_ROOT, docsDir);

/** Default document type configurations */
const DEFAULT_TYPES: Record<string, DocTypeConfig> = {
  adr: {
    label: 'ADR', plural: 'Architectural Decisions', folder: 'adr',
    statuses: ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'],
    default_status: 'proposed', icon: 'scale',
  },
  spec: {
    label: 'Spec', plural: 'Technical Specifications', folder: 'spec',
    statuses: ['draft', 'review', 'approved', 'implemented', 'deprecated'],
    default_status: 'draft', icon: 'file-text',
  },
  guide: {
    label: 'Guide', plural: 'Guides', folder: 'guide',
    statuses: ['draft', 'active', 'outdated', 'archived'],
    default_status: 'draft', icon: 'book-open',
  },
  runbook: {
    label: 'Runbook', plural: 'Runbooks', folder: 'runbook',
    statuses: ['draft', 'active', 'outdated'],
    default_status: 'draft', icon: 'terminal',
  },
  api: {
    label: 'API', plural: 'API Documentation', folder: 'api',
    statuses: ['draft', 'active', 'deprecated'],
    default_status: 'draft', icon: 'plug',
  },
  rfc: {
    label: 'RFC', plural: 'Requests for Comments', folder: 'rfc',
    statuses: ['draft', 'discussion', 'accepted', 'rejected', 'withdrawn'],
    default_status: 'draft', icon: 'message-square',
  },
  meeting: {
    label: 'Meeting', plural: 'Meeting Notes', folder: 'meeting',
    statuses: ['draft', 'final'],
    default_status: 'draft', icon: 'users',
  },
  doc: {
    label: 'Document', plural: 'Documents', folder: '',
    statuses: ['draft', 'active', 'archived'],
    default_status: 'draft', icon: 'file',
  },
};

/**
 * Load and merge configuration.
 * Reads .specmd.yml if it exists, merges with defaults.
 */
export function loadConfig(): SpecMDConfig {
  const configPath = resolve(DOCS_ROOT, '.specmd.yml');
  let userConfig: Partial<SpecMDConfig> = {};

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf8');
    userConfig = (yaml.load(raw) as Partial<SpecMDConfig>) || {};
  }

  return {
    spec_version: userConfig.spec_version || '0.1.0',
    project: {
      name: userConfig.project?.name || 'Documentation',
      description: userConfig.project?.description,
      logo: userConfig.project?.logo,
    },
    types: { ...DEFAULT_TYPES, ...userConfig.types },
    search: {
      fuzzy_threshold: 0.6,
      result_limit: 50,
      snippet_length: 200,
      ...userConfig.search,
    },
    ui: {
      theme: 'auto',
      sidebar_default: 'expanded',
      default_editor: 'richtext',
      ...userConfig.ui,
    },
  };
}
