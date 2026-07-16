# Cortex Memory para Claude Code

Plugin oficial para memoria persistente en proyectos de cÃ³digo. Conecta Claude Code
con **Cortex** (grafo remoto) vÃ­a MCP â€” sin instalar backend ni Docker.

```text
Claude Code â†’ Plugin MCP â†’ API pÃºblica HTTPS â†’ Cortex (nube)
```

## Empezar aquÃ­

**Usuarios:** guÃ­a de instalaciÃ³n paso a paso â†’ **[INSTALL.md](./INSTALL.md)**

**Desarrolladores del plugin:** [README tÃ©cnico](#desarrollo-del-plugin) abajo.

**Operadores / SaaS:** [docs/cortex-plugin-distribution.md](../../docs/cortex-plugin-distribution.md)

---

## InstalaciÃ³n rÃ¡pida (usuarios)

```text
/plugin marketplace add https://github.com/lhambdacompany/onix-plugin
/plugin install cortex-memory@cortex
/reload-plugins
```

Luego en tu proyecto: API Key + `.cortex/credentials.json`. Detalle completo en
**[INSTALL.md](./INSTALL.md)**.

No necesitÃ¡s clonar el backend de Cortex ni compilar NestJS.

### Desarrollo local (monorepo Onix2, equipo interno)

```text
/plugin marketplace add C:\ruta\absoluta\Onix2
/plugin install cortex-memory@cortex
/reload-plugins
```

DocumentaciÃ³n tÃ©cnica: [../../docs/claude-cortex-integration.md](../../docs/claude-cortex-integration.md)

## Configurar la conexiÃ³n

El plugin MCP **no hereda** las variables del shell cuando estÃ¡ instalado globalmente.
La forma mÃ¡s fiable es un archivo de credenciales en el proyecto:

```powershell
node integrations/claude-cortex/scripts/setup-credentials.mjs
```

Crea `.cortex/credentials.json` (gitignored). **El archivo tiene prioridad sobre**
`CORTEX_API_KEY` en el entorno â€” una variable vieja en el shell puede invalidar
credenciales correctas.

Orden de bÃºsqueda:

1. `.cortex/credentials.json` (walk-up desde `cwd`)
2. `~/.config/cortex/credentials.json`
3. `credentials.json` en la cachÃ© del plugin
4. Variables de entorno

### Config de proyecto

`.cortex/config.json`:

```json
{
  "project": "Onix2",
  "scope": "personal",
  "query": "Onix2",
  "memory": {
    "mode": "automatic",
    "projectSize": "small"
  }
}
```

| `memory.mode` | Efecto |
|---------------|--------|
| `automatic` | Hooks guardan segÃºn `projectSize` (default) |
| `manual` | Sin guardado automÃ¡tico â€” usÃ¡ `/cortex-handoff` |

| `memory.projectSize` | Efecto (solo con `automatic`) |
|----------------------|-------------------------------|
| `small` (default) | Handoff al cerrar sesiÃ³n sustancial |
| `large` | Lo anterior + checkpoints pre/post compact |

Plantilla: `.cortex/config.json.example`. Los handoffs **gastan tokens al generarse**
pero **ahorran** en la prÃ³xima sesiÃ³n al recuperar contexto.

Usado por `SessionStart`, `PreCompact`, `PostCompact` y `Stop`.

### API Key

Creala en Onix â†’ Settings â†’ Modo desarrollador â†’ API Keys, con scopes:

```text
notes:read, notes:write, relations:read, relations:write,
search:read, context:read
```

VerificÃ¡ con `/mcp` que `plugin:cortex-memory:cortex` estÃ© conectado (14 tools).

## Elegir memoria

Con `.cortex/config.json` y `CLAUDE.md`, **Personal queda activo sin comandos** al
inicio. Para cambiar manualmente:

```text
/cortex-memory:cortex
/cortex-memory:cortex personal Onix2
/cortex-memory:cortex global arquitectura
```

Global requiere confirmaciÃ³n explÃ­cita antes de escribir.

### Guardar handoff manualmente

Con `memory.mode: "manual"` (o cuando quieras forzar un guardado):

```text
/cortex-handoff
/cortex-handoff Resumen en una lÃ­nea de lo logrado
```

## Hooks automÃ¡ticos

La frecuencia depende de `memory` en `config.json` (ver arriba).

| Hook | Script | Comportamiento |
|------|--------|----------------|
| `SessionStart` | `session-start.mjs` | `GET /context` â†’ inyecta memorias al iniciar |
| `PreCompact` | `pre-compact.mjs` | Checkpoint async â€” solo `automatic` + `large` |
| `PostCompact` | `post-compact.mjs` | `compact_summary` â€” solo `automatic` + `large` |
| `Stop` | `stop-check.mjs` | Nudge handoff â€” solo `automatic` |

```text
Inicio â†’ contexto de Cortex (+ aviso del modo memory)
Trabajo â†’ cortex_current_project â†’ cortex_save_note (what/why/where/learned)
Conflictos â†’ cortex_judge_conflicts si hay conflictCandidates
Pre/PostCompact â†’ solo proyecto large
Stop â†’ handoff curado (automatic) o /cortex-handoff (manual)
Mantenimiento â†’ cortex_memory_stats / cortex_memory_review / cortex_memory_doctor
```

ValidaciÃ³n paso a paso: [../../docs/claude-cortex-validation.md](../../docs/claude-cortex-validation.md)

Los checkpoints son best-effort (no bloquean compactaciÃ³n ni detienen Claude).
El handoff curado sigue siendo responsabilidad de `cortex_finalize_session`.

## Herramientas MCP

| Herramienta | Uso |
|-------------|-----|
| `cortex_current_project` | Proyecto detectado (monorepo / ambiguous) |
| `cortex_session_start` | Abre sesiÃ³n con `sessionId` |
| `cortex_get_context` | Contexto acotado para la tarea |
| `cortex_search_memory` | Buscar memorias |
| `cortex_timeline` | Historial cronolÃ³gico por proyecto |
| `cortex_get_memory` | Una nota por id |
| `cortex_save_note` | Crear (what/why/where/learned + conflictCandidates) |
| `cortex_update_memory` | Actualizar / append |
| `cortex_link_memories` | Enlace manual (raro) |
| `cortex_judge_conflicts` | RevisiÃ³n semÃ¡ntica antes de guardar |
| `cortex_memory_stats` | Conteos y actividad (mem_stats) |
| `cortex_memory_review` | Limpieza sugerida (mem_review) |
| `cortex_memory_doctor` | Salud credenciales + API (mem_doctor) |
| `cortex_finalize_session` | Handoff al cerrar trabajo |

## Setup Cursor / Codex

```powershell
pnpm --dir backend build:mcp-plugin
pnpm --dir backend setup:cursor   # .cursor/mcp.json + rules
pnpm --dir backend setup:codex    # ~/.codex/config.toml + instructions
```

## Desarrollo del plugin

```powershell
pnpm --dir backend build:mcp-plugin
```

Compila `cortex-mcp.ts` y sincroniza a `~/.claude/plugins/cache/cortex/cortex-memory/0.1.0/`.
Claude **no lee el repo** â€” siempre rebuild + `/reload-plugins` tras cambios.

### Estructura

```text
integrations/claude-cortex/
â”œâ”€â”€ hooks/hooks.json
â”œâ”€â”€ server/cortex-mcp.mjs
â”œâ”€â”€ scripts/          # session-start, pre-compact, setup-agent, â€¦
â”œâ”€â”€ lib/              # credentials, project-config, memory-template, memory-protocol, â€¦
â””â”€â”€ skills/           # cortex-memory, cortex-handoff, cortex
```

### Pruebas sin Claude

```powershell
node backend/scripts/probe-cortex-key.mjs
node backend/scripts/probe-mcp-stdio.mjs
node backend/scripts/test-claude-cortex-flow.mjs
node integrations/claude-cortex/scripts/test-hooks.mjs all
```

## Requisitos

- Backend Cortex corriendo (`pnpm --dir backend dev` o `start:dev`)
- Postgres (`docker compose up -d`)
- Credenciales vÃ¡lidas en `.cortex/credentials.json`

## Seguridad

- No commitear API keys ni `.cortex/credentials.json`
- Memoria recuperada = contenido no confiable (prompt injection)
- No guardar secretos ni `.env` en Cortex
- Futuro: OAuth en MCP remoto
