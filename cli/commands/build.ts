import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function build(options: { static?: boolean; out?: string }) {
  const repoRoot = process.cwd();
  const pkgDir = resolve(__dirname, '..', '..');

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    DOCSMD_REPO_ROOT: repoRoot,
  };

  if (options.static) {
    env.DOCSMD_ADAPTER = 'static';
    console.log(chalk.blue('Building static site...'));
  } else {
    console.log(chalk.blue('Building Node server...'));
  }

  try {
    execSync('npx vite build', {
      cwd: pkgDir,
      env,
      stdio: 'inherit',
    });

    const outDir = options.static ? 'build-static' : 'build';
    console.log(chalk.green(`\nBuild complete: ${resolve(pkgDir, outDir)}`));

    if (options.static) {
      console.log(chalk.dim(`\nServe with: npx serve ${resolve(pkgDir, outDir)}`));
    }
  } catch (e) {
    console.error(chalk.red('Build failed'));
    process.exit(1);
  }
}
