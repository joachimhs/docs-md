import chalk from 'chalk';

export const log = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(chalk.green(`  ✓ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`  ✗ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`  ⚠ ${msg}`)),
  dim: (msg: string) => console.log(chalk.dim(`  ${msg}`)),
  header: (title: string) => console.log(chalk.bold(`\n  ${title}\n`)),
};
