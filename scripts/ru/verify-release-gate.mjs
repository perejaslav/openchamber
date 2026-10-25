#!/usr/bin/env node
/**
 * Release gate of the RU fork: locale parity, fork-feature guards and the
 * type-check of all packages. Runs before pushing `ru`
 * (`ru-upstream-sync.yml`) and before building a release
 * (`fork-release.yml`) — one command, one place, so a broken upstream merge
 * can neither go public nor ship. The test list lives only here.
 *
 * Run from the repository root. First failure stops the run with a non-zero
 * exit code and names the step that failed.
 */
import { spawnSync } from 'node:child_process';

const steps = [
  {
    name: 'fork tests (i18n, fork-guards)',
    cmd: 'bun',
    args: [
      'test',
      'packages/ui/src/lib/i18n',
      'packages/ui/src/lib/fork-guards.test.ts',
    ],
  },
  // `bun run type-check` cannot be used here: upstream's root script is
  // `bun check -b && …`, and `bun check` is not a script any package defines —
  // upstream's own CI never runs that line, so the typo lives on. `tsc -b`
  // over the root project references is what the line clearly means, and it
  // compiles every package including the electron one.
  { name: 'workspace type-check (tsc -b)', cmd: 'bunx', args: ['tsc', '-b'] },
];

for (const step of steps) {
  const result = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`[verify-release-gate] FAILED: ${step.name} (exit ${result.status ?? 'unknown'})`);
    process.exit(result.status ?? 1);
  }
  console.log(`[verify-release-gate] ok: ${step.name}`);
}
