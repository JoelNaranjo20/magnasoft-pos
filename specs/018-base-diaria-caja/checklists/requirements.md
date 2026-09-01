# Specification Quality Checklist: Base Diaria de Caja Configurable

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- FR-001/FR-002/FR-010/FR-011 y la sección *Assumptions* mencionan ubicaciones concretas
  (`business_settings`, `useBusinessStore`, `apps/desktop`, `docs/features/cash-flow.md`).
  Se conservan de forma deliberada: son decisiones de alcance ya acordadas con el usuario
  y siguen la convención de specs previas del proyecto (ver 016). No bloquean la fase de
  planificación.
- La fórmula del ingreso de efectivo a Caja Central en el cierre quedó **resuelta** en el
  Plan y la sesión de clarificación 2026-08-31 (ver `## Clarifications` en el spec):
  eliminar el egreso "Base próximo día"; `cashIngresos` ya excluye `opening_balance`.
- Clarificación 2026-08-31: (1) "Base Próximo Día" en el Cierre = **siempre** la Base
  Diaria configurada; (2) editar el monto de la base (Apertura y Cierre) **requiere PIN
  Maestro** (`business.pin` / `SecurityPinModal`) → nuevo **FR-012**. `plan.md` y
  `tasks.md` deben actualizarse para incluir el gate de PIN.
