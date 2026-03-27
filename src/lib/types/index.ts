/** Frontmatter fields parsed from a document's YAML header */
export interface DocFrontmatter {
  title: string;
  type?: string;
  status?: string;
  owner?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  id?: string;
  summary?: string;
  priority?: string;
  assignee?: string | string[];
  due_date?: string;
  supersedes?: string;
  superseded_by?: string;
  related?: string[];
  version?: string;
  audience?: string[];
  decision_date?: string;
  participants?: string[];
  template?: string;
  [key: string]: unknown;
}

/** A document as represented in the manifest */
export interface ManifestEntry {
  id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  created: string;
  updated: string;
  tags: string[];
  path: string;
  summary: string;
  word_count: number;
}

/** The complete manifest file structure */
export interface Manifest {
  generated: string;
  version: string;
  document_count: number;
  documents: ManifestEntry[];
}

/** A fully parsed document ready for rendering */
export interface ParsedDocument {
  frontmatter: DocFrontmatter;
  body: string;
  html: string;
  path: string;
  headings: DocHeading[];
}

/** A heading extracted from the document body */
export interface DocHeading {
  level: number;
  text: string;
  slug: string;
}

/** Search result returned to the UI */
export interface SearchResult {
  id: string;
  title: string;
  type: string;
  status: string;
  path: string;
  score: number;
  snippet: string;
  tags: string[];
  updated: string;
}

/** Active search filters */
export interface SearchFilters {
  type: string | null;
  status: string | null;
  tags: string[];
  owner: string | null;
}

/** Search response including facets */
export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  facets: {
    type: Record<string, number>;
    status: Record<string, number>;
    tags: Record<string, number>;
  };
}

/** Document type configuration (from .docsmd.yml or defaults) */
export interface DocTypeConfig {
  label: string;
  plural: string;
  folder: string;
  statuses: string[];
  default_status: string;
  icon: string;
}

/** The .docsmd.yml configuration file structure */
export interface DocsMDConfig {
  spec_version: string;
  project: {
    name: string;
    description?: string;
    logo?: string;
  };
  types: Record<string, DocTypeConfig>;
  search?: {
    fuzzy_threshold?: number;
    result_limit?: number;
    snippet_length?: number;
  };
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    sidebar_default?: 'expanded' | 'collapsed';
    default_editor?: 'richtext' | 'markdown';
  };
  auth?: AuthConfig;
  hosting?: HostingConfig;
}

// --- Auth types (Phase 4) ---

/** Authenticated user */
export interface AuthUser {
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  avatar?: string;
}

/** Role type */
export type AuthRole = 'viewer' | 'editor' | 'admin';

/** Permission actions */
export type AuthAction = 'read' | 'edit' | 'commit' | 'push' | 'admin';

/** Simple auth user entry from .docsmd-users.yml */
export interface SimpleAuthUser {
  email: string;
  name: string;
  password_hash: string;
  role: AuthRole;
}

/** Auth configuration within DocsMDConfig */
export interface AuthConfig {
  enabled: boolean;
  mode: 'simple' | 'oauth';
  public_read: boolean;
  simple: {
    users_file: string;
    session_secret: string;
  };
  oauth: {
    provider: 'github' | 'gitlab' | 'google';
    client_id: string;
    client_secret: string;
    allowed_domains: string[];
    default_role: AuthRole;
  };
  roles: {
    admin: string[];
    editor: string[];
  };
}

/** Hosting configuration within DocsMDConfig */
export interface HostingConfig {
  adapter: 'node' | 'static';
  base_path: string;
  auto_pull: boolean;
  auto_pull_interval: number; // seconds
}
