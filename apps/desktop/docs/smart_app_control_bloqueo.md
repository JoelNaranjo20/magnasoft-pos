# Bloqueo de Smart App Control / SmartScreen en Serviteca POS

Guía para entender y mitigar —**sin coste**— el bloqueo preventivo de Windows 11
sobre `Serviteca POS.exe` y su instalador NSIS.

> **Resumen ejecutivo**
> No existe un certificado de firma de código gratuito que Windows reconozca.
> La app **no se firma**. La estrategia sin coste es: (1) enviar cada release al
> portal de analista de Microsoft para que limpie el falso positivo, (2) mantener
> el instalador y su identidad estables entre versiones para acumular reputación,
> y (3) dar al operador un procedimiento claro para destrabar una terminal.

---

## 1. Por qué Windows 11 bloquea la app

Dos mecanismos distintos, se confunden con facilidad:

| Mecanismo | Qué es | Cómo se comporta |
|---|---|---|
| **SmartScreen** (Microsoft Defender SmartScreen) | Filtro de reputación. Consulta la nube de Microsoft por el hash del archivo y por el publicador. | Muestra *"Windows protegió tu PC"* con la opción **"Más información → Ejecutar de todas formas"**. Si reintentás o esperás, suele terminar dejándolo pasar. |
| **Smart App Control (SAC)** | Capa de seguridad a nivel de kernel en Windows 11 22H2+. Solo permite ejecutables *predichos como seguros* por la nube de Microsoft o firmados por un publicador con reputación. | **Bloqueo estricto, sin botón de "ejecutar igual".** Reintentar no ayuda. |

**Causa en ambos casos:** `Serviteca POS` es software privado, de bajo volumen de
instalaciones y que se recompila seguido. La nube de Microsoft no tiene telemetría
histórica suficiente para asignarle reputación positiva, así que lo trata como
*desconocido* y lo bloquea de forma preventiva. Al no estar firmado, tampoco hay
un publicador con reputación al que asociar la confianza.

---

## 2. Diagnóstico rápido: ¿SmartScreen o SAC?

En la terminal afectada, ejecutar (no requiere permisos de administrador):

```powershell
powershell -ExecutionPolicy Bypass -File apps\desktop\scripts\check-smart-app-control.ps1
```

El script informa el **estado de Smart App Control**:

| Valor | Estado | Interpretación |
|---|---|---|
| `0` | **OFF** | SAC desactivado. El bloqueo, si lo hay, es de **SmartScreen** (reputación) → se resuelve reintentando o con "Ejecutar de todas formas". |
| `2` | **Evaluation** | SAC en modo aprendizaje; normalmente **no bloquea**. |
| `1` | **Enforcement** | SAC activo y bloqueando en serio. Ver §5, opción C. |

> Síntoma típico de **SmartScreen** (no SAC): *"si se reinicia el PC, o se abre y
> se cierra el programa varias veces, termina funcionando"*. Eso es la reputación
> resolviéndose en la nube, no SAC.

---

## 3. Solución de fondo (sin coste): enviar cada release a Microsoft

Microsoft permite a los desarrolladores **disputar un falso positivo** y pedir que
se limpie la detección. Es gratis y cubre SmartScreen, Defender y SAC.

### Portal
<https://www.microsoft.com/en-us/wdsi/filesubmission>

### Pasos por cada versión publicada (`v1.0.53`, `v1.0.54`, …)

1. Compilar y publicar normalmente (`.\publish.ps1`).
2. Descargar de la release de GitHub el instalador `Serviteca POS-Setup-<versión>.exe`.
3. Entrar al portal → **"Submit a file for malware analysis"**.
4. Iniciar sesión con una cuenta Microsoft y elegir **"Company"** →
   rol **"Software developer / ISV"**.
5. Subir el `.exe`. En el campo de detección poner algo como
   *"Falso positivo. Instalador legítimo de nuestro punto de venta Serviteca POS
   (Magnasoft). Bloqueado por SmartScreen / Smart App Control por falta de
   reputación. Solicitamos revisión y allow-listing."*
6. Marcar **"I believe this file is clean"** / *"should not have been detected"*.
7. Enviar y guardar el **submission ID**.

**Tiempo de respuesta:** normalmente de unas horas a ~72 h. Cuando Microsoft
aprueba, la reputación se propaga a todas las máquinas en el siguiente chequeo de
nube (no hace falta tocar cada terminal).

> Registrar cada envío en `docs/` o en la descripción de la release (fecha,
> versión, submission ID, resultado).

---

## 4. Medidas de apoyo (sin coste)

La reputación se acumula por **identidad estable**. Cambiarla la resetea a cero.

- **No cambiar** `appId` (`com.servitecapos.app`) ni `productName` (`Serviteca POS`)
  en `electron-builder.json`.
- Mantener el mismo esquema de nombre de artefacto
  (`Serviteca POS-Setup-${version}.exe`) y el mismo tipo de instalador (NSIS
  `perMachine`).
- Publicar siempre desde el mismo repo/owner de GitHub para que la URL de descarga
  sea consistente.
- Subir versiones con frecuencia razonable pero **agrupando cambios**: muchas
  releases diminúsculas y seguidas hacen que cada uno parezca un binario nuevo sin
  historia.
- No cambiar el icono ni los metadatos de versión sin necesidad.
- Tras varias versiones limpias enviadas al portal, Microsoft empieza a confiar en
  el patrón y los bloqueos se espacian.

---

## 5. Terminal bloqueada: procedimiento para el operador

### Opción A — SmartScreen (lo más común)

1. En el aviso *"Windows protegió tu PC"*, clic en **"Más información"**.
2. Clic en **"Ejecutar de todas formas"**.
3. Si no aparece ese botón: cerrar el aviso, **esperar 1–2 minutos** y volver a
   abrir; o **reiniciar el equipo** y reintentar. La reputación suele resolverse
   sola en el siguiente chequeo de nube.

### Opción B — Quitar la "marca de internet" del instalador

Si el instalador se copió por USB o red y Windows lo trata como descargado:

```powershell
Unblock-File -Path "C:\ruta\a\Serviteca POS-Setup-<versión>.exe"
```

(Solo afecta a SmartScreen; no tiene efecto sobre SAC.)

### Opción C — Smart App Control en Enforcement (`estado = 1`)

Solo si el script de diagnóstico reporta estado `1` y no hay botón de "ejecutar
igual":

1. Menú Inicio → **Seguridad de Windows**.
2. **Control de aplicaciones y explorador** → **Configuración de Control
   inteligente de aplicaciones**.
3. Cambiar a **Desactivado**.

> ⚠️ **Importante:** volver a activar Smart App Control **requiere restablecer o
> reinstalar Windows**. En una terminal dedicada de punto de venta es un cambio
> aceptable y de una sola vez, pero debe hacerlo alguien autorizado y quedar
> registrado.

---

## 6. Qué NO hacemos y por qué

| Opción descartada | Motivo |
|---|---|
| **Certificado de firma comercial (OV/EV)** — DigiCert, Sectigo, GlobalSign (~$200–600/año + token de hardware) | Tiene coste recurrente. Fuera de presupuesto. |
| **Azure Trusted Signing** (~$10 USD/mes) | Tiene coste recurrente. Fuera de presupuesto. |
| **Certificado autofirmado + instalar la raíz en cada terminal** | (1) SAC **no** consulta el almacén de confianza local: seguiría bloqueando. (2) Instalar una CA raíz propia en PCs de clientes es un riesgo de seguridad para ellos. (3) **Rompería el auto-update:** al firmar, `electron-builder` escribe `publisherName` en `app-update.yml` y, una versión después, `electron-updater` rechazaría toda actualización (`ERR_UPDATER_INVALID_SIGNATURE`) en cualquier terminal que no tenga ese certificado como confiable — es decir, todas. |

Si en el futuro hay presupuesto, la vía recomendada por Microsoft es **Azure
Trusted Signing**, que además otorga reputación de inmediato ante SAC/SmartScreen.

---

## 7. Checklist de release

- [ ] `.\publish.ps1` → release publicada en GitHub.
- [ ] `appId` / `productName` / esquema de nombre **sin cambios** respecto a la versión anterior.
- [ ] Instalador subido a <https://www.microsoft.com/en-us/wdsi/filesubmission> como *software developer*, falso positivo.
- [ ] Submission ID anotado en la descripción de la release.
- [ ] (Opcional) Verificado en una terminal de prueba que la nueva versión abre tras el chequeo de reputación.
