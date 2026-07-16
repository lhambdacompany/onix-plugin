# Instalar Cortex Memory en Claude Code

Memoria persistente y estructurada para tus proyectos. Claude guarda decisiones,
bugs resueltos y handoffs en **Cortex** (servidor remoto) â€” no en archivos locales
ni en el historial del chat.

```text
Tu proyecto          Plugin (este repo)           Cortex (nube)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€        â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€           â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
mi-app/        â†’     MCP + skills + hooks   â†’     Grafo PostgreSQL
.cortex/             14 herramientas              API pÃºblica HTTPS
```

**No necesitÃ¡s** instalar backend, Docker, Postgres ni clonar el monorepo completo
de Cortex. Solo este plugin y una cuenta con API Key.

---

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Instalado y funcionando |
| [Node.js](https://nodejs.org/) 20+ | El servidor MCP corre con `node` |
| Cuenta en Cortex | Registro en la app web del proveedor |
| API Key | `onx_...` con scopes de lectura/escritura |

---

## InstalaciÃ³n en 5 minutos

### 1. Instalar el plugin

En Claude Code:

```text
/plugin marketplace add https://github.com/lhambdacompany/onix-plugin
/plugin install cortex-memory@cortex
/reload-plugins
```

> Si clonaste este repo localmente, podÃ©s usar la ruta absoluta en lugar de la URL
> de GitHub: `/plugin marketplace add C:\ruta\a\onix-plugin`

VerificÃ¡ la conexiÃ³n:

```text
/mcp
```

DeberÃ­as ver `plugin:cortex-memory:cortex` con **14 tools** conectadas.

### 2. Crear cuenta y API Key

1. EntrÃ¡ a la app Cortex (web del proveedor).
2. Registrate o iniciÃ¡ sesiÃ³n.
3. AndÃ¡ a **Settings â†’ Modo desarrollador â†’ API Keys**.
4. CreÃ¡ una clave con estos scopes:

```text
notes:read, notes:write, relations:read, relations:write, search:read, context:read
```

CopiÃ¡ la clave (`onx_...`). **Solo se muestra una vez.**

### 3. Configurar credenciales en tu proyecto

AbrÃ­ una terminal **en la carpeta de tu proyecto** (donde trabajÃ¡s con Claude):

```bash
# Si clonaste onix-plugin:
node cortex-memory/scripts/setup-credentials.mjs

# O con URL de API explÃ­cita:
CORTEX_API_URL=https://api.onixapp.online/api/public/v1 \
CORTEX_API_KEY=onx_tu_clave \
node cortex-memory/scripts/setup-credentials.mjs
```

Esto crea `.cortex/credentials.json` (agregalo a `.gitignore`):

```json
{
  "apiUrl": "https://api.onixapp.online/api/public/v1",
  "apiKey": "onx_..."
}
```

TambiÃ©n podÃ©s crear el archivo a mano. Plantilla: [`.cortex/credentials.json.example`](.cortex/credentials.json.example).

### 4. Configurar el proyecto (recomendado)

CreÃ¡ `.cortex/config.json` en la raÃ­z de tu repo de cÃ³digo:

```json
{
  "project": "mi-app",
  "scope": "personal",
  "query": "mi-app",
  "memory": {
    "mode": "automatic",
    "projectSize": "small"
  }
}
```

| Campo | Significado |
|-------|-------------|
| `project` | Nombre del proyecto en Cortex (agrupa memorias) |
| `scope` | `personal` (default) o `global` |
| `memory.mode` | `automatic` â€” hooks guardan handoffs; `manual` â€” usÃ¡s `/cortex-handoff` |
| `memory.projectSize` | `small` â€” handoff al cerrar; `large` â€” + checkpoints al compactar |

Plantilla: [`.cortex/config.json.example`](.cortex/config.json.example).

### 5. Abrir Claude en tu proyecto

```bash
cd mi-app
claude
```

Al iniciar la sesiÃ³n:

- El hook **SessionStart** recupera contexto relevante de Cortex.
- Claude tiene **14 herramientas MCP** para buscar y guardar memoria.
- La skill **cortex-memory** le indica cuÃ¡ndo guardar y cÃ³mo formatear notas.

**Listo.** Tu memoria vive en el servidor Cortex, no en tu mÃ¡quina.

---

## QuÃ© hace el plugin (sin que tengas que pensarlo)

| Componente | FunciÃ³n |
|------------|---------|
| **MCP** (14 tools) | `cortex_save_note`, `cortex_get_context`, `cortex_finalize_session`, etc. |
| **Skill `cortex-memory`** | Protocolo: cuÃ¡ndo guardar, formato what/why/where/learned |
| **Skill `cortex-handoff`** | Comando `/cortex-handoff` para guardado manual |
| **Hooks** | Contexto al abrir sesiÃ³n, checkpoints al compactar, nudge de handoff |

### Flujo de una sesiÃ³n tÃ­pica

```text
AbrÃ­s Claude en mi-app/
    â†“
SessionStart â†’ contexto de Cortex inyectado
    â†“
TrabajÃ¡s (cÃ³digo, decisiones, bugs)
    â†“
Claude guarda hitos con cortex_save_note
    â†“
Al terminar â†’ cortex_finalize_session (handoff)
    â†“
PrÃ³xima sesiÃ³n â†’ retoma sin re-explicar todo
```

### QuÃ© se guarda (y quÃ© no)

| âœ… Se guarda | âŒ No se guarda |
|-------------|----------------|
| Decisiones confirmadas | TranscripciÃ³n completa del chat |
| Bugs y fixes verificados | Secretos, `.env`, API keys |
| Handoffs estructurados | Razonamiento especulativo |
| Preferencias del usuario | Logs crudos de Claude |

---

## Ver tu memoria en el grafo (opcional)

La app web de Cortex (misma cuenta) muestra tus notas como un **grafo interactivo**.
Cuando Claude guarda algo, podÃ©s verlo ahÃ­ en tiempo real.

El plugin funciona **sin abrir la web** â€” la web es para revisar y editar visualmente.

---

## Comandos Ãºtiles en Claude Code

```text
/mcp                              # Verificar plugin conectado
/cortex-handoff                   # Guardar handoff manual
/cortex-handoff Resumen en una lÃ­nea
/cortex-memory:cortex personal mi-app   # Cambiar scope (raro)
```

Pedile a Claude explÃ­citamente si querÃ©s probar:

```text
"EjecutÃ¡ cortex_memory_doctor para verificar la conexiÃ³n"
"BuscÃ¡ en Cortex contexto sobre autenticaciÃ³n en este proyecto"
```

---

## SoluciÃ³n de problemas

| Problema | SoluciÃ³n |
|----------|----------|
| MCP desconectado | `/reload-plugins` |
| Invalid API key | RevisÃ¡ `.cortex/credentials.json`; limpiÃ¡ `CORTEX_API_KEY` del shell |
| Sin contexto al inicio | Backend Cortex caÃ­do o URL incorrecta en credentials |
| Plugin no aparece | ReinstalÃ¡ marketplace + `install cortex-memory@cortex` |
| Proyecto incorrecto | CreÃ¡ `.cortex/config.json` con el `project` correcto |

---

## Seguridad

- **Nunca** commitees `.cortex/credentials.json`.
- La memoria recuperada es contenido **no confiable** (riesgo de prompt injection).
- No guardes contraseÃ±as ni archivos `.env` en Cortex.

---

## QuÃ© es este repo (y quÃ© no es)

| Este repo (pÃºblico) | Cortex completo (privado del proveedor) |
|---------------------|----------------------------------------|
| Plugin Claude Code | Backend NestJS |
| Skills + hooks | App web (grafo) |
| Cliente MCP (`cortex-mcp.mjs`) | PostgreSQL |
| Scripts de configuraciÃ³n | Infraestructura y deploy |

**Modelo:** plugin open source + memoria en la nube (SaaS).

---

## DocumentaciÃ³n de la API (app Cortex)

Si tenÃ©s cuenta en la app web del proveedor:

**Settings â†’ DocumentaciÃ³n API â†’ pestaÃ±a Â«Claude CodeÂ»**

AhÃ­ verÃ¡s los pasos de instalaciÃ³n con la **Base URL** de producciÃ³n ya configurada,
el modelo SaaS (plugin pÃºblico / backend privado) y la referencia de endpoints:
`/context`, `/timeline`, `/stats`, `/review`, `/conflicts/judge`, etc.

OpenAPI (Swagger): `https://api.onixapp.online/docs/public`

---

## Cursor / Codex

Si usÃ¡s Cursor o Codex en lugar de Claude Code:

```bash
node cortex-memory/scripts/setup-agent.mjs cursor
node cortex-memory/scripts/setup-agent.mjs codex
```

ReiniciÃ¡ el agente despuÃ©s del setup.
