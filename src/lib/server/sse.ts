/**
 * Server-Sent Events (SSE) notification system.
 * Manages connected browser clients and broadcasts file change events.
 */

const listeners = new Set<(data: string) => void>();

/**
 * Notify all connected browser clients of a file change.
 * Called from the file watcher.
 */
export function notifyClients(event: string, data: Record<string, unknown>) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const send of listeners) {
    send(payload);
  }
}

/**
 * Register a new SSE listener. Returns a cleanup function.
 */
export function addListener(send: (data: string) => void): () => void {
  listeners.add(send);
  return () => listeners.delete(send);
}
