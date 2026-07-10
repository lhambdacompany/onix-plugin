#!/usr/bin/env node
/**
 * Writes .cortex/credentials.json for the Claude plugin (stdio MCP does not
 * inherit shell env vars when the plugin is installed globally).
 *
 * Usage:
 *   node integrations/claude-cortex/scripts/setup-credentials.mjs
 *   CORTEX_API_KEY=onx_... node integrations/claude-cortex/scripts/setup-credentials.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline';

const projectDir = process.argv[2] ?? process.cwd();
const dir = join(projectDir, '.cortex');
const file = join(dir, 'credentials.json');
const configFile = join(dir, 'config.json');
const pluginFile = join(
  projectDir,
  'integrations',
  'claude-cortex',
  'credentials.json',
);

const apiUrl =
  process.env.CORTEX_API_URL?.trim() ??
  'http://localhost:4000/api/public/v1';

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return answer.trim();
}

let apiKey = process.env.CORTEX_API_KEY?.trim();
if (!apiKey) {
  apiKey = await prompt(
    'Pegá tu API Key de Onix (onx_...): ',
  );
}

if (!apiKey?.startsWith('onx_')) {
  console.error('Error: se necesita una API Key válida (prefijo onx_).');
  console.error('Creala en Onix → Settings → Modo desarrollador → API Keys.');
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
const payload = JSON.stringify({ apiUrl, apiKey }, null, 2) + '\n';
writeFileSync(file, payload, 'utf8');
writeFileSync(
  configFile,
  JSON.stringify(
    {
      project: basename(projectDir),
      scope: 'personal',
      query: basename(projectDir),
    },
    null,
    2,
  ) + '\n',
  'utf8',
);
try {
  mkdirSync(join(pluginFile, '..'), { recursive: true });
  writeFileSync(pluginFile, payload, 'utf8');
} catch {
  // optional when script runs outside the monorepo layout
}

console.log('\nCredenciales guardadas en:');
console.log(file);
console.log(configFile);
if (existsSync(pluginFile)) console.log(pluginFile);
console.log('\nEn Claude Code (solo la primera vez o tras actualizar el plugin):');
console.log('  Abrí Claude desde esta carpeta del proyecto → aceptá confiar en el workspace');
console.log('  /reload-plugins   (una vez si actualizaste el plugin)');
console.log('\nCortex Personal se activa solo al iniciar cada sesión (hook SessionStart).');
