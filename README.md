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

Comprobá: `/mcp` → `plugin:cortex-memory:cortex` con **19 tools**.

---

## 2. API Key

En la app Cortex: **Settings → Modo desarrollador → API Keys**

```text
notes:read, notes:write, relations:read, relations:write, search:read, context:read
```

Si además querés el ecosistema **Proyecto** (grafo de código, ver abajo), sumá:

```text
project:read, project:write, project:index
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

## Ecosistema Proyecto (grafo de código)

Además de la memoria de notas, el plugin indexa tu **repositorio de código**
(archivos, símbolos, imports, calls, extends/implements) en un grafo
estructural — para que el agente consulte relaciones en vez de releer
archivos completos. Medido: ~4.8x menos tokens en promedio en tareas reales.

Tools: `cortex_project_register`, `cortex_project_index`,
`cortex_project_graph`, `cortex_project_nodes`, `cortex_project_search`.

No hace falta llamarlas a mano — con el scope `project:index` activo, el
agente indexa solo al terminar una tarea sustancial. Alcance actual:
TS/JS/TSX/JSX; relaciones cruzando archivos solo en imports directos e
inyección de dependencias estilo NestJS (marcadas `INFERRED` vs `EXTRACTED`
para lo verificado en el mismo archivo).

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| MCP desconectado | `/reload-plugins` |
| API key inválida | Revisá `.cortex/credentials.json` |
| Sin contexto al inicio | URL incorrecta o servidor Cortex caído |
| Plugin no aparece | Reinstalá marketplace + `install cortex-memory@cortex` |
