<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/006-setup-multi-business/plan.md
<!-- SPECKIT END -->

## Regla de Oro: Pausa para Revisión

Después de completar CADA fase o tarea individual de implementación, DETENERSE y mostrar
un resumen de lo hecho. Preguntar explícitamente: "¿Revisado? ¿Continuamos?".
NO avanzar a la siguiente fase sin confirmación del usuario.

Esto aplica a: speckit-specify, speckit-plan, speckit-tasks, speckit-implement,
speckit-clarify, y cualquier flujo de desarrollo multi-paso.

## Documentación como Pre-requisito de Implementación

Antes de planificar o implementar cualquier feature desde `specs/`, revisar `docs/`
y `apps/desktop/docs/` en busca de documentación relacionada con la feature.
Si existe, leerla y tomarla en cuenta en el plan. La documentación refleja
decisiones de arquitectura ya tomadas que no deben romperse sin consultar al usuario.

Propósito de cada carpeta:
- `specs/` — Artefactos SDD por feature (spec, plan, tareas, investigación)
- `docs/` — Guías técnicas generales del proyecto
- `apps/desktop/docs/` — Documentación específica del funcionamiento del desktop
- `.specify/` — Infraestructura del framework Speckit (templates, scripts)
