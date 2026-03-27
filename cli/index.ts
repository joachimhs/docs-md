#!/usr/bin/env node
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const pkg = require(resolve(__dirname, '..', '..', 'package.json')) as { version: string };

const program = new Command();

program
  .name('docsmd')
  .description('docs.md — Git-native documentation system')
  .version(pkg.version);

program
  .command('browse')
  .description('Start the docs.md web UI server')
  .option('-p, --port <number>', 'Port to listen on', '5176')
  .option('--host <host>', 'Host to bind to', 'localhost')
  .option('--no-open', 'Do not open the browser automatically')
  .action(async (opts) => {
    const { browse } = await import('./commands/browse.js');
    await browse(opts);
  });

program
  .command('init [name]')
  .description('Scaffold the docs/ folder in this repository')
  .option('--ai', 'Generate DOCSMD.md with agent instructions at repo root')
  .action(async (name, opts) => {
    const { init } = await import('./commands/init.js');
    await init(opts, name);
  });

program
  .command('manifest')
  .description('Print a summary of all documents in docs/')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .action(async (opts) => {
    const { manifest } = await import('./commands/manifest.js');
    await manifest(opts);
  });

program
  .command('search <query>')
  .description('Search documents in docs/')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .option('-t, --type <type>', 'Filter by document type')
  .option('-s, --status <status>', 'Filter by status')
  .option('--plain', 'Plain output (no colors)')
  .option('-l, --limit <number>', 'Maximum results to show', '10')
  .action(async (query, opts) => {
    const { search } = await import('./commands/search.js');
    await search(query, opts);
  });

program
  .command('build')
  .description('Build a deployable documentation site')
  .option('--static', 'Build as a static site (no server required)')
  .option('--out <dir>', 'Output directory', 'build')
  .action(async (opts) => {
    const { build } = await import('./commands/build.js');
    await build(opts);
  });

const userCmd = program
  .command('user')
  .description('Manage docsmd users (simple auth mode)');

userCmd
  .command('add <email>')
  .description('Add a new user')
  .option('--name <name>', 'Display name')
  .option('--role <role>', 'Role: viewer, editor, admin', 'editor')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .action(async (email, opts) => {
    const { userAdd } = await import('./commands/user.js');
    await userAdd(email, opts);
  });

userCmd
  .command('list')
  .description('List all users')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .action(async (opts) => {
    const { userList } = await import('./commands/user.js');
    await userList(opts);
  });

program.parse(process.argv);
