import { existsSync, readFileSync } from 'node:fs';

export function transcriptHasTool(transcriptPath, toolName) {
  if (!transcriptPath || !existsSync(transcriptPath)) return false;
  return readFileSync(transcriptPath, 'utf8').includes(`"name":"${toolName}"`);
}

/** Heuristic: session changed code or ran substantial commands. */
export function isSubstantiveSession(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return false;
  const raw = readFileSync(transcriptPath, 'utf8');
  const edits = (raw.match(/"name":"(Edit|Write|NotebookEdit)"/g) || []).length;
  const bash = (raw.match(/"name":"Bash"/g) || []).length;
  const mcp = (raw.match(/"name":"mcp__cortex-memory__cortex_/g) || []).length;
  return edits + bash >= 2 || mcp >= 2;
}

/** Last N lines of the transcript as readable text for checkpoints. */
export function extractTranscriptExcerpt(transcriptPath, maxChars = 10_000) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return '(Transcript no disponible)';
  }

  const lines = readFileSync(transcriptPath, 'utf8').trim().split('\n').slice(-100);
  const parts = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const content = entry.message?.content;
      if (typeof content === 'string') {
        parts.push(content);
        continue;
      }
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === 'text' && block.text) parts.push(block.text);
        if (block.type === 'tool_use' && block.name) {
          parts.push(`[${block.name}]`);
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  const text = parts.join('\n\n').trim();
  if (text.length <= maxChars) return text;
  return `…\n${text.slice(-maxChars)}`;
}
