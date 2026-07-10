#!/usr/bin/env node
/**
 * PostCompact hook — saves Claude's compact_summary to Cortex after compaction.
 * Runs async; never blocks the session.
 */
import { loadCredentials } from '../lib/credentials.mjs';
import { findCortexConfig, resolveSession } from '../lib/project-config.mjs';
import { resolveMemorySettings } from '../lib/memory-config.mjs';
import { saveHandoffNote } from '../lib/save-handoff.mjs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw || '{}');
const { apiUrl, apiKey, configured } = loadCredentials();

if (!configured) process.exit(0);

const startDir = input.cwd || process.cwd();
const memory = resolveMemorySettings(findCortexConfig(startDir));
if (!memory.savePostCompact) process.exit(0);

const compactSummary = (input.compact_summary ?? '').trim();
if (compactSummary.length < 40) process.exit(0);

const { project, scope } = resolveSession(startDir, input);
const visibility = scope === 'global' ? 'GLOBAL' : 'PERSONAL';
const trigger = input.trigger ?? 'auto';

const summary =
  `Resumen post-compact de Claude Code (${trigger}). ` +
  'Generado por Claude al compactar; más curado que el checkpoint pre-compact.';

const content = [
  `## Contexto post-compact`,
  `Proyecto: ${project}`,
  `Trigger: ${trigger}`,
  `Session: ${input.session_id ?? 'unknown'}`,
  '',
  '## Resumen de compactación (Claude)',
  compactSummary,
].join('\n');

try {
  await saveHandoffNote({
    apiUrl,
    apiKey,
    project,
    kind: 'compact',
    summary,
    content,
    tags: ['handoff', 'post-compact', 'agent-memory', 'compact-summary'],
    visibility,
    sourceSessionId: input.session_id,
  });
} catch {
  process.exit(0);
}
