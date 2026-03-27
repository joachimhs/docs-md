import { resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import yaml from 'js-yaml';
import bcrypt from 'bcryptjs';

interface UsersFile {
  users: Array<{
    email: string;
    name: string;
    password_hash: string;
    role: string;
  }>;
}

async function promptPassword(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function userAdd(
  email: string,
  options: { name?: string; role?: string; docs?: string }
) {
  const docsDir = resolve(process.cwd(), options.docs || 'docs');
  const usersPath = resolve(docsDir, '.docsmd-users.yml');

  // Load existing users
  let data: UsersFile = { users: [] };
  if (existsSync(usersPath)) {
    const raw = readFileSync(usersPath, 'utf8');
    data = (yaml.load(raw) as UsersFile) || { users: [] };
  }

  // Check for duplicates
  if (data.users.some(u => u.email === email)) {
    console.error(chalk.red(`User ${email} already exists`));
    process.exit(1);
  }

  // Prompt for password
  const password = await promptPassword();
  if (!password || password.length < 6) {
    console.error(chalk.red('Password must be at least 6 characters'));
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  data.users.push({
    email,
    name: options.name || email.split('@')[0],
    password_hash: passwordHash,
    role: options.role || 'editor',
  });

  writeFileSync(usersPath, yaml.dump(data, { lineWidth: -1 }), 'utf8');
  console.log(chalk.green(`Added user ${email} with role ${options.role || 'editor'}`));
}

export async function userList(options: { docs?: string }) {
  const docsDir = resolve(process.cwd(), options.docs || 'docs');
  const usersPath = resolve(docsDir, '.docsmd-users.yml');

  if (!existsSync(usersPath)) {
    console.log(chalk.dim('No users file found. Run: docsmd user add <email>'));
    return;
  }

  const raw = readFileSync(usersPath, 'utf8');
  const data = (yaml.load(raw) as UsersFile) || { users: [] };

  if (data.users.length === 0) {
    console.log(chalk.dim('No users configured'));
    return;
  }

  console.log(chalk.bold('Users:'));
  for (const user of data.users) {
    const roleColor = user.role === 'admin' ? chalk.yellow : user.role === 'editor' ? chalk.blue : chalk.gray;
    console.log(`  ${user.email} — ${user.name} [${roleColor(user.role)}]`);
  }
}
