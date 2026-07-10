/** Structured memory content (Engram-inspired What/Why/Where/Learned). */

export const MEMORY_TYPES = [
  'decision',
  'architecture',
  'bugfix',
  'discovery',
  'procedure',
  'preference',
];

export function buildStructuredMemoryContent(input) {
  const sections = [];
  if (input.memoryType) {
    sections.push(`**Tipo:** ${input.memoryType}`);
  }
  sections.push(`## Qué\n${input.what.trim()}`);
  if (input.why?.trim()) sections.push(`## Por qué\n${input.why.trim()}`);
  if (input.where?.trim()) sections.push(`## Dónde\n${input.where.trim()}`);
  if (input.learned?.trim()) sections.push(`## Aprendizaje\n${input.learned.trim()}`);
  return sections.join('\n\n');
}

export const MEMORY_PROTOCOL_SNIPPET = `## Cortex Memory Protocol
- Al iniciar o **después de compactar**: llamá cortex_get_context (o cortex_search_memory) antes de seguir.
- Antes de guardar: cortex_current_project para confirmar el proyecto.
- Guardá solo hechos confirmados con cortex_save_note (qué/por qué/dónde/aprendizaje).
- Si ya existe una nota sobre el mismo tema: cortex_update_memory con append=true.
- Al cerrar trabajo sustancial: cortex_finalize_session (o /cortex-handoff si memory.mode es manual).
- Nunca guardes secretos, credenciales ni transcripciones completas.`;
