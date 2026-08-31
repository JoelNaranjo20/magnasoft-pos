# Implementation Tasks: Solución a Bloqueo de Smart App Control (sin coste)

**Feature Branch**: `017-smart-app-control-code-signing`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Revisado**: 2026-08-31

---

## Fase 1: Revertir lo introducido para firma de código
- [x] **Task 1.1**: Revertir `apps/desktop/electron-builder.json` a `main` (quitar `rfc3161TimeStampServer`).
- [x] **Task 1.2**: Revertir `apps/desktop/publish.ps1` a `main` (cargar solo `GH_TOKEN`).
- [x] **Task 1.3**: Dejar en `apps/desktop/.gitignore` únicamente el ignore de `certs/` / `*.pfx` / `*.key` / `*.p12` (higiene).
- [x] **Task 1.4**: Eliminar `apps/desktop/scripts/generate-code-signing-cert.ps1`.
- [x] **Task 1.5**: Eliminar `apps/desktop/scripts/install-cert-client.ps1`.

## Fase 2: Documentación del enfoque sin coste
- [x] **Task 2.1**: Renombrar `apps/desktop/docs/firmado_digital_smart_app_control.md` → `smart_app_control_bloqueo.md`.
- [x] **Task 2.2**: Reescribir el doc: SAC vs SmartScreen, diagnóstico, procedimiento del operador, envío a Microsoft WDSI por release, identidad consistente, checklist de release, y sección "qué NO hacemos y por qué".

## Fase 3: Script de diagnóstico
- [x] **Task 3.1**: Crear `apps/desktop/scripts/check-smart-app-control.ps1` (solo lectura): estado de SAC + marca de internet (`Zone.Identifier`) + recomendación.
- [x] **Task 3.2**: Verificar que el script parsea sin errores y corre sin privilegios de administrador.

## Fase 4: Artefactos de spec
- [x] **Task 4.1**: Actualizar `spec.md` (quitar FRs de firma/Azure/EV/OV; añadir FRs de WDSI, diagnóstico e identidad consistente).
- [x] **Task 4.2**: Actualizar `plan.md` y `tasks.md` a este enfoque.

## Fase 5: Verificación
- [ ] **Task 5.1**: `git diff main -- apps/desktop/electron-builder.json apps/desktop/publish.ps1` muestra solo la reversión.
- [ ] **Task 5.2**: Build de prueba → `app-update.yml` NO contiene `publisherName`.
- [ ] **Task 5.3**: Primer envío real a <https://www.microsoft.com/en-us/wdsi/filesubmission> para la próxima release (`v1.0.53`) y anotar submission ID.
