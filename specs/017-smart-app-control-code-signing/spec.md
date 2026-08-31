# Feature Specification: Solución a Bloqueo de Smart App Control (sin coste) — Serviteca POS

**Feature Branch**: `017-smart-app-control-code-signing`

**Created**: 2026-08-22 · **Revisado**: 2026-08-31 (enfoque sin coste, sin firma de código)

**Status**: Draft

**Input**: "El Control Inteligente de Aplicaciones bloqueó una aplicación que podría no ser segura. Bloqueamos C:\Program Files\Serviteca POS\Serviteca POS.exe porque no pudimos comprobar su publicador para confirmar que era seguro ejecutarlo."

**Restricción del negocio**: no se puede incurrir en ningún coste recurrente. Queda
descartada la firma de código (comercial OV/EV y Azure Trusted Signing). La app **no
se firma**.

---

## 1. Contexto y Diagnóstico

Windows 11 (22H2+) bloquea `Serviteca POS.exe` y su instalador NSIS por **dos
mecanismos distintos**:

- **Microsoft Defender SmartScreen** — filtro de reputación en la nube. Muestra
  *"Windows protegió tu PC"* con **"Ejecutar de todas formas"**. Reintentar o
  reiniciar suele resolverlo cuando la reputación se propaga.
- **Smart App Control (SAC)** — bloqueo estricto a nivel de kernel, sin opción de
  "ejecutar igual". Solo permite binarios predichos como seguros por la nube de
  Microsoft o firmados por un publicador con reputación.

**Causa raíz común**: software privado, de bajo volumen y recompilado con
frecuencia ⇒ sin telemetría de reputación positiva ⇒ bloqueo preventivo. Al no
estar firmado, tampoco hay publicador con reputación al que anclar confianza.

**Síntoma reportado** ("reiniciar el PC o abrir/cerrar varias veces y termina
funcionando") ⇒ es **SmartScreen / reputación transitoria**, no SAC en enforcement.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Destrabar una terminal bloqueada (Priority: P1)

Como operador del punto de venta, quiero un procedimiento claro (y un script de
diagnóstico) para volver a abrir `Serviteca POS` cuando Windows lo bloquea, sin
depender de soporte.

**Independent Test**: en una terminal donde Windows bloqueó la app, correr
`scripts/check-smart-app-control.ps1`, seguir la recomendación que imprime, y
verificar que la app abre.

**Acceptance Scenarios**:
1. **Given** un bloqueo de SmartScreen, **When** el operador usa "Más información →
   Ejecutar de todas formas" o reinicia y reintenta, **Then** la app abre.
2. **Given** un instalador copiado por USB/red con marca de internet, **When** se
   ejecuta `Unblock-File` sobre él, **Then** SmartScreen deja de marcarlo como
   descargado.
3. **Given** SAC en enforcement (`estado = 1`), **When** el script lo detecta,
   **Then** imprime los pasos exactos de Seguridad de Windows para desactivarlo,
   incluyendo la advertencia de que reactivarlo exige restablecer Windows.

### User Story 2 - Reducir los bloqueos de forma sostenible (Priority: P2)

Como mantenedor de Serviteca POS, quiero un proceso repetible y gratuito para que
cada versión nueva deje de ser bloqueada, apoyándome en el canal de analista de
Microsoft y en mantener una identidad estable.

**Independent Test**: publicar `v1.0.53`, enviar el instalador a
<https://www.microsoft.com/en-us/wdsi/filesubmission> como *software developer* /
falso positivo, y registrar el submission ID en la release.

**Acceptance Scenarios**:
1. **Given** una release publicada, **When** se sigue el checklist de release,
   **Then** el instalador queda enviado a Microsoft y el ID anotado.
2. **Given** varias versiones consecutivas enviadas y aprobadas, **When** se mide
   la frecuencia de bloqueos, **Then** disminuye respecto al estado inicial.
3. **Given** una versión nueva, **When** se compara con la anterior, **Then**
   `appId`, `productName`, tipo de instalador y esquema de nombre de artefacto
   **no cambiaron**.

### User Story 3 - Diagnóstico rápido en soporte (Priority: P3)

Como técnico de soporte, quiero un único comando de solo lectura que me diga si el
problema es SAC o SmartScreen y qué hacer, para no adivinar por teléfono.

**Independent Test**: correr `scripts/check-smart-app-control.ps1` en cualquier
equipo y obtener estado de SAC + marca de internet del `.exe` + recomendación.

---

### Edge Cases

- Windows anterior a 11 22H2: la clave de SAC no existe → el script lo informa y
  trata el caso como SmartScreen.
- `Serviteca POS.exe` instalado en ruta no estándar → el script acepta `-Path`.
- Terminal sin internet → la reputación no se resuelve; documentar que SmartScreen
  necesita conectividad para el chequeo de nube.

---

## 3. Requisitos Funcionales

- **FR-001**: Debe existir `apps/desktop/docs/smart_app_control_bloqueo.md` con:
  causa, diagnóstico SAC vs SmartScreen, procedimiento para el operador, proceso de
  envío a Microsoft WDSI, medidas de identidad consistente, y checklist de release.
- **FR-002**: Debe existir `apps/desktop/scripts/check-smart-app-control.ps1`,
  **solo lectura**, que reporte el estado de Smart App Control (0/1/2 o no
  disponible) y si el ejecutable indicado tiene marca de internet
  (`Zone.Identifier`), e imprima la recomendación acorde.
- **FR-003**: El script NO debe modificar el registro, el almacén de certificados
  ni ningún archivo. No debe requerir privilegios de administrador para el
  diagnóstico.
- **FR-004**: La documentación DEBE indicar explícitamente que la app **no se
  firma** y por qué (coste recurrente; además, un certificado autofirmado no
  satisface a SAC y rompería el auto-update de `electron-updater`).
- **FR-005**: `electron-builder.json`, `publish.ps1` y `apps/desktop/.gitignore`
  DEBEN quedar sin cambios de firma respecto a `main` (solo se conserva, por
  higiene, el ignore de `*.pfx` / `*.key` / `certs/`).
- **FR-006**: El checklist de release DEBE verificar que `appId`, `productName`,
  tipo de instalador y esquema de nombre de artefacto no cambian entre versiones.

---

## 4. Success Criteria

- **SC-001**: Un operador puede destrabar una terminal bloqueada por SmartScreen en
  menos de 2 minutos siguiendo la guía, sin intervención de soporte.
- **SC-002**: Existe un proceso escrito y repetible, sin coste, para enviar cada
  release a Microsoft, con registro de submission IDs.
- **SC-003**: `check-smart-app-control.ps1` corre en una terminal limpia y reporta
  correctamente el estado de SAC y la marca de internet, sin pedir administrador.
- **SC-004**: El canal de auto-update de `electron-updater` sigue intacto (no se
  introduce `publisherName` en `app-update.yml`).

---

## 5. Assumptions

- Las terminales se actualizan solas vía `electron-updater` desde releases de
  GitHub; no hay un técnico tocando cada equipo en cada versión.
- No hay presupuesto para certificados ni servicios de firma.
- El operador de la terminal puede ejecutar un `.ps1` con `-ExecutionPolicy Bypass`
  y, si hace falta, entrar a Seguridad de Windows con una cuenta autorizada.
- El equipo de desarrollo tiene una cuenta Microsoft para usar el portal WDSI.
