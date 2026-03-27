import simpleGit, { type SimpleGit } from 'simple-git';
import { REPO_ROOT, DOCS_ROOT } from './config';
import { resolve, relative } from 'node:path';

function getGit(): SimpleGit {
  return simpleGit(REPO_ROOT);
}

export async function isGitRepo(): Promise<boolean> {
  try {
    const git = getGit();
    await git.status();
    return true;
  } catch {
    return false;
  }
}

export async function getDocsStatus() {
  const git = getGit();
  const status = await git.status();

  const docsPrefix = relative(REPO_ROOT, DOCS_ROOT);
  const filterDocs = (files: string[]) => files.filter(f => f.startsWith(docsPrefix + '/') || f.startsWith(docsPrefix + '\\'));

  // Check if any remote is configured
  let hasRemote = false;
  try {
    const remotes = await git.getRemotes();
    hasRemote = remotes.length > 0;
  } catch {
    // ignore
  }

  // status.ahead is 0 when the branch has no upstream tracking branch,
  // even if there are unpushed commits. Compute ahead manually by
  // counting commits that exist locally but not on the remote.
  let ahead = status.ahead;
  if (hasRemote && ahead === 0 && status.current) {
    try {
      // Try to count commits ahead of origin/{branch}
      const remote = `origin/${status.current}`;
      const log = await git.log({ from: remote, to: 'HEAD' });
      ahead = log.total;
    } catch {
      // Remote branch doesn't exist yet — all local commits are unpushed
      try {
        const log = await git.log();
        ahead = log.total;
      } catch {
        // empty repo, no commits at all
        ahead = 0;
      }
    }
  }

  return {
    branch: status.current || 'unknown',
    modified: filterDocs(status.modified),
    added: filterDocs(status.not_added),
    deleted: filterDocs(status.deleted),
    staged: filterDocs(status.staged),
    ahead,
    behind: status.behind,
    isClean: status.isClean(),
    hasRemote,
  };
}

export async function getFileHistory(docPath: string, limit = 50) {
  const git = getGit();
  const fullPath = resolve(DOCS_ROOT, docPath);
  const relativePath = relative(REPO_ROOT, fullPath);

  const log = await git.log({
    file: relativePath,
    maxCount: limit,
  });

  return log.all.map(entry => ({
    hash: entry.hash,
    short_hash: entry.hash.slice(0, 7),
    author: entry.author_name,
    email: entry.author_email,
    date: entry.date,
    message: entry.message,
  }));
}

export async function getFileDiff(docPath: string, fromHash: string, toHash?: string) {
  const git = getGit();
  const fullPath = resolve(DOCS_ROOT, docPath);
  const relativePath = relative(REPO_ROOT, fullPath);

  const range = toHash ? `${fromHash}..${toHash}` : `${fromHash}~1..${fromHash}`;
  const diff = await git.diff([range, '--', relativePath]);
  return diff;
}

export async function getFileAtCommit(docPath: string, hash: string): Promise<string> {
  const git = getGit();
  const fullPath = resolve(DOCS_ROOT, docPath);
  const relativePath = relative(REPO_ROOT, fullPath);

  return git.show([`${hash}:${relativePath}`]);
}

export async function commitDocChange(
  docPath: string,
  message: string,
  author?: { name: string; email: string }
) {
  const git = getGit();
  const fullPath = resolve(DOCS_ROOT, docPath);
  const docRelative = relative(REPO_ROOT, fullPath);

  await git.add([docRelative]);

  const options: Record<string, string> = {};
  if (author) {
    options['--author'] = `${author.name} <${author.email}>`;
  }

  return git.commit(message, undefined, options);
}

export async function pushChanges() {
  const git = getGit();

  // Push with --set-upstream so the tracking branch is created if needed
  const branch = (await git.status()).current || 'main';
  await git.push(['-u', 'origin', branch]);
  return { pushed: true, ahead: 0 };
}
