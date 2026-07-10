#!/usr/bin/env node
/**
 * One-command agent setup (Engram-style): MCP config + Memory Protocol.
 *
 * Usage:
 *   node integrations/claude-cortex/scripts/setup-agent.mjs cursor [projectDir]
 *   node integrations/claude-cortex/scripts/setup-agent.mjs codex [projectDir]
 *
 * Also runs setup-credentials when .cortex/credentials.json is missing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const agent = process.argv[2]?.toLowerCase();
const projectDir = resolve(process.argv[3] ?? process.cwd());

if (!['cursor', 'codex'].includes(agent)) {
  console.error('Usage: setup-agent.mjs <cursor|codex> [projectDir]');
  process.exit(1);
}

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = findRepoRoot(projectDir) ?? projectDir;
const mcpScript = join(repoRoot, 'integrations', 'claude-cortex', 'server', 'cortex-mcp.mjs');
const protocolFile = join(pluginRoot, 'lib', 'memory-protocol.md');
const credFile = join(projectDir, '.cortex', 'credentials.json');

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (
      existsSync(join(dir, 'integrations', 'claude-cortex', 'server', 'cortex-mcp.mjs'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function ensureCredentials() {
  if (existsSync(credFile)) return;
  const setup = join(pluginRoot, 'scripts', 'setup-credentials.mjs');
  if (!existsSync(setup)) {
    console.warn('Skip credentials: run setup-credentials.mjs manually.');
    return;
  }
  console.log('No .cortex/credentials.json — running setup-credentials...');
  spawnSync(process.execPath, [setup, projectDir], {
    stdio: 'inherit',
    cwd: projectDir,
  });
}

function ensureProjectConfig() {
  const configFile = join(projectDir, '.cortex', 'config.json');
  if (existsSync(configFile)) return;
  mkdirSync(join(projectDir, '.cortex'), { recursive: true });
  writeFileSync(
    configFile,
    JSON.stringify(
      {
        project: basename(projectDir),
        scope: 'personal',
        query: basename(projectDir),
        memory: { mode: 'automatic', projectSize: 'small' },
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log('Created', configFile);
}

function readProtocol() {
  return readFileSync(protocolFile, 'utf8');
}

function setupCursor() {
  const cursorDir = join(projectDir, '.cursor');
  const rulesDir = join(cursorDir, 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const mcpPath = mcpScript.replace(/\\/g, '/');
  const mcpJson = {
    mcpServers: {
      cortex: {
        command: 'node',
        args: [mcpPath],
        env: {
          CORTEX_API_URL:
            process.env.CORTEX_API_URL?.trim() ??
            'http://localhost:4000/api/public/v1',
        },
      },
    },
  };

  const mcpFile = join(cursorDir, 'mcp.json');
  writeFileSync(mcpFile, JSON.stringify(mcpJson, null, 2) + '\n', 'utf8');

  const ruleFile = join(rulesDir, 'cortex-memory.mdc');
  const ruleBody = `---
description: Cortex Memory Protocol — persistent memory across sessions
alwaysApply: true
---

${readProtocol()}
`;
  writeFileSync(ruleFile, ruleBody, 'utf8');

  console.log('\nCursor setup complete:');
  console.log(' ', mcpFile);
  console.log(' ', ruleFile);
  console.log('\nRestart Cursor or reload MCP servers to pick up changes.');
}

function codexConfigPath() {
  if (platform() === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) return join(appData, 'codex', 'config.toml');
  }
  return join(homedir(), '.codex', 'config.toml');
}

function setupCodex() {
  const codexDir = join(dirname(codexConfigPath()));
  mkdirSync(codexDir, { recursive: true });

  const instructions = join(codexDir, 'cortex-instructions.md');
  const compactPrompt = join(codexDir, 'cortex-compact-prompt.md');
  writeFileSync(instructions, readProtocol() + '\n', 'utf8');
  writeFileSync(
    compactPrompt,
    'After compaction, call cortex_get_context with the current task before continuing. ' +
      'If you lost session state, call cortex_timeline for this project.\n',
    'utf8',
  );

  const mcpPath = mcpScript.replace(/\\/g, '/');
  const block = `
# Cortex Memory (setup-agent.mjs)
model_instructions_file = "${instructions.replace(/\\/g, '/')}"
experimental_compact_prompt_file = "${compactPrompt.replace(/\\/g, '/')}"

[mcp_servers.cortex]
command = "node"
args = ["${mcpPath}"]
`;

  const configPath = codexConfigPath();
  let existing = '';
  if (existsSync(configPath)) {
    existing = readFileSync(configPath, 'utf8');
    if (existing.includes('[mcp_servers.cortex]')) {
      console.log('Codex config already has [mcp_servers.cortex] — skipping TOML merge.');
      console.log('Instructions:', instructions);
      console.log('Compact prompt:', compactPrompt);
      return;
    }
  }
  writeFileSync(configPath, existing + block, 'utf8');

  console.log('\nCodex setup complete:');
  console.log(' ', configPath);
  console.log(' ', instructions);
  console.log(' ', compactPrompt);
  console.log('\nRestart Codex to pick up MCP + instructions.');
}

if (!existsSync(mcpScript)) {
  console.error('Missing MCP bundle:', mcpScript);
  console.error('Run: pnpm --dir backend build:mcp-plugin');
  process.exit(1);
}

ensureCredentials();
ensureProjectConfig();

if (agent === 'cursor') setupCursor();
else setupCodex();
