# Cortex Memory

Plugin de Claude Code para memoria persistente en proyectos de código.  
Decisiones, bugs y handoffs se guardan en **Cortex** (servidor remoto), no en archivos locales.

**Requisitos:** Claude Code, Node.js 20+, cuenta Cortex con API Key (`onx_...`).

---

## 1. Instalar el plugin

```text
/plugin marketplace add https://github.com/lhambdacompany/onix-plugin
/plugin install cortex-memory@cortex
/reload-plugins
```

Comprobá: `/mcp` → `plugin:cortex-memory:cortex` con **14 tools**.

---

## 2. API Key

En la app Cortex: **Settings → Modo desarrollador → API Keys**

```text
notes:read, notes:write, relations:read, relations:write, search:read, context:read
```

La clave solo se muestra una vez. Copiala.

---

## 3. Credenciales en tu proyecto

En la carpeta donde trabajás con Claude, creá `.cortex/credentials.json`:

```json
{
  "apiUrl": "https://api.onixapp.online/api/public/v1",
  "apiKey": "onx_..."
}
```

O con el script (si clonaste este repo):

```bash
CORTEX_API_URL=https://api.onixapp.online/api/public/v1 \
CORTEX_API_KEY=onx_tu_clave \
node cortex-memory/scripts/setup-credentials.mjs
```

**No commitees** ese archivo.

Opcional: `.cortex/config.json` con el nombre del proyecto → plantilla en `cortex-memory/.cortex/`.

Abrí Claude en tu proyecto: `cd mi-app && claude`.

---

## Guía completa

Pasos detallados, configuración, comandos y troubleshooting → **[INSTALL.md](./INSTALL.md)**

---

## Qué hace

| Momento | Comportamiento |
|---------|----------------|
| Inicio de sesión | Recupera contexto relevante de Cortex |
| Durante el trabajo | Guarda decisiones y fixes confirmados |
| Al cerrar | Handoff para retomar sin re-explicar todo |

Comando manual: `/cortex-handoff`

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| MCP desconectado | `/reload-plugins` |
| API key inválida | Revisá `.cortex/credentials.json` |
| Sin contexto al inicio | URL incorrecta o servidor Cortex caído |
| Plugin no aparece | Reinstalá marketplace + `install cortex-memory@cortex` |
