import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const smokeEvalPath = join(rootDir, '.harness', 'evals', 'smoke.yaml');

const automatedChecks = [
  {
    name: 'eslint',
    command: 'yarn',
    args: ['lint'],
  },
  {
    name: 'web build',
    command: 'yarn',
    args: ['build:web'],
  },
];

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

function printManualScenarios() {
  if (!existsSync(smokeEvalPath)) {
    console.log('\nNo smoke eval file found. Skipping manual checklist summary.');
    return;
  }

  const content = readFileSync(smokeEvalPath, 'utf8');
  const lines = content.split('\n');
  const manualTitles = [];
  let currentType = '';
  let currentTitle = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- id:')) {
      if (currentType === 'manual' && currentTitle) {
        manualTitles.push(currentTitle);
      }
      currentType = '';
      currentTitle = '';
      continue;
    }

    if (trimmed.startsWith('title:')) {
      currentTitle = trimmed.split(':').slice(1).join(':').trim();
      continue;
    }

    if (trimmed.startsWith('type:')) {
      currentType = trimmed.split(':').slice(1).join(':').trim();
    }
  }

  if (currentType === 'manual' && currentTitle) {
    manualTitles.push(currentTitle);
  }

  if (manualTitles.length === 0) {
    console.log('\nNo smoke scenarios declared.');
    return;
  }

  console.log('\nManual smoke scenarios declared in .harness/evals/smoke.yaml:');
  for (const title of manualTitles) {
    console.log(`- ${title}`);
  }
}

async function main() {
  console.log('Running harness checks...\n');

  for (const check of automatedChecks) {
    console.log(`> ${check.name}`);
    await runCommand(check.command, check.args);
    console.log(`✓ ${check.name} passed\n`);
  }

  printManualScenarios();
  console.log('\nHarness completed.');
}

main().catch((error) => {
  console.error(`\nHarness failed: ${error.message}`);
  process.exit(1);
});
