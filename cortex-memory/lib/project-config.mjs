import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveMemorySettings } from './memory-config.mjs';

export function findNearestCortexConfig(startDir) {
  let dir = startDir;
  for (let i = 0; i < 12 && dir; i++) {
    const configPath = path.join(dir, '.cortex', 'config.json');
    if (existsSync(configPath)) {
      try {
        return {
          dir,
          config: JSON.parse(readFileSync(configPath, 'utf8')),
          configPath,
        };
      } catch {
        return null;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** @deprecated use findNearestCortexConfig */
export function findCortexConfig(startDir) {
  return findNearestCortexConfig(startDir)?.config ?? null;
}

function discoverSiblingProjects(parentDir) {
  if (!existsSync(parentDir)) return [];
  const out = [];
  for (const ent of readdirSync(parentDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const configPath = path.join(parentDir, ent.name, '.cortex', 'config.json');
    if (!existsSync(configPath)) continue;
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      out.push({
        name: config.project || config.query || ent.name,
        path: path.join(parentDir, ent.name),
      });
    } catch {
      out.push({ name: ent.name, path: path.join(parentDir, ent.name) });
    }
  }
  return out;
}

export function getWorkingDir() {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return process.cwd();
}

export function resolveProjectContext(startDir = getWorkingDir()) {
  const nearest = findNearestCortexConfig(startDir);
  if (nearest) {
    const project =
      nearest.config.project ||
      nearest.config.query ||
      path.basename(nearest.dir);
    const memory = resolveMemorySettings(nearest.config);
    return {
      project,
      scope: nearest.config.scope === 'global' ? 'global' : 'personal',
      query: nearest.config.query || project,
      memory,
      projectSource: 'config',
      configPath: nearest.configPath,
      configDir: nearest.dir,
      cwd: startDir,
      ambiguous: false,
    };
  }

  const siblings = discoverSiblingProjects(startDir);
  if (siblings.length > 1) {
    return {
      project: path.basename(startDir),
      scope: 'personal',
      query: path.basename(startDir),
      memory: resolveMemorySettings(null),
      projectSource: 'ambiguous',
      configPath: null,
      configDir: null,
      cwd: startDir,
      ambiguous: true,
      availableProjects: siblings.map((s) => s.name),
    };
  }

  if (siblings.length === 1) {
    return {
      project: siblings[0].name,
      scope: 'personal',
      query: siblings[0].name,
      memory: resolveMemorySettings(null),
      projectSource: 'sibling_config',
      configPath: path.join(siblings[0].path, '.cortex', 'config.json'),
      configDir: siblings[0].path,
      cwd: startDir,
      ambiguous: false,
    };
  }

  const project = path.basename(startDir);
  return {
    project,
    scope: 'personal',
    query: project,
    memory: resolveMemorySettings(null),
    projectSource: 'basename',
    configPath: null,
    configDir: null,
    cwd: startDir,
    ambiguous: false,
  };
}

export function resolveSession(startDir, hookInput = {}) {
  const cwd = hookInput.cwd || startDir;
  const ctx = resolveProjectContext(cwd);
  return {
    project: ctx.project,
    scope: ctx.scope,
    query: ctx.query,
    memory: ctx.memory,
    projectContext: ctx,
  };
}
