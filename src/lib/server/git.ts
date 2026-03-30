import simpleGit, { type SimpleGit } from 'simple-git';
import { REPO_ROOT, DOCS_ROOT } from './config';
import { resolve, relative, normalize } from 'node:path';

/**
 * Resolve a doc path safely within DOCS_ROOT. Throws on path traversal.
 */
function safeDocPath(docPath: string): string {
  const full = resolve(DOCS_ROOT, normalize(docPath));
  if (!full.startsWith(DOCS_ROOT + '/') && full !== DOCS_ROOT) {
    throw new Error('Path traversal detected');
  }
  return full;
}

/**
 * Sanitize a git commit hash — only allow hex digits and ~^ for ancestor refs.
 */
function safeHash(hash: string): string {
  if (!/^[a-f0-9~^]+$/i.test(hash)) {
    throw new Error('Invalid commit hash');
  }
  return hash;
}

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
  const fullPath = safeDocPath(docPath);
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
  const fullPath = safeDocPath(docPath);
  const relativePath = relative(REPO_ROOT, fullPath);

  const from = safeHash(fromHash);
  const to = toHash ? safeHash(toHash) : undefined;
  const range = to ? `${from}..${to}` : `${from}~1..${from}`;
  const diff = await git.diff([range, '--', relativePath]);
  return diff;
}

export async function getFileAtCommit(docPath: string, hash: string): Promise<string> {
  const git = getGit();
  const fullPath = safeDocPath(docPath);
  const relativePath = relative(REPO_ROOT, fullPath);

  return git.show([`${safeHash(hash)}:${relativePath}`]);
}

export async function commitDocChange(
  docPath: string,
  message: string,
  author?: { name: string; email: string }
) {
  const git = getGit();
  const fullPath = safeDocPath(docPath);
  const docRelative = relative(REPO_ROOT, fullPath);

  // Only stage the specific doc file
  await git.add([docRelative]);

  // Commit ONLY the specified file — prevents committing other staged files
  const options: Record<string, string> = {};
  if (author) {
    const safeName = author.name.replace(/[<>"]/g, '');
    const safeEmail = author.email.replace(/[<>"]/g, '');
    options['--author'] = `${safeName} <${safeEmail}>`;
  }

  return git.commit(message, [docRelative], options);
}

/**
 * Pull changes from the remote.
 * If there are uncommitted changes, stash them first and restore after.
 * Returns info about what happened.
 */
export async function pullChanges(): Promise<{
  pulled: boolean;
  stashed: boolean;
  stashConflict: boolean;
  message: string;
}> {
  const git = getGit();
  const status = await git.status();

  if (!status.current) {
    return { pulled: false, stashed: false, stashConflict: false, message: 'No branch checked out' };
  }

  // Check for unpushed commits — refuse to pull if there are local commits ahead
  const docsStatus = await getDocsStatus();
  if (docsStatus.ahead > 0) {
    return {
      pulled: false,
      stashed: false,
      stashConflict: false,
      message: `Cannot pull: ${docsStatus.ahead} unpushed commit(s). Push or reset first.`,
    };
  }

  // Stash uncommitted changes if dirty
  const dirty = !status.isClean();
  if (dirty) {
    await git.stash(['push', '-m', 'docsmd-auto-pull-stash']);
  }

  try {
    await git.pull('origin', status.current, { '--ff-only': null });
  } catch (e: any) {
    // If pull fails, try to restore stash
    if (dirty) {
      try { await git.stash(['pop']); } catch { /* stash pop may also fail */ }
    }
    const msg = e.message || 'Pull failed';
    if (msg.includes('non-fast-forward') || msg.includes('diverged')) {
      return { pulled: false, stashed: false, stashConflict: false, message: 'Pull failed: branches have diverged. Push or reset first.' };
    }
    return { pulled: false, stashed: false, stashConflict: false, message: msg };
  }

  // Restore stash if we stashed
  let stashConflict = false;
  if (dirty) {
    try {
      await git.stash(['pop']);
    } catch {
      stashConflict = true;
    }
  }

  return {
    pulled: true,
    stashed: dirty,
    stashConflict,
    message: stashConflict
      ? 'Pulled successfully but stash had conflicts — resolve manually'
      : 'Pulled successfully',
  };
}

/**
 * Reset local branch to match the remote, discarding all unpushed commits.
 * Uncommitted changes are preserved via stash.
 */
export async function resetToRemote(): Promise<{ reset: boolean; message: string }> {
  const git = getGit();
  const status = await git.status();

  if (!status.current) {
    return { reset: false, message: 'No branch checked out' };
  }

  // Stash uncommitted changes
  const dirty = !status.isClean();
  if (dirty) {
    await git.stash(['push', '-m', 'docsmd-pre-reset-stash']);
  }

  try {
    await git.fetch('origin');
    await git.reset(['--hard', `origin/${status.current}`]);
  } catch (e: any) {
    if (dirty) {
      try { await git.stash(['pop']); } catch { /* ignore */ }
    }
    return { reset: false, message: e.message || 'Reset failed' };
  }

  // Restore stash
  if (dirty) {
    try { await git.stash(['pop']); } catch { /* conflicts possible */ }
  }

  return { reset: true, message: 'Reset to remote successfully' };
}

export async function pushChanges() {
  const git = getGit();

  const branch = (await git.status()).current || 'main';

  try {
    // Push with --set-upstream so the tracking branch is created if needed
    await git.push(['-u', 'origin', branch]);
    return { pushed: true, ahead: 0 };
  } catch (e: any) {
    const msg = e.message || '';

    // Detect common auth failures and return helpful messages
    if (msg.includes('Authentication failed') || msg.includes('could not read Username') || msg.includes('terminal prompts disabled')) {
      throw new Error(
        'Authentication failed. Set up one of:\n' +
        '  • SSH: clone with git@github.com:user/repo.git\n' +
        '  • GitHub CLI: run "gh auth login"\n' +
        '  • HTTPS token: run "git remote set-url origin https://<token>@github.com/user/repo.git"'
      );
    }

    if (msg.includes('Permission denied') || msg.includes('403')) {
      throw new Error('Permission denied. Check that your account has push access to this repository.');
    }

    if (msg.includes('rejected') || msg.includes('non-fast-forward')) {
      throw new Error('Push rejected — the remote has changes you don\'t have locally. Pull first.');
    }

    throw e;
  }
}
