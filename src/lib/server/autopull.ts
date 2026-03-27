import { loadConfig } from './config';
import { pullChanges, getDocsStatus, isGitRepo } from './git';
import { invalidateManifest } from './manifest';
import { invalidateSearchIndex } from './search';

export type AutoPullState = 'active' | 'blocked' | 'disabled' | 'no-remote';

let timer: ReturnType<typeof setInterval> | null = null;
let lastState: AutoPullState = 'disabled';
let lastPull: string | null = null;
let lastMessage: string | null = null;
let notifyFn: ((event: string, data: Record<string, unknown>) => void) | null = null;

export function setAutoPullNotifyFn(fn: (event: string, data: Record<string, unknown>) => void) {
  notifyFn = fn;
}

/**
 * Get the current auto-pull state for the UI.
 */
export function getAutoPullStatus() {
  return {
    state: lastState,
    lastPull,
    lastMessage,
  };
}

/**
 * Run a single pull cycle. Called by the timer and by manual trigger.
 */
async function doPull(): Promise<{ pulled: boolean; state: AutoPullState; message: string }> {
  if (!(await isGitRepo())) {
    lastState = 'disabled';
    return { pulled: false, state: 'disabled', message: 'Not a git repository' };
  }

  const status = await getDocsStatus();

  if (!status.hasRemote) {
    lastState = 'no-remote';
    lastMessage = 'No remote configured';
    return { pulled: false, state: 'no-remote', message: 'No remote configured' };
  }

  // Unpushed commits block auto-pull
  if (status.ahead > 0) {
    lastState = 'blocked';
    lastMessage = `${status.ahead} unpushed commit(s) — push or reset to resume auto-pull`;
    notifyFn?.('autopull-blocked', { ahead: status.ahead, message: lastMessage });
    return { pulled: false, state: 'blocked', message: lastMessage };
  }

  // Safe to pull (stashes uncommitted changes automatically)
  const result = await pullChanges();

  if (result.pulled) {
    lastState = 'active';
    lastPull = new Date().toISOString();
    lastMessage = result.message;

    // Invalidate caches so next request picks up new content
    invalidateManifest();
    invalidateSearchIndex();
    notifyFn?.('autopull-completed', { message: result.message, stashed: result.stashed });
  } else {
    lastMessage = result.message;
    // If pull failed due to diverged branches, mark as blocked
    if (result.message.includes('Push or reset')) {
      lastState = 'blocked';
      notifyFn?.('autopull-blocked', { message: result.message });
    }
  }

  return { pulled: result.pulled, state: lastState, message: result.message };
}

/**
 * Start the auto-pull timer. Called once on server startup.
 */
export async function startAutoPull() {
  if (timer) return;

  const config = loadConfig();
  if (!config.hosting?.auto_pull) {
    lastState = 'disabled';
    return;
  }

  const intervalSec = config.hosting.auto_pull_interval || 60;
  lastState = 'active';

  console.log(`[autopull] Starting auto-pull every ${intervalSec}s`);

  // Run once immediately
  try {
    await doPull();
  } catch (e) {
    console.error('[autopull] Initial pull failed:', e);
  }

  timer = setInterval(async () => {
    try {
      await doPull();
    } catch (e) {
      console.error('[autopull] Pull failed:', e);
    }
  }, intervalSec * 1000);
}

/**
 * Trigger a manual pull (used by the API endpoint).
 */
export async function triggerPull() {
  return doPull();
}

export function stopAutoPull() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
