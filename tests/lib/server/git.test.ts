import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('git', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('isGitRepo', () => {
    it('should return true for a git repository', async () => {
      const { isGitRepo } = await import('$lib/server/git');
      expect(await isGitRepo()).toBe(true);
    });
  });

  describe('getDocsStatus', () => {
    it('should return status object with branch name', async () => {
      const { getDocsStatus } = await import('$lib/server/git');
      const status = await getDocsStatus();
      expect(status.branch).toBeDefined();
      expect(typeof status.branch).toBe('string');
      expect(typeof status.isClean).toBe('boolean');
      expect(Array.isArray(status.modified)).toBe(true);
      expect(Array.isArray(status.added)).toBe(true);
      expect(typeof status.ahead).toBe('number');
      expect(typeof status.behind).toBe('number');
    });
  });

  describe('getFileHistory', () => {
    it('should return commit history for a committed file', async () => {
      const { getFileHistory } = await import('$lib/server/git');
      const history = await getFileHistory('overview.md', 5);
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('hash');
        expect(history[0]).toHaveProperty('short_hash');
        expect(history[0]).toHaveProperty('author');
        expect(history[0]).toHaveProperty('date');
        expect(history[0]).toHaveProperty('message');
      }
    });
  });

  describe('getFileDiff', () => {
    it('should return diff string for a commit', async () => {
      const { getFileHistory, getFileDiff } = await import('$lib/server/git');
      const history = await getFileHistory('overview.md', 1);
      if (history.length > 0) {
        const diff = await getFileDiff('overview.md', history[0].hash);
        expect(typeof diff).toBe('string');
      }
    });
  });

  describe('getFileAtCommit', () => {
    it('should return file content at a specific commit', async () => {
      const { getFileHistory, getFileAtCommit } = await import('$lib/server/git');
      const history = await getFileHistory('overview.md', 1);
      if (history.length > 0) {
        const content = await getFileAtCommit('overview.md', history[0].hash);
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });
});
