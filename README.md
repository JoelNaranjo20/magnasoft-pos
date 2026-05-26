# Magnasoft POS - Sistema para Lavaderos y Servitecas

![Magnasoft POS](https://img.shields.io/badge/Versi%C3%B3n-1.0.31-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Electron](https://img.shields.io/badge/Electron-33-black)
![Supabase](https://img.shields.io/badge/Supabase-DB%20%26%20Auth-green)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC)

**Magnasoft POS** es un sistema integral de Punto de Venta (POS) diseñado específicamente para el sector automotriz. Actualmente, se encuentra optimizado y operando con éxito en **lavaderos de vehículos (Car Wash)** y **servitecas**.

Ofrece una solución de escritorio robusta para la gestión completa del negocio, desde el registro rápido de servicios y ventas hasta el control detallado de créditos y administración de clientes.

## 🚀 Características Principales

*   **Punto de Venta Especializado:** Interfaz rápida, moderna e intuitiva para registrar ventas de servicios de lavado, limpieza, mantenimiento automotriz y venta de productos.
*   **Gestión de Vehículos y Clientes:** Asociación de servicios a vehículos específicos con historiales detallados por cliente. Permite la creación ágil de clientes y vehículos "al vuelo" directamente en la pantalla de pago.
*   **Control de Créditos y Cartera:** Sistema avanzado para gestionar deudas, registrar abonos, realizar pagos parciales y llevar el control de cuentas por cobrar (fiados).
*   **Arquitectura Multi-tenant (Multi-empresa):** Base de datos estructurada para manejar múltiples negocios, sucursales o inquilinos de manera completamente segura y aislada.
*   **Módulo de Administración:** Panel de control para gestionar configuraciones, crear nuevos servicios, definir precios y administrar el equipo (usuarios, roles como cajeros/administradores, e invitaciones).
*   **Aplicación de Escritorio Nativa:** Empaquetado profesional con Electron para garantizar un rendimiento óptimo, acceso integrado a periféricos (como impresoras térmicas en un futuro) y un entorno de trabajo sin distracciones.

## 🛠️ Tecnologías Utilizadas

Este proyecto está construido bajo una arquitectura de monorepo gestionada con `pnpm`, integrando tecnologías modernas de alto rendimiento:

*   **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) para un diseño responsivo y moderno, estado global fluido con [Zustand](https://zustand-demo.pmnd.rs/), e iconografía con [Lucide React](https://lucide.dev/).
*   **Backend & Base de Datos:** [Supabase](https://supabase.com/) como Backend-as-a-Service, ofreciendo PostgreSQL, Autenticación segura y Row Level Security (RLS).
*   **Entorno de Escritorio:** [Electron](https://www.electronjs.org/) junto con [Vite](https://vitejs.dev/) para un desarrollo ultra rápido y [Electron Builder](https://www.electron.build/) para la distribución multiplataforma.

## ⚙️ Estructura del Proyecto

El código fuente utiliza una arquitectura de espacios de trabajo (*workspaces*):

```text
magnasoft/
├── apps/
│   └── desktop/       # Aplicación principal de escritorio (Vite + React + Electron)
├── supabase/          # Migraciones SQL, políticas de seguridad (RLS) y funciones RPC
├── docs/              # Documentación técnica del proyecto
└── package.json       # Configuración global del monorepo
```

## 💻 Desarrollo Local

### Requisitos Previos

*   [Node.js](https://nodejs.org/) (v20 o superior recomendado)
*   [pnpm](https://pnpm.io/) (Gestor de paquetes recomendado para este workspace)
*   Cuenta de [Supabase](https://supabase.com/) o instancia local ejecutándose.

### Guía de Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/JoelNaranjo20/magnasoft-pos.git
    cd magnasoft-pos
    ```

2.  **Instalar las dependencias:**
    ```bash
    pnpm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env.local` en la raíz del proyecto o dentro de `apps/desktop` con tus credenciales:
    ```env
    VITE_SUPABASE_URL=tu_supabase_url
    VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
    ```

### Comandos de Desarrollo (desde `apps/desktop`)

Para ejecutar la aplicación, navega a `apps/desktop` y usa los siguientes comandos:

*   `pnpm run dev`: Inicia el servidor de desarrollo Vite (entorno web en navegador).
*   `pnpm run electron:dev`: Inicia la aplicación en modo de escritorio con Electron, con recarga en caliente (Hot Reloading).
*   `pnpm run build`: Compila la aplicación React y Vite para producción.
*   `pnpm run electron:build`: Compila y empaqueta la aplicación completa como un ejecutable de escritorio usando `electron-builder`.

## 🛡️ Seguridad

La integridad y seguridad de la información está garantizada mediante las **Políticas de Seguridad a Nivel de Fila (Row Level Security - RLS)** de Supabase en PostgreSQL. Esto asegura que cada establecimiento o usuario final solo tenga acceso estricto a su propia data operativa, previniendo fugas de información.

## 📄 Licencia

Derechos reservados a [JoelNaranjo20](https://github.com/JoelNaranjo20). Este software es de naturaleza propietaria para operaciones comerciales.

---
*Desarrollado con pasión para transformar y modernizar la gestión administrativa.*
