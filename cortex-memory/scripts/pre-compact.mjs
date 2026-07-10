#!/usr/bin/env node
/**
 * PreCompact hook — saves an automatic checkpoint to Cortex before context compaction.
 * Runs async; never blocks compaction.
 */
import { loadCredentials } from '../lib/credentials.mjs';
import { findCortexConfig, resolveSession } from '../lib/project-config.mjs';
import { resolveMemorySettings } from '../lib/memory-config.mjs';
import { saveHandoffNote } from '../lib/save-handoff.mjs';
import { extractTranscriptExcerpt } from '../lib/transcript.mjs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw || '{}');
const { apiUrl, apiKey, configured } = loadCredentials();

if (!configured) process.exit(0);

const startDir = input.cwd || process.cwd();
const memory = resolveMemorySettings(findCortexConfig(startDir));
if (!memory.savePreCompact) process.exit(0);

const { project, scope } = resolveSession(startDir, input);
const visibility = scope === 'global' ? 'GLOBAL' : 'PERSONAL';
const trigger = input.trigger ?? 'auto';
const excerpt = extractTranscriptExcerpt(input.transcript_path, 12_000);

const summary =
  `Checkpoint automático de Claude Code antes de compactar (${trigger}). ` +
  'Revisá y promové a handoff curado si hace falta.';

const content = [
  `## Contexto pre-compact`,
  `Proyecto: ${project}`,
  `Trigger: ${trigger}`,
  `Session: ${input.session_id ?? 'unknown'}`,
  '',
  '## Extracto reciente de la conversación',
  excerpt,
].join('\n');

try {
  await saveHandoffNote({
    apiUrl,
    apiKey,
    project,
    kind: 'checkpoint',
    summary,
    content,
    tags: ['handoff', 'pre-compact', 'agent-memory', 'checkpoint'],
    visibility,
    sourceSessionId: input.session_id,
  });
} catch {
  // Best-effort — compaction must not fail because Cortex is down.
  process.exit(0);
}
