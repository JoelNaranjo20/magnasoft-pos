# Implementation Tasks: Solución a Bloqueo de Smart App Control y Firma de Código (Serviteca POS)

**Feature Branch**: `017-smart-app-control-code-signing`
**Spec**: [spec.md](file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/specs/017-smart-app-control-code-signing/spec.md)
**Plan**: [plan.md](file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/specs/017-smart-app-control-code-signing/plan.md)

---

## Fase 1: Desbloqueo Inmediato en el Equipo Actual
- [x] **Task 1.1**: Proporcionar y ejecutar las instrucciones inmediatas de desbloqueo en la PC actual (PowerShell `Unblock-File` y ajuste de Smart App Control en Seguridad de Windows).

## Fase 2: Scripts de Generación e Instalación de Certificados
- [x] **Task 2.1**: Crear el script `apps/desktop/scripts/generate-code-signing-cert.ps1` para generar certificados `.pfx` y `.cer` con OID de Code Signing.
- [x] **Task 2.2**: Crear el script `apps/desktop/scripts/install-cert-client.ps1` para importar la clave pública `.cer` en los almacenes de confianza de Windows.
- [x] **Task 2.3**: Actualizar `apps/desktop/.gitignore` para proteger la carpeta `certs/` y archivos `.pfx`.

## Fase 3: Integración en electron-builder y Build Pipeline
- [x] **Task 3.1**: Actualizar `apps/desktop/electron-builder.json` con la configuración de timestamping RFC 3161 y opciones de firma en Windows.
- [x] **Task 3.2**: Actualizar `apps/desktop/publish.ps1` para incorporar la carga automática de variables `CSC_LINK` y `CSC_KEY_PASSWORD` desde `.env.local`.

## Fase 4: Documentación Técnica de Producción y Azure Trusted Signing
- [x] **Task 4.1**: Crear `apps/desktop/docs/firmado_digital_smart_app_control.md` con la guía de solución, procedimientos para clientes, y opciones de producción (Azure Trusted Signing y certificados comerciales EV/OV).

## Fase 5: Verificación y Pruebas
- [x] **Task 5.1**: Generar el certificado de prueba y verificar su estructura.
- [x] **Task 5.2**: Validar que el archivo PFX y CER están creados y las variables configuradas.
