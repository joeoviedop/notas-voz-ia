# Frontend - Notas de Voz

Frontend de la aplicación para convertir audios en transcripciones, resúmenes y acciones.

## 🚀 Características Principales

- ✅ **Autenticación completa** - Login, registro, protección de rutas
- ✅ **Dashboard interactivo** - Visualización de notas con filtros y búsqueda
- ✅ **Creación de notas** - Subida de archivos y grabación de audio
- ✅ **Gestión de acciones** - Checklist CRUD de tareas derivadas
- ✅ **PWA configurada** - Funcionalidad offline y instalable
- ✅ **Mocks integrados** - MSW para desarrollo independiente
- ✅ **Tests completos** - Unitarios e integración implementados
- ✅ **Accesibilidad** - ARIA labels, roles semánticos, navegación por teclado

## 🛠️ Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios responsivos
- **React Query** - Gestión de estado del servidor y caché
- **React Hook Form + Zod** - Formularios con validación
- **React Hot Toast** - Notificaciones elegantes
- **Lucide React** - Iconos consistentes
- **MSW** - Mocks para desarrollo
- **Jest + Testing Library** - Testing unitario e integración
- **SDK autogenerado** - Cliente TypeScript desde OpenAPI

## 📂 Estructura del Proyecto

```
src/
├── components/
│   ├── ActionChecklist.tsx    # Gestión de acciones/tareas
│   ├── AudioRecorder.tsx       # Grabador de audio con controles
│   ├── Chip.tsx                # Estado visual de notas
│   ├── FileUpload.tsx          # Subida de archivos con validación
│   ├── NoteCard.tsx           # Tarjeta de vista previa de nota
│   └── Search.tsx             # Búsqueda con filtros y debounce
├── hooks/
│   ├── useAudioRecorder.ts    # Lógica de grabación de audio
│   ├── useNotes.ts            # Queries y mutaciones de notas
│   └── useServiceWorker.ts    # Gestión del service worker
├── pages/
│   ├── auth/                  # Login y registro
│   ├── dashboard.tsx          # Dashboard principal
│   ├── notes/
│   │   ├── [id].tsx          # Detalle y edición de nota
│   │   └── create.tsx        # Creación de nueva nota
│   ├── offline.tsx           # Página offline para PWA
│   └── _app.tsx              # App principal con providers
├── providers/
│   ├── AuthProvider.tsx      # Context de autenticación
│   ├── MSWProvider.tsx       # Provider de mocks
│   └── ServiceWorkerProvider.tsx # Context del service worker
├── lib/
│   ├── auth.ts               # Utilidades de autenticación
│   ├── errors.ts             # Catálogo de errores
│   └── utils.ts              # Utilidades generales
└── __tests__/                # Tests unitarios e integración
    ├── components/           # Tests de componentes
    ├── hooks/                # Tests de hooks
    ├── integration/          # Tests de flujos completos
    └── utils/                # Utilidades de testing
```

## 🏃‍♂️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo en puerto 3000

# Build y producción
npm run build            # Build optimizado para producción
npm start                # Servidor de producción

# Calidad de código
npm run lint             # ESLint + corrección automática
npm run format           # Prettier para formateo
npm run typecheck        # Verificación de tipos TypeScript

# Testing
npm test                 # Ejecutar todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con reporte de cobertura

# Utilidades
npm run clean            # Limpiar archivos build
```

## 🚀 Inicio Rápido

1. **Instalar dependencias** (desde el root del monorepo):
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   ```

3. **Iniciar desarrollo**:
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador**: `http://localhost:3000`

## 🔧 Configuración

### Variables de Entorno

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1

# Development
NEXT_PUBLIC_ENABLE_MOCKS=true
```

### Credenciales de Desarrollo

Con mocks habilitados, usa estas credenciales:
- **Email**: `demo@example.com`
- **Password**: `password123`

## 🏗️ Arquitectura y Patrones

### Gestión de Estado
- **React Query**: Para estado del servidor (notas, usuarios, acciones)
- **Context API**: Para estado global de autenticación y PWA
- **React Hook Form**: Para estado de formularios
- **useState**: Para estado local de componentes

### Autenticación
- **JWT Tokens**: Access token + refresh token
- **Almacenamiento**: localStorage con caché automático
- **Protección**: HOCs y middleware para rutas privadas
- **Renovación**: Refresh automático de tokens expirados

### PWA (Progressive Web App)
- **Service Worker**: Caché de recursos estáticos y offline
- **Manifest**: Configuración para instalación
- **Offline**: Página y funcionalidad sin conexión
- **Notificaciones**: Soporte para push notifications

### Accesibilidad
- **ARIA**: Labels, roles, y live regions
- **Navegación**: Soporte completo de teclado
- **Contraste**: Colores accesibles en todos los estados
- **Screen readers**: Compatibilidad completa

## 🧪 Testing

### Cobertura Implementada
- ✅ **Componentes UI**: Tests unitarios con diferentes props y estados
- ✅ **Hooks personalizados**: Lógica de negocio y efectos secundarios
- ✅ **Flujos de usuario**: Autenticación, CRUD de notas, navegación
- ✅ **Manejo de errores**: Validaciones y errores de API
- ✅ **Accesibilidad**: Atributos ARIA y usabilidad

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Test específico
npx jest components/__tests__/Chip.test.tsx

# Con cobertura
npm run test:coverage
```

## 📱 Funcionalidades Implementadas

### Autenticación
- [x] Registro de usuarios con validación
- [x] Login con remember me
- [x] Logout y limpieza de sesión
- [x] Protección de rutas privadas
- [x] Refresh automático de tokens

### Dashboard
- [x] Lista de notas con paginación
- [x] Búsqueda en tiempo real con debounce
- [x] Filtros por estado (todas, completadas, pendientes)
- [x] Estadísticas resumidas
- [x] Navegación rápida a crear/editar

### Gestión de Notas
- [x] Creación por subida de archivo
- [x] Creación por grabación de audio
- [x] Visualización de transcript y resumen
- [x] Edición de contenido
- [x] Estados de procesamiento

### Acciones/Tareas
- [x] Checklist derivado de notas
- [x] Crear, editar, eliminar acciones
- [x] Marcar como completadas
- [x] Persistencia automática

### PWA y Offline
- [x] Instalable en dispositivos
- [x] Funcionalidad offline básica
- [x] Caché de recursos estáticos
- [x] Indicadores de estado de conexión

## 🔧 Desarrollo

### Agregar Nueva Página
1. Crear archivo en `pages/`
2. Configurar layout y metadatos
3. Implementar lógica con hooks
4. Agregar tests de integración

### Nuevo Componente
1. Crear en `components/` con TypeScript
2. Implementar con accesibilidad
3. Agregar tests unitarios
4. Documentar props en JSDoc

### Nuevo Hook
1. Crear en `hooks/` con tipado
2. Implementar con React Query si hay API
3. Agregar tests unitarios
4. Manejar estados de loading/error

## 🚀 Próximas Mejoras

- [ ] Tests E2E con Playwright
- [ ] Optimización de bundle size
- [ ] Internacionalización (i18n)
- [ ] Modo oscuro
- [ ] Sincronización real-time
- [ ] Push notifications
- [ ] Búsqueda avanzada con filtros
- [ ] Exportación de notas