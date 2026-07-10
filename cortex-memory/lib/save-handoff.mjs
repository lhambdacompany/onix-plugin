/** Short Spanish timestamp for graph labels, e.g. "10 jul 01:26". */
export function handoffTimestamp(date = new Date()) {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const day = date.getDate();
  const mon = months[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${hh}:${mm}`;
}

/** Prefix agent notes so they stand out in the graph and note list. */
export function claudeNoteTitle(title) {
  const t = title.trim();
  if (/^claude\b/i.test(t)) return t;
  return `Claude · ${t}`;
}

export function handoffKindLabel(kind) {
  if (kind === 'checkpoint') return 'Checkpoint';
  if (kind === 'compact') return 'Compact';
  return 'Handoff';
}

export function handoffBaseTitle(kind, project) {
  return claudeNoteTitle(`${handoffKindLabel(kind)} · ${project}`);
}

export function handoffTitledNote(kind, project, when = new Date()) {
  return `${handoffBaseTitle(kind, project)} · ${handoffTimestamp(when)}`;
}

async function cortexJson(apiUrl, apiKey, path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const msg =
      typeof body?.message === 'string'
        ? body.message
        : JSON.stringify(body ?? {}).slice(0, 200);
    throw new Error(`Cortex request failed (${response.status}): ${msg}`);
  }
  return body?.data ?? body;
}

async function findLatestHandoff(apiUrl, apiKey, project) {
  const params = new URLSearchParams({
    q: `Handoff · ${project}`,
    limit: '30',
  });
  const notes = await cortexJson(apiUrl, apiKey, `/notes?${params}`);
  if (!Array.isArray(notes)) return null;

  const prefix = handoffBaseTitle('handoff', project);
  return (
    notes.find(
      (note) =>
        note.sourceProject === project &&
        typeof note.title === 'string' &&
        note.title.startsWith(prefix) &&
        !note.tags?.includes('pre-compact') &&
        !note.tags?.includes('post-compact') &&
        !note.tags?.includes('checkpoint'),
    ) ?? null
  );
}

/**
 * @param {'handoff' | 'checkpoint' | 'compact'} kind
 * handoff → upsert one note per project; checkpoint/compact → new note each time.
 */
export async function saveHandoffNote({
  apiUrl,
  apiKey,
  project,
  kind = 'handoff',
  summary,
  content,
  tags = [],
  visibility = 'PERSONAL',
  sourceSessionId,
}) {
  const title = handoffTitledNote(kind, project);
  const payload = {
    title,
    content,
    summary,
    category: 'Sesión',
    tags,
    sourceType: 'AGENT',
    sourceAgent: 'Claude Code',
    sourceProject: project,
    sourceSessionId: sourceSessionId || undefined,
    visibility,
  };

  if (kind === 'handoff') {
    const existing = await findLatestHandoff(apiUrl, apiKey, project);
    if (existing?.id) {
      return cortexJson(apiUrl, apiKey, `/notes/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
    }
  }

  return cortexJson(apiUrl, apiKey, '/notes', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  });
}
