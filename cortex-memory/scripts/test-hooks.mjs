#!/usr/bin/env node
/**
 * Smoke-test Cortex hook scripts with synthetic stdin (no Claude required).
 *
 * Usage:
 *   node integrations/claude-cortex/scripts/test-hooks.mjs [session-start|pre-compact|post-compact|stop-check|all]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = process.argv[2] ?? 'all';

const baseInput = {
  session_id: 'test-session',
  cwd: join(root, '..', '..'),
  transcript_path: join(root, '..', '..', 'backend', 'package.json'),
};

const cases = {
  'session-start': {
    script: 'session-start.mjs',
    input: { ...baseInput, hook_event_name: 'SessionStart' },
  },
  'pre-compact': {
    script: 'pre-compact.mjs',
    input: {
      ...baseInput,
      hook_event_name: 'PreCompact',
      trigger: 'manual',
      custom_instructions: '',
    },
  },
  'post-compact': {
    script: 'post-compact.mjs',
    input: {
      ...baseInput,
      hook_event_name: 'PostCompact',
      trigger: 'manual',
      compact_summary:
        'Se validó el plugin cortex-memory: hooks SessionStart, PreCompact, PostCompact y Stop. ' +
        'Decisiones: usar credentials.json por proyecto; PostCompact guarda compact_summary.',
    },
  },
  'stop-check': {
    script: 'stop-check.mjs',
    input: {
      ...baseInput,
      hook_event_name: 'Stop',
      stop_hook_active: false,
    },
  },
};

async function runCase(name, { script, input }) {
  const path = join(root, 'scripts', script);
  if (!existsSync(path)) {
    console.error(`✗ ${name}: missing ${path}`);
    return false;
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${name} (exit ${code})`);
        if (stdout.trim()) console.log('  stdout:', stdout.trim().slice(0, 200));
        resolve(true);
      } else {
        console.error(`✗ ${name} (exit ${code})`);
        if (stderr.trim()) console.error('  stderr:', stderr.trim().slice(0, 300));
        resolve(false);
      }
    });
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

const selected =
  hook === 'all' ? Object.entries(cases) : [[hook, cases[hook]]].filter(([, v]) => v);

if (!selected.length) {
  console.error('Unknown hook:', hook);
  console.error('Valid:', Object.keys(cases).join(', '), 'all');
  process.exit(1);
}

let ok = 0;
for (const [name, spec] of selected) {
  if (await runCase(name, spec)) ok++;
}

console.log(`\n${ok}/${selected.length} hook scripts OK`);
console.log('Nota: session-start/pre-compact/post-compact requieren backend + credentials.json');
process.exit(ok === selected.length ? 0 : 1);
