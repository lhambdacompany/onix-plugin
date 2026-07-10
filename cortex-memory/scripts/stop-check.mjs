#!/usr/bin/env node
/**
 * Stop hook — nudges Claude to save a structured handoff when work was substantive.
 */
import { loadCredentials } from '../lib/credentials.mjs';
import { findCortexConfig, resolveSession } from '../lib/project-config.mjs';
import { resolveMemorySettings } from '../lib/memory-config.mjs';
import {
  isSubstantiveSession,
  transcriptHasTool,
} from '../lib/transcript.mjs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw || '{}');

function allowStop() {
  process.exit(0);
}

function nudgeFinalize(project) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext:
          `Cortex: esta sesión tuvo trabajo sustancial en "${project}" y aún no se guardó un handoff. ` +
          'Llamá `cortex_finalize_session` una vez con: project, summary, decisions, files (si aplica) y nextSteps. ' +
          'No guardes secretos ni credenciales. Después podés terminar.',
      },
    }),
  );
  process.exit(0);
}

if (input.stop_hook_active) allowStop();
if (input.background_tasks?.length) allowStop();

const { configured } = loadCredentials();
if (!configured) allowStop();

const startDir = input.cwd || process.cwd();
const memory = resolveMemorySettings(findCortexConfig(startDir));
if (!memory.nudgeStopHandoff) allowStop();

const transcriptPath = input.transcript_path;
if (!isSubstantiveSession(transcriptPath)) allowStop();
if (transcriptHasTool(transcriptPath, 'cortex_finalize_session')) allowStop();

const { project } = resolveSession(input.cwd || process.cwd(), input);
nudgeFinalize(project);
