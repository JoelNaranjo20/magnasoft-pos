# Implementation Plan: Solución a Bloqueo de Smart App Control (sin coste) — Serviteca POS

**Feature Branch**: `017-smart-app-control-code-signing`
**Spec**: [spec.md](./spec.md) · **Revisado**: 2026-08-31

> El plan original (firma de código autofirmada + integración en `electron-builder`)
> quedó descartado: el negocio no acepta coste recurrente, un certificado
> autofirmado **no** satisface a Smart App Control y, al firmar, `electron-builder`
> escribiría `publisherName` en `app-update.yml`, con lo que `electron-updater`
> rechazaría toda actualización futura en las terminales (`ERR_UPDATER_INVALID_SIGNATURE`).
> Verificado en `electron-updater@6.8.3` y `app-builder-lib@25.1.8`.

---

## 1. Estrategia

```
+---------------------------------------------------------------------+
|  ENFOQUE SIN COSTE — la app NO se firma                            |
+---------------------------------------------------------------------+
|                                                                   |
|  A. Documentación (apps/desktop/docs/smart_app_control_bloqueo.md) |
|     - SAC vs SmartScreen                                           |
|     - Procedimiento para el operador                              |
|     - Envío a Microsoft WDSI por release (solución de fondo)       |
|     - Identidad consistente entre versiones                        |
|     - Checklist de release                                         |
|                                                                   |
|  B. Diagnóstico (apps/desktop/scripts/check-smart-app-control.ps1) |
|     - Solo lectura: estado SAC + marca de internet + recomendación |
|                                                                   |
|  C. Reversión de lo introducido para firma                         |
|     - electron-builder.json, publish.ps1  -> vuelven a main        |
|     - .gitignore -> se conserva solo el ignore de *.pfx/*.key/certs/|
|     - scripts/generate-code-signing-cert.ps1  -> eliminado         |
|     - scripts/install-cert-client.ps1         -> eliminado         |
+---------------------------------------------------------------------+
```

Ninguna de las medidas toca el pipeline de build ni el canal de auto-update.

---

## 2. Technical Context

**Language/Version**: PowerShell 5.1 (script de diagnóstico), Markdown (docs)

**Primary Dependencies**: ninguna nueva. `electron-builder` / `electron-updater`
quedan como en `main`.

**Target Platform**: Windows 11 22H2+ (terminales POS de escritorio, Electron)

**Constraints**:
- Sin coste recurrente.
- No introducir `publisherName` en `app-update.yml` (mantener
  `verifyUpdateCodeSignature` en su default sin firmar).
- El script de diagnóstico no modifica registro/certificados/archivos y no exige
  administrador.

**Scale/Scope**: 1 doc nuevo (renombrado), 1 script nuevo, 2 scripts eliminados,
3 archivos revertidos, 3 artefactos de spec actualizados.

---

## 3. Archivos Afectados

### Nuevos / Reescritos
- `apps/desktop/docs/smart_app_control_bloqueo.md` — renombrado desde
  `firmado_digital_smart_app_control.md` y reescrito por completo.
- `apps/desktop/scripts/check-smart-app-control.ps1` — diagnóstico de solo lectura.

### Revertidos a `main`
- `apps/desktop/electron-builder.json` — se quita `rfc3161TimeStampServer`.
- `apps/desktop/publish.ps1` — vuelve a cargar solo `GH_TOKEN`.

### Modificación mínima conservada
- `apps/desktop/.gitignore` — se mantiene el ignore de `certs/` / `*.pfx` /
  `*.key` / `*.p12` como higiene (evita subir claves privadas por accidente).

### Eliminados
- `apps/desktop/scripts/generate-code-signing-cert.ps1`
- `apps/desktop/scripts/install-cert-client.ps1`

### Artefactos de spec
- `specs/017-smart-app-control-code-signing/{spec,plan,tasks}.md` — actualizados.

---

## 4. Plan de Verificación

1. `check-smart-app-control.ps1` corre sin administrador y reporta estado SAC +
   marca de internet + recomendación coherente (probado: SAC = 0 en la máquina de
   desarrollo).
2. `git diff main -- apps/desktop/electron-builder.json apps/desktop/publish.ps1`
   solo muestra la reversión (sin residuos de firma).
3. `app-update.yml` generado en un build de prueba **no** contiene `publisherName`.
4. La documentación no referencia ningún servicio de pago como parte de la
   solución adoptada.

---

## 5. Complexity Tracking

> Sin violaciones. No se añade backend, no se toca el pipeline de build, no se
> altera el canal de auto-update.
