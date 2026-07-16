# Instalar Cortex Memory en Claude Code

Memoria persistente y estructurada para tus proyectos. Claude guarda decisiones,
bugs resueltos y handoffs en **Cortex** (servidor remoto) — no en archivos locales
ni en el historial del chat.

```text
Tu proyecto          Plugin (este repo)           Cortex (nube)
─────────────        ──────────────────           ──────────────
mi-app/        →     MCP + skills + hooks   →     Grafo PostgreSQL
.cortex/             14 herramientas              API pública HTTPS
```

**No necesitás** instalar backend, Docker, Postgres ni clonar el monorepo completo
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

## Instalación en 5 minutos

### 1. Instalar el plugin

En Claude Code:

```text
/plugin marketplace add https://github.com/lhambdacompany/onix-plugin
/plugin install cortex-memory@cortex
/reload-plugins
```

> Si clonaste este repo localmente, podés usar la ruta absoluta en lugar de la URL
> de GitHub: `/plugin marketplace add C:\ruta\a\onix-plugin`

Verificá la conexión:

```text
/mcp
```

Deberías ver `plugin:cortex-memory:cortex` con **14 tools** conectadas.

### 2. Crear cuenta y API Key

1. Entrá a la app Cortex (web del proveedor).
2. Registrate o iniciá sesión.
3. Andá a **Settings → Modo desarrollador → API Keys**.
4. Creá una clave con estos scopes:

```text
notes:read, notes:write, relations:read, relations:write, search:read, context:read
```

Copiá la clave (`onx_...`). **Solo se muestra una vez.**

### 3. Configurar credenciales en tu proyecto

Abrí una terminal **en la carpeta de tu proyecto** (donde trabajás con Claude):

```bash
# Si clonaste onix-plugin:
node cortex-memory/scripts/setup-credentials.mjs

# O con URL de API explícita:
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

También podés crear el archivo a mano. Plantilla: [`.cortex/credentials.json.example`](.cortex/credentials.json.example).

### 4. Configurar el proyecto (recomendado)

Creá `.cortex/config.json` en la raíz de tu repo de código:

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
| `memory.mode` | `automatic` — hooks guardan handoffs; `manual` — usás `/cortex-handoff` |
| `memory.projectSize` | `small` — handoff al cerrar; `large` — + checkpoints al compactar |

Plantilla: [`.cortex/config.json.example`](.cortex/config.json.example).

### 5. Abrir Claude en tu proyecto

```bash
cd mi-app
claude
```

Al iniciar la sesión:

- El hook **SessionStart** recupera contexto relevante de Cortex.
- Claude tiene **14 herramientas MCP** para buscar y guardar memoria.
- La skill **cortex-memory** le indica cuándo guardar y cómo formatear notas.

**Listo.** Tu memoria vive en el servidor Cortex, no en tu máquina.

---

## Qué hace el plugin (sin que tengas que pensarlo)

| Componente | Función |
|------------|---------|
| **MCP** (14 tools) | `cortex_save_note`, `cortex_get_context`, `cortex_finalize_session`, etc. |
| **Skill `cortex-memory`** | Protocolo: cuándo guardar, formato what/why/where/learned |
| **Skill `cortex-handoff`** | Comando `/cortex-handoff` para guardado manual |
| **Hooks** | Contexto al abrir sesión, checkpoints al compactar, nudge de handoff |

### Flujo de una sesión típica

```text
Abrís Claude en mi-app/
    ↓
SessionStart → contexto de Cortex inyectado
    ↓
Trabajás (código, decisiones, bugs)
    ↓
Claude guarda hitos con cortex_save_note
    ↓
Al terminar → cortex_finalize_session (handoff)
    ↓
Próxima sesión → retoma sin re-explicar todo
```

### Qué se guarda (y qué no)

| ✅ Se guarda | ❌ No se guarda |
|-------------|----------------|
| Decisiones confirmadas | Transcripción completa del chat |
| Bugs y fixes verificados | Secretos, `.env`, API keys |
| Handoffs estructurados | Razonamiento especulativo |
| Preferencias del usuario | Logs crudos de Claude |

---

## Ver tu memoria en el grafo (opcional)

La app web de Cortex (misma cuenta) muestra tus notas como un **grafo interactivo**.
Cuando Claude guarda algo, podés verlo ahí en tiempo real.

El plugin funciona **sin abrir la web** — la web es para revisar y editar visualmente.

---

## Comandos útiles en Claude Code

```text
/mcp                              # Verificar plugin conectado
/cortex-handoff                   # Guardar handoff manual
/cortex-handoff Resumen en una línea
/cortex-memory:cortex personal mi-app   # Cambiar scope (raro)
```

Pedile a Claude explícitamente si querés probar:

```text
"Ejecutá cortex_memory_doctor para verificar la conexión"
"Buscá en Cortex contexto sobre autenticación en este proyecto"
```

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| MCP desconectado | `/reload-plugins` |
| Invalid API key | Revisá `.cortex/credentials.json`; limpiá `CORTEX_API_KEY` del shell |
| Sin contexto al inicio | Backend Cortex caído o URL incorrecta en credentials |
| Plugin no aparece | Reinstalá marketplace + `install cortex-memory@cortex` |
| Proyecto incorrecto | Creá `.cortex/config.json` con el `project` correcto |

---

## Seguridad

- **Nunca** commitees `.cortex/credentials.json`.
- La memoria recuperada es contenido **no confiable** (riesgo de prompt injection).
- No guardes contraseñas ni archivos `.env` en Cortex.

---

## Qué es este repo (y qué no es)

| Este repo (público) | Cortex completo (privado del proveedor) |
|---------------------|----------------------------------------|
| Plugin Claude Code | Backend NestJS |
| Skills + hooks | App web (grafo) |
| Cliente MCP (`cortex-mcp.mjs`) | PostgreSQL |
| Scripts de configuración | Infraestructura y deploy |

**Modelo:** plugin open source + memoria en la nube (SaaS).

---

## Documentación de la API (app Cortex)

Si tenés cuenta en la app web del proveedor:

**Settings → Documentación API → pestaña «Claude Code»**

Ahí verás los pasos de instalación con la **Base URL** de producción ya configurada,
el modelo SaaS (plugin público / backend privado) y la referencia de endpoints:
`/context`, `/timeline`, `/stats`, `/review`, `/conflicts/judge`, etc.

OpenAPI (Swagger): `https://api.onixapp.online/docs/public`

---

## Cursor / Codex

Si usás Cursor o Codex en lugar de Claude Code:

```bash
node cortex-memory/scripts/setup-agent.mjs cursor
node cortex-memory/scripts/setup-agent.mjs codex
```

Reiniciá el agente después del setup.
