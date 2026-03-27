import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BrowseOptions {
  port: string;
  host: string;
  open: boolean;
}

export async function browse(opts: BrowseOptions): Promise<void> {
  const cwd = process.cwd();
  const port = parseInt(opts.port, 10) || 5176;
  const host = opts.host || 'localhost';
  const shouldOpen = opts.open !== false;

  // Validate: must be a git repo
  if (!existsSync(resolve(cwd, '.git'))) {
    log.error('Not a git repository. Run docsmd from the root of a git repo.');
    log.dim('Hint: git init to create a new repository, or navigate to your repo root.');
    process.exit(1);
  }

  // Validate: docs/ must exist
  if (!existsSync(resolve(cwd, 'docs'))) {
    log.error('No docs/ directory found.');
    log.dim('Hint: run docsmd init to scaffold the docs folder.');
    process.exit(1);
  }

  // Resolve path to the pre-built SvelteKit handler
  const handlerPath = resolve(__dirname, '..', '..', 'build', 'handler.js');
  if (!existsSync(handlerPath)) {
    log.error('Server build not found.');
    log.dim(`Expected: ${handlerPath}`);
    log.dim('Make sure you are using the installed version of docsmd.');
    process.exit(1);
  }

  // Set environment variables for the SvelteKit server
  process.env.PORT = String(port);
  process.env.HOST = host;
  process.env.ORIGIN = `http://${host}:${port}`;
  process.env.DOCSMD_REPO_ROOT = cwd;

  // Dynamically import the built handler
  const { handler } = await import(handlerPath) as { handler: (req: unknown, res: unknown, next: unknown) => void };

  const server = createServer((req, res) => {
    handler(req, res, () => {
      res.statusCode = 404;
      (res as import('node:http').ServerResponse).end('Not found');
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log.error(`Port ${port} is already in use.`);
      log.dim(`Hint: try a different port with --port <number>`);
      log.dim(`Example: docsmd browse --port 5177`);
    } else {
      log.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = () => {
    log.dim('Shutting down...');
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(port, host, async () => {
    const url = `http://${host}:${port}`;
    log.header('docs.md');
    log.success(`Server running at ${url}`);
    log.dim(`Docs: ${cwd}/docs`);
    log.dim('Press Ctrl+C to stop\n');

    if (shouldOpen) {
      try {
        const openMod = await import('open');
        await openMod.default(url);
      } catch {
        // Opening browser is best-effort
      }
    }
  });
}
