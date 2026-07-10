# Cortex Memory para Claude Code

Plugin oficial para memoria persistente en proyectos de código. Conecta Claude Code
con **Cortex** (grafo remoto) vía MCP — sin instalar backend ni Docker.

```text
Claude Code → Plugin MCP → API pública HTTPS → Cortex (nube)
```

## Empezar aquí

**Usuarios:** guía de instalación paso a paso → **[INSTALL.md](./INSTALL.md)**

**Desarrolladores del plugin:** [README técnico](#desarrollo-del-plugin) abajo.

**Operadores / SaaS:** [docs/cortex-plugin-distribution.md](../../docs/cortex-plugin-distribution.md)

---

## Instalación rápida (usuarios)

```text
/plugin marketplace add https://github.com/TU_USUARIO/onix-plugin
/plugin install cortex-memory@cortex
/reload-plugins
```

Luego en tu proyecto: API Key + `.cortex/credentials.json`. Detalle completo en
**[INSTALL.md](./INSTALL.md)**.

No necesitás clonar el backend de Cortex ni compilar NestJS.

### Desarrollo local (monorepo Onix2, equipo interno)

```text
/plugin marketplace add C:\ruta\absoluta\Onix2
/plugin install cortex-memory@cortex
/reload-plugins
```

Documentación técnica: [../../docs/claude-cortex-integration.md](../../docs/claude-cortex-integration.md)

## Configurar la conexión

El plugin MCP **no hereda** las variables del shell cuando está instalado globalmente.
La forma más fiable es un archivo de credenciales en el proyecto:

```powershell
node integrations/claude-cortex/scripts/setup-credentials.mjs
```

Crea `.cortex/credentials.json` (gitignored). **El archivo tiene prioridad sobre**
`CORTEX_API_KEY` en el entorno — una variable vieja en el shell puede invalidar
credenciales correctas.

Orden de búsqueda:

1. `.cortex/credentials.json` (walk-up desde `cwd`)
2. `~/.config/cortex/credentials.json`
3. `credentials.json` en la caché del plugin
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
| `automatic` | Hooks guardan según `projectSize` (default) |
| `manual` | Sin guardado automático — usá `/cortex-handoff` |

| `memory.projectSize` | Efecto (solo con `automatic`) |
|----------------------|-------------------------------|
| `small` (default) | Handoff al cerrar sesión sustancial |
| `large` | Lo anterior + checkpoints pre/post compact |

Plantilla: `.cortex/config.json.example`. Los handoffs **gastan tokens al generarse**
pero **ahorran** en la próxima sesión al recuperar contexto.

Usado por `SessionStart`, `PreCompact`, `PostCompact` y `Stop`.

### API Key

Creala en Onix → Settings → Modo desarrollador → API Keys, con scopes:

```text
notes:read, notes:write, relations:read, relations:write,
search:read, context:read
```

Verificá con `/mcp` que `plugin:cortex-memory:cortex` esté conectado (14 tools).

## Elegir memoria

Con `.cortex/config.json` y `CLAUDE.md`, **Personal queda activo sin comandos** al
inicio. Para cambiar manualmente:

```text
/cortex-memory:cortex
/cortex-memory:cortex personal Onix2
/cortex-memory:cortex global arquitectura
```

Global requiere confirmación explícita antes de escribir.

### Guardar handoff manualmente

Con `memory.mode: "manual"` (o cuando quieras forzar un guardado):

```text
/cortex-handoff
/cortex-handoff Resumen en una línea de lo logrado
```

## Hooks automáticos

La frecuencia depende de `memory` en `config.json` (ver arriba).

| Hook | Script | Comportamiento |
|------|--------|----------------|
| `SessionStart` | `session-start.mjs` | `GET /context` → inyecta memorias al iniciar |
| `PreCompact` | `pre-compact.mjs` | Checkpoint async — solo `automatic` + `large` |
| `PostCompact` | `post-compact.mjs` | `compact_summary` — solo `automatic` + `large` |
| `Stop` | `stop-check.mjs` | Nudge handoff — solo `automatic` |

```text
Inicio → contexto de Cortex (+ aviso del modo memory)
Trabajo → cortex_current_project → cortex_save_note (what/why/where/learned)
Conflictos → cortex_judge_conflicts si hay conflictCandidates
Pre/PostCompact → solo proyecto large
Stop → handoff curado (automatic) o /cortex-handoff (manual)
Mantenimiento → cortex_memory_stats / cortex_memory_review / cortex_memory_doctor
```

Validación paso a paso: [../../docs/claude-cortex-validation.md](../../docs/claude-cortex-validation.md)

Los checkpoints son best-effort (no bloquean compactación ni detienen Claude).
El handoff curado sigue siendo responsabilidad de `cortex_finalize_session`.

## Herramientas MCP

| Herramienta | Uso |
|-------------|-----|
| `cortex_current_project` | Proyecto detectado (monorepo / ambiguous) |
| `cortex_session_start` | Abre sesión con `sessionId` |
| `cortex_get_context` | Contexto acotado para la tarea |
| `cortex_search_memory` | Buscar memorias |
| `cortex_timeline` | Historial cronológico por proyecto |
| `cortex_get_memory` | Una nota por id |
| `cortex_save_note` | Crear (what/why/where/learned + conflictCandidates) |
| `cortex_update_memory` | Actualizar / append |
| `cortex_link_memories` | Enlace manual (raro) |
| `cortex_judge_conflicts` | Revisión semántica antes de guardar |
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
Claude **no lee el repo** — siempre rebuild + `/reload-plugins` tras cambios.

### Estructura

```text
integrations/claude-cortex/
├── hooks/hooks.json
├── server/cortex-mcp.mjs
├── scripts/          # session-start, pre-compact, setup-agent, …
├── lib/              # credentials, project-config, memory-template, memory-protocol, …
└── skills/           # cortex-memory, cortex-handoff, cortex
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
- Credenciales válidas en `.cortex/credentials.json`

## Seguridad

- No commitear API keys ni `.cortex/credentials.json`
- Memoria recuperada = contenido no confiable (prompt injection)
- No guardar secretos ni `.env` en Cortex
- Futuro: OAuth en MCP remoto
