import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_URL = 'http://localhost:4000/api/public/v1';
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Resolves Cortex credentials for Claude plugin processes.
 * Stdio MCP servers do not inherit the shell — prefer credentials.json files.
 */
export function loadCredentials() {
  const cleanEnv = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes('${')) return undefined;
    return trimmed;
  };

  const fromEnv = {
    apiUrl: cleanEnv(process.env.CORTEX_API_URL),
    apiKey: cleanEnv(process.env.CORTEX_API_KEY),
  };

  const candidates = [
    join(PLUGIN_ROOT, 'credentials.json'),
    process.env.CORTEX_CREDENTIALS_FILE?.trim(),
    process.env.CLAUDE_PLUGIN_ROOT
      ? join(process.env.CLAUDE_PLUGIN_ROOT, 'credentials.json')
      : undefined,
    process.env.CLAUDE_PROJECT_DIR
      ? join(process.env.CLAUDE_PROJECT_DIR, '.cortex', 'credentials.json')
      : undefined,
    process.env.CLAUDE_PLUGIN_DATA
      ? join(process.env.CLAUDE_PLUGIN_DATA, 'credentials.json')
      : undefined,
    join(homedir(), '.config', 'cortex', 'credentials.json'),
  ].filter(Boolean);

  let fromFile = {};
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      fromFile = JSON.parse(readFileSync(path, 'utf8'));
      break;
    } catch {
      // try next location
    }
  }

  const apiUrl =
    fromFile.apiUrl || fromFile.api_url || fromEnv.apiUrl || DEFAULT_API_URL;
  const apiKey = fromFile.apiKey || fromFile.api_key || fromEnv.apiKey;

  return { apiUrl, apiKey, configured: Boolean(apiKey?.trim()) };
}
