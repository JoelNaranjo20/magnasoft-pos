# Guía Técnica: Solución al Bloqueo de Smart App Control y Firma de Código (Code Signing)

Esta guía documenta la causa, solución inmediata, flujo de compilación firmado y opciones de producción para resolver el bloqueo preventivo de **Control Inteligente de Aplicaciones (Smart App Control - SAC)** y **Microsoft Defender SmartScreen** en Windows 11.

---

## 1. ¿Por qué Windows 11 bloquea Serviteca POS?

En Windows 11 (22H2 en adelante), Microsoft introdujo **Control Inteligente de Aplicaciones (SAC)** como una capa de seguridad basada en IA y telemetría en la nube.

A diferencia del SmartScreen tradicional (que permite hacer clic en *"Más información -> Ejecutar de todas formas"*), **Smart App Control bloquea de manera estricta** la ejecución de cualquier archivo binario (`.exe`) cuando:
1. **El archivo no posee una Firma Digital válida**: El ejecutable aparece con *Publicador: Desconocido / No comprobado*.
2. **No cuenta con suficiente reputación en la nube de Microsoft**: Al ser un software privado de punto de venta o una compilación nueva, no tiene millones de descargas registradas en los servidores de Microsoft Defender.

---

## 2. Solución Inmediata en la Máquina del Cliente o POS

Si un equipo con Windows 11 muestra el mensaje de bloqueo, sigue estos pasos:

### Opción A: Desbloquear archivo con PowerShell (Recomendada y rápida)
Abre PowerShell como Administrador y ejecuta:
```powershell
Unblock-File -Path "C:\Program Files\Serviteca POS\Serviteca POS.exe"
```
*(Si se descargó un instalador `Serviteca POS-Setup-X.X.X.exe`, ejecuta también `Unblock-File -Path "Ruta\Al\Instalador.exe"`).*

### Opción B: Ajustar Control Inteligente de Aplicaciones en Windows 11
1. Abre el menú Inicio y busca **Seguridad de Windows** (Windows Security).
2. Ve a **Control de aplicaciones y explorador** (App & browser control).
3. Haz clic en **Configuración de Control inteligente de aplicaciones** (Smart App Control settings).
4. Cambia el estado a **Evaluación** (Evaluation) o **Desactivado** (Off).
   > *Nota*: En modo "Activado", Windows 11 bloqueará cualquier aplicación de desarrollo o privada que no tenga un certificado comercial de alta reputación.

---

## 3. Solución Interna / Autofirmada (Despliegue Local y Sucursales)

Para que las compilaciones de `Serviteca POS` salgan firmadas digitalmente y las terminales cliente las reconozcan como seguras:

### Paso 1: Generar el Certificado de Firma de Código
En la carpeta del proyecto, ejecuta una sola vez:
```powershell
powershell -ExecutionPolicy Bypass -File apps/desktop/scripts/generate-code-signing-cert.ps1
```
Esto creará:
- `apps/desktop/certs/ServitecaPOS.pfx`: Certificado privado con validez de 5 años.
- `apps/desktop/certs/ServitecaPOS-Public.cer`: Certificado público para los clientes.

### Paso 2: Compilar y Publicar con Firma Automática
En `apps/desktop/.env.local` (archivo **no versionado**, nunca se sube a Git), asegúrate de tener:
```ini
CSC_LINK=certs/ServitecaPOS.pfx
CSC_KEY_PASSWORD=<la contraseña que usaste al generar el .pfx>
```
> La contraseña del `.pfx` vive **solo** en `.env.local`. Ni los scripts ni `publish.ps1` la traen hardcodeada: la leen de ahí (o de la variable de entorno `CSC_KEY_PASSWORD`).

Al ejecutar `pnpm electron:build` o `.\publish.ps1`, `electron-builder` firmará automáticamente el instalador NSIS y el ejecutable principal con sello de tiempo RFC 3161 (`http://timestamp.digicert.com`).

### Paso 3: Instalar Confianza en Terminales Cliente (1 Clic)
Copia el archivo `ServitecaPOS-Public.cer` y el script `install-cert-client.ps1` al equipo del cliente y ejecuta:
```powershell
powershell -ExecutionPolicy Bypass -File .\install-cert-client.ps1
```
Al registrarse en las **Entidades de certificación raíz de confianza** y **Editores de confianza**, Windows 11 reconocerá a **"Magnasoft - Serviteca POS"** como un publicador verificado.

---

## 4. Opciones de Firma Oficial para Producción Pública

Si en el futuro se desea distribuir `Serviteca POS` públicamente a terceros sin requerir la importación del certificado público en cada máquina:

### 1. Microsoft Azure Trusted Signing (Recomendada por Microsoft)
- **Costo**: ~$9.99 USD / mes.
- **Ventajas**: Servicio oficial de Microsoft en Azure. Firma en la nube sin requerir llaves USB de hardware (Hardware Security Modules). Otorga reputación inmediata en Smart App Control y SmartScreen.
- **Integración**: Compatible con `electron-builder` mediante la herramienta `azure-code-signing` o GitHub Actions.

### 2. Certificado Comercial EV (Extended Validation)
- **Proveedores**: DigiCert, Sectigo, GlobalSign.
- **Costo**: ~$300 - $500 USD / año.
- **Ventajas**: Reputación instantánea máxima en Microsoft Defender SmartScreen y Windows 11.
