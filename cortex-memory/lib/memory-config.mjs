/** @typedef {'automatic' | 'manual'} MemoryMode */
/** @typedef {'small' | 'large'} ProjectSize */

/**
 * @param {Record<string, unknown> | null | undefined} config
 */
export function resolveMemorySettings(config) {
  const memory = config?.memory;
  const raw =
    memory && typeof memory === 'object' && !Array.isArray(memory) ? memory : {};

  /** @type {MemoryMode} */
  const mode = raw.mode === 'manual' ? 'manual' : 'automatic';
  /** @type {ProjectSize} */
  const projectSize = raw.projectSize === 'large' ? 'large' : 'small';

  return {
    mode,
    projectSize,
    /** Nudge al cerrar sesión sustancial sin handoff */
    nudgeStopHandoff: mode === 'automatic',
    /** Checkpoint con extracto antes de compactar */
    savePreCompact: mode === 'automatic' && projectSize === 'large',
    /** Resumen curado después de compactar */
    savePostCompact: mode === 'automatic' && projectSize === 'large',
  };
}

/**
 * @param {ReturnType<typeof resolveMemorySettings>} settings
 */
export function memoryModeDescription(settings) {
  if (settings.mode === 'manual') {
    return (
      'Guardado **manual** — Cortex no guarda automáticamente al compactar ni al cerrar. ' +
      'Cuando el trabajo sea sustancial, ejecutá `/cortex-handoff` para persistir un handoff.'
    );
  }
  if (settings.projectSize === 'large') {
    return (
      'Guardado **automático (proyecto grande)** — handoff al cerrar sesiones sustanciales, ' +
      'más checkpoints antes y resúmenes después de cada compactación.'
    );
  }
  return (
    'Guardado **automático (proyecto chico)** — solo handoff al cerrar sesiones sustanciales. ' +
    'Sin checkpoints automáticos al compactar (ahorra tokens).'
  );
}
