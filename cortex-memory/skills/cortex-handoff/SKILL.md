---
name: cortex-handoff
description: Guarda un handoff estructurado en Cortex bajo demanda. Usá con memory.mode manual o cuando quieras persistir la sesión sin esperar al cierre automático.
argument-hint: "[resumen opcional en una línea]"
---

# Guardar handoff en Cortex

Persistí el trabajo de esta sesión en el grafo de Cortex.

## Cuándo usarlo

- `.cortex/config.json` tiene `"memory": { "mode": "manual" }`, **o**
- Terminaste trabajo sustancial y querés guardar **ahora** sin esperar al hook `Stop`, **o**
- Claude no llamó `cortex_finalize_session` y querés forzar el guardado.

No uses esto para saludos, preguntas puntuales ni cambios triviales.

## Qué hacer

1. Leé el proyecto desde `.cortex/config.json` (`project` y `scope`).
2. Si hubo `cortex_session_start` en esta sesión, pasá el mismo `sourceSessionId`.
3. Llamá **una vez** `cortex_finalize_session` con:
   - `project` — nombre del proyecto en config
   - `summary` — qué se logró (usa `$ARGUMENTS` si el usuario pasó un resumen)
   - `decisions` — decisiones confirmadas
   - `files` — archivos importantes tocados
   - `nextSteps` — pendientes concretos
   - `visibility` — `PERSONAL` salvo que la sesión use scope `global`
3. Confirmá brevemente que el handoff quedó guardado.

Nunca guardes secretos, credenciales ni contenido de `.env`.

## Tokens

El handoff consume tokens **en esta sesión** al generarse, pero ahorra tokens en
sesiones futuras al recuperar contexto desde Cortex en lugar de re-explicar todo.
