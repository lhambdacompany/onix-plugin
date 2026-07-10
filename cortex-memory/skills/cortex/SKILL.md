---
name: cortex
description: Selects whether Claude uses Cortex Personal or Cortex Global for the current session.
argument-hint: "[personal|global] [consulta opcional]"
---

# Elegir Cortex

Use `$ARGUMENTS` to select the Cortex space for the current conversation.

1. If there is no first argument, activate `personal`. If an argument is present
   but is not `personal` or `global`, ask the user to choose a valid space.
2. Keep that choice for the rest of the current conversation.
3. For `personal`, pass `scope: "personal"` when retrieving and
   `visibility: "PERSONAL"` when saving.
4. For `global`, pass `scope: "global"` when retrieving and
   `visibility: "GLOBAL"` when saving.
5. Always ask for explicit confirmation immediately before writing to Global.
6. If arguments remain after the scope, use them as the context query.
   Otherwise, use the current project and task.

Call `cortex_get_context` after choosing and briefly report which space is active.
