---
name: speckit-review-gate
description: Cada tarea o fase de Speckit requiere pausa para revisión del usuario antes de continuar
metadata:
  type: feedback
---

Al implementar con Speckit o cualquier skill de spec-kit (speckit-specify, speckit-plan, speckit-tasks, speckit-implement, speckit-clarify), cada fase o tarea completada debe ser presentada al usuario para revisión ANTES de continuar a la siguiente. No se debe encadenar fases automáticamente sin confirmación explícita del usuario.

**Why**: El usuario quiere revisar y probar cada cambio antes de seguir, para evitar deuda técnica y bugs no detectados. Prefiere ir lento pero seguro.

**How to apply**: Después de completar cada fase del plan o cada tarea de implementación, mostrar un resumen claro de lo hecho y preguntar "¿Revisado? ¿Continuamos con la siguiente fase/tarea?" antes de proceder. No avanzar sin confirmación.
