import { env } from '$env/dynamic/private';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import type { DocsMDConfig, DocTypeConfig, AuthConfig, HostingConfig } from '$lib/types';

// REPO_ROOT: from env or cwd
export const REPO_ROOT = env.DOCSMD_REPO_ROOT || process.env.DOCSMD_REPO_ROOT || process.cwd();

// DOCS_ROOT: configurable docs directory name (defaults to 'docs')
const docsDir = env.DOCSMD_DOCS_DIR || process.env.DOCSMD_DOCS_DIR || 'docs';
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

const DEFAULT_AUTH: AuthConfig = {
  enabled: false,
  mode: 'simple',
  public_read: true,
  simple: {
    users_file: '.docsmd-users.yml',
    session_secret: '',
  },
  oauth: {
    provider: 'github',
    client_id: '',
    client_secret: '',
    allowed_domains: [],
    default_role: 'viewer',
  },
  roles: {
    admin: [],
    editor: [],
  },
};

const DEFAULT_HOSTING: HostingConfig = {
  adapter: 'node',
  base_path: '/',
  auto_pull: false,
  auto_pull_interval: 60,
};

/**
 * Load and merge configuration.
 * Reads .docsmd.yml if it exists, merges with defaults.
 */
export function loadConfig(): DocsMDConfig {
  const configPath = resolve(DOCS_ROOT, '.docsmd.yml');
  let userConfig: Partial<DocsMDConfig> = {};

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf8');
    userConfig = (yaml.load(raw) as Partial<DocsMDConfig>) || {};
  }

  // Build auth config with env var overrides
  const authConfig: AuthConfig = {
    ...DEFAULT_AUTH,
    ...userConfig.auth,
    simple: {
      ...DEFAULT_AUTH.simple,
      ...userConfig.auth?.simple,
      session_secret:
        process.env.DOCSMD_SESSION_SECRET ||
        userConfig.auth?.simple?.session_secret ||
        DEFAULT_AUTH.simple.session_secret,
    },
    oauth: {
      ...DEFAULT_AUTH.oauth,
      ...userConfig.auth?.oauth,
      client_id:
        process.env.DOCSMD_OAUTH_CLIENT_ID ||
        userConfig.auth?.oauth?.client_id ||
        DEFAULT_AUTH.oauth.client_id,
      client_secret:
        process.env.DOCSMD_OAUTH_CLIENT_SECRET ||
        userConfig.auth?.oauth?.client_secret ||
        DEFAULT_AUTH.oauth.client_secret,
    },
    roles: {
      ...DEFAULT_AUTH.roles,
      ...userConfig.auth?.roles,
    },
  };

  const hostingConfig: HostingConfig = {
    ...DEFAULT_HOSTING,
    ...userConfig.hosting,
    adapter:
      (process.env.DOCSMD_ADAPTER as 'node' | 'static') ||
      userConfig.hosting?.adapter ||
      DEFAULT_HOSTING.adapter,
    base_path:
      process.env.DOCSMD_BASE_PATH ||
      userConfig.hosting?.base_path ||
      DEFAULT_HOSTING.base_path,
  };

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
    auth: authConfig,
    hosting: hostingConfig,
  };
}
