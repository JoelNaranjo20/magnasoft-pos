# Implementation Plan: Solución a Bloqueo de Smart App Control y Firma de Código (Serviteca POS)

**Feature Branch**: `017-smart-app-control-code-signing`
**Spec Reference**: [spec.md](file:///c:/Users/Windows%2011%20PRO%20X%2064/Documents/Magnasoft/specs/017-smart-app-control-code-signing/spec.md)

---

## 1. Arquitectura de la Solución

```
+--------------------------------------------------------------------------------+
|                        SOLUCIÓN A SMART APP CONTROL EN WINDOWS 11               |
+--------------------------------------------------------------------------------+
|                                                                                |
|  FASE 1: Desbloqueo Inmediato (PC Actual)                                      |
|  ---------------------------------------                                       |
|  1. Seguridad de Windows -> Control Inteligente de Aplicaciones -> Configurar    |
|  2. PowerShell: Unblock-File en el ejecutable e instalador                     |
|                                                                                |
|  FASE 2: Generación de Certificado & Automatización de Firma (apps/desktop)     |
|  ------------------------------------------------------------------------      |
|  1. Script: apps/desktop/scripts/generate-code-signing-cert.ps1                |
|     -> Genera certs/ServitecaPOS-CodeSign.pfx y certs/ServitecaPOS-Public.cer  |
|  2. Script: apps/desktop/scripts/install-cert-client.ps1                       |
|     -> Instala certs/ServitecaPOS-Public.cer en almacenes Root y TrustedPub    |
|                                                                                |
|  FASE 3: Integración en electron-builder y Build Pipeline                      |
|  --------------------------------------------------------                      |
|  1. apps/desktop/electron-builder.json -> Configurar firma con timestamp RFC3161|
|  2. apps/desktop/publish.ps1 -> Soporte de variables CSC_LINK / CSC_KEY_PASS   |
|  3. apps/desktop/.gitignore -> Asegurar que *.pfx no se suba a Git              |
|                                                                                |
|  FASE 4: Documentación Técnica de Producción y Azure Trusted Signing           |
|  -------------------------------------------------------------------           |
|  1. apps/desktop/docs/firmado_digital_smart_app_control.md                     |
+--------------------------------------------------------------------------------+
```

---

## 2. Archivos Afectados

### Scripts y Utilidades (Nuevos)
- `apps/desktop/scripts/generate-code-signing-cert.ps1`: Generador de certificado RSA 2048/4096 con EnhancedKeyUsage "Code Signing" (OID 1.3.6.1.5.5.7.3.3).
- `apps/desktop/scripts/install-cert-client.ps1`: Instalador automatizado para terminales cliente.

### Configuración del Desktop (Modificados)
- `apps/desktop/electron-builder.json`: Configurar `rfc3161TimeStampServer: "http://timestamp.digicert.com"` y hooks de firma de Windows.
- `apps/desktop/publish.ps1`: Automatización de variables de entorno para firma durante releases.
- `apps/desktop/.gitignore`: Excluir archivos `.pfx`, `.cer`, `certs/` de control de versiones por seguridad.

### Documentación (Nuevos)
- `apps/desktop/docs/firmado_digital_smart_app_control.md`: Guía completa de resolución, soporte a clientes, y opciones de producción (Azure Trusted Signing y certificados comerciales).

---

## 3. Plan de Verificación

1. **Verificación Inmediata en el Sistema**: Comprobar ejecución de `Serviteca POS.exe` desbloqueando el binario actual.
2. **Verificación de Generación de Certificado**: Ejecutar `generate-code-signing-cert.ps1` y validar que crea los archivos `.pfx` y `.cer`.
3. **Verificación de Firma en Binario**: Ejecutar un build de prueba con `pnpm electron:build` y verificar la firma con `Get-AuthenticodeSignature`.
4. **Verificación de Instalación en Almacén**: Ejecutar `install-cert-client.ps1` y comprobar que `certmgr.msc` registra a Magnasoft / Serviteca POS en Entidades Raíz de Confianza.
