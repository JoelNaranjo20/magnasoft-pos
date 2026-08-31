# Feature Specification: Solución a Bloqueo de Smart App Control y Firma de Código (Serviteca POS)

**Feature Branch**: `017-smart-app-control-code-signing`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "El Control Inteligente de Aplicaciones bloqueó una aplicación que podría no ser segura. Bloqueamos C:\Program Files\Serviteca POS\Serviteca POS.exe porque no pudimos comprobar su publicador para confirmar que era seguro ejecutarlo."

---

## 1. Contexto y Diagnóstico del Problema

### ¿Qué es el Control Inteligente de Aplicaciones (Smart App Control - SAC)?
En Windows 11 (versiones 22H2 y superiores), Microsoft introdujo **Smart App Control (SAC)**, un sistema de seguridad a nivel de kernel e inteligencia en la nube que evalúa todos los ejecutables (`.exe`, `.msi`, `.dll`) antes de permitir su apertura.

### Causa Raíz
1. **Falta de Firma Digital**: El ejecutable `Serviteca POS.exe` y el instalador NSIS generados por `electron-builder` actualmente se compilan sin certificado de firma de código (Code Signing). Al no tener firma, el publicador aparece como *Desconocido / No Comprobado*.
2. **Falta de Reputación en la Nube de Microsoft**: Al ser un software privado de punto de venta recién compilado o actualizado, Microsoft Cloud Defender no tiene telemetría histórica de reputación positiva suficiente, por lo que SAC bloquea preventivamente su ejecución.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Desbloqueo y Ejecución Inmediata en el Equipo Afectado (Priority: P1)

Como operador o administrador del punto de venta en Windows 11, quiero poder desbloquear y ejecutar `Serviteca POS.exe` en mi equipo actual de manera rápida y segura sin que Smart App Control impida su apertura.

**Why this priority**: Es la necesidad inmediata y crítica para no detener la operación del negocio en el punto de venta.

**Independent Test**: Seguir los pasos de desbloqueo/configuración en el equipo con Windows 11 y verificar que `C:\Program Files\Serviteca POS\Serviteca POS.exe` se ejecuta normalmente sin mostrar la ventana de bloqueo de Smart App Control.

**Acceptance Scenarios**:
1. **Given** un equipo Windows 11 donde Smart App Control bloqueó `Serviteca POS.exe`, **When** se aplica el procedimiento de desbloqueo (ajuste de SAC / exclusión o comando `Unblock-File`), **Then** la aplicación se abre e inicia sesión correctamente.
2. **Given** un nuevo instalador descargado desde internet o red local, **When** se elimina la marca web (Zone.Identifier) y se ejecuta, **Then** el instalador se ejecuta sin bloqueo de Smart App Control.

---

### User Story 2 - Firma Digital Automatizada en el Proceso de Build (Priority: P2)

Como desarrollador/mantenedor de Serviteca POS, quiero que el proceso de compilación (`electron-builder` / `publish.ps1`) firme digitalmente de forma automática el instalador y el ejecutable `.exe` con un certificado de firma de código (Code Signing) y sellado de tiempo (RFC 3161 Timestamp), para que Windows identifique a "Magnasoft / Serviteca POS" como publicador legítimo.

**Why this priority**: Evita que cada nueva versión o actualización (`v1.0.53+`) vuelva a ser bloqueada como binario desconocido.

**Independent Test**: Ejecutar `pnpm electron:build` o `publish.ps1`, verificar con `Get-AuthenticodeSignature` o en las propiedades del archivo `.exe` generado que contiene una firma digital válida con sello de tiempo.

**Acceptance Scenarios**:
1. **Given** un certificado de firma de código configurado localmente o por variables de entorno, **When** se ejecuta el build de escritorio, **Then** `Serviteca POS.exe` y el instalador NSIS quedan firmados digitalmente.
2. **Given** una máquina cliente donde se ha instalado el certificado raíz/publicador de confianza de la empresa, **When** se instala y abre la aplicación, **Then** Windows muestra "Publicador Comprobado: Magnasoft" y no activa el bloqueo de publicador no verificado.

---

### User Story 3 - Guía y Automatización de Confianza para Clientes/Sucursales (Priority: P3)

Como técnico o instalador en nuevas terminales POS, quiero disponer de un script automatizado `install-cert-client.ps1` y una guía clara que configure la confianza del certificado en el almacén de Windows en 1 clic.

**Why this priority**: Facilita el despliegue rápido en nuevos equipos y terminales de clientes sin requerir soporte manual repetitivo.

**Independent Test**: Ejecutar `powershell -ExecutionPolicy Bypass -File install-cert-client.ps1` en una máquina limpia y comprobar que el certificado público se añade al almacén de `Trusted Root Certification Authorities` y `TrustedPublisher`.

---

## 3. Requisitos Funcionales

- **FR-001**: Debe existir una guía de solución inmediata con los pasos exactos para desbloquear Windows 11 Smart App Control en la máquina actual (tanto por interfaz gráfica como por comandos PowerShell).
- **FR-002**: Debe crearse un script PowerShell `scripts/generate-code-signing-cert.ps1` en `apps/desktop` para generar un certificado Code Signing autofirmado con parámetros RSA 2048/4096 y validez de 5 años.
- **FR-003**: Debe crearse un script PowerShell `scripts/install-cert-client.ps1` para importar de forma segura la clave pública `.cer` en los almacenes `Root` y `TrustedPublisher` de Windows en las terminales cliente.
- **FR-004**: `apps/desktop/electron-builder.json` DEBE ser actualizado para soportar la firma digital automatizada en Windows (`certificateFile`, `rfc3161TimeStampServer`, o variables de entorno `CSC_LINK` / `CSC_KEY_PASSWORD`).
- **FR-005**: El script `apps/desktop/publish.ps1` DEBE incorporar la carga de variables de firma de código si existen en `.env.local` antes de invocar `electron-builder`.
- **FR-006**: Debe crearse documentación técnica en `apps/desktop/docs/firmado_digital_smart_app_control.md` detallando las opciones de producción (incluyendo Microsoft Azure Trusted Signing y certificados comerciales EV/OV).

---

## 4. Success Criteria

- **SC-001**: El usuario logra ejecutar `Serviteca POS.exe` en su equipo Windows 11 de inmediato.
- **SC-002**: Las nuevas versiones de `Serviteca POS-Setup.exe` y `Serviteca POS.exe` quedan firmadas digitalmente con sello de tiempo RFC 3161.
- **SC-003**: En cualquier máquina con el certificado instalado, las propiedades del ejecutable muestran "Firma Digital Válida" y el publicador verificado.
