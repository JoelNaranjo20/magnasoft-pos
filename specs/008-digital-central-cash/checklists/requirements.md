# Specification Quality Checklist: Ingresos Completos a Caja Central con Trazabilidad

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-09
**Updated**: 2026-06-09 (v2 — movimiento único con metadata)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

- v2 actualizada según feedback del usuario: un solo movimiento por sesión con metadata JSONB de desglose.
- 4 user stories: US1 Movimiento único total (P1), US2 Trazabilidad con metadata expandible (P1), US3 Backfill unificado (P2), US4 Vista agrupada por día (P2).
- 11 functional requirements (FR-001 a FR-011).
- Columnas nuevas: `session_id` (UUID FK) + `metadata` (JSONB).
- Relación 1:1 sesión → movimiento de cierre (no 1:N como antes).
- Edge cases cubren: mixed payments, crédito, propinas, sesiones sin digitales, backfill idempotente.
