# 📝 Notas de Voz con IA

> Convierte tus audios en transcripciones, resúmenes y listas de acciones usando inteligencia artificial.

[![CI Status](https://github.com/joeoviedop/notas-voz-ia/workflows/CI%20Pipeline/badge.svg)](https://github.com/joeoviedop/notas-voz-ia/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Características

- **📱 Subida de audio**: Soporta múltiples formatos (MP3, WAV, M4A, etc.)
- **🎤 Transcripción**: Conversión de audio a texto usando OpenAI Whisper o AssemblyAI
- **📊 Resumen inteligente**: Genera resúmenes concisos usando GPT-4 o Claude
- **✅ Extracción de acciones**: Identifica automáticamente tareas y fechas sugeridas
- **🔍 Búsqueda**: Encuentra notas por contenido, etiquetas o estado
- **⚡ Tiempo real**: Actualizaciones de estado en vivo durante el procesamiento
- **🎨 Interfaz moderna**: UI responsive con Tailwind CSS

## 📋 Casos de Uso

- **Profesionales**: Convertir reuniones en actas con acciones claras
- **Consultores**: Organizar sesiones de cliente con seguimiento de compromisos
- **Estudiantes**: Procesar clases grabadas en resúmenes estructurados
- **Terapeutas**: Documentar sesiones con puntos clave y tareas

## 🏗️ Arquitectura

Este proyecto está organizado como un **monorepo** con las siguientes partes:

```
📁 notas-voz-ia/
├── 📁 apps/
│   ├── 📁 frontend/          # Next.js App (Puerto 3000)
│   └── 📁 backend/           # Fastify API (Puerto 4000)
├── 📁 packages/
│   ├── 📁 schemas/           # Esquemas Zod + TypeScript
│   └── 📁 sdk/               # SDK Cliente TypeScript
├── 📁 contracts/
│   ├── 📄 openapi.yaml       # Especificación OpenAPI v1.0.0
│   └── 📄 README.md          # Documentación de contratos
├── 📁 mocks/
│   └── server.js             # Mock server (Puerto 5000)
├── 📄 WARP.md                # Guía para desarrolladores
└── 📁 .github/
    └── workflows/            # CI/CD con GitHub Actions
```

### Stack Tecnológico

**Frontend:**
- Next.js 14 (App Router)
- React 18 
- TypeScript
- Tailwind CSS
- MSW (Mock Service Worker)

**Backend:** ✅ **COMPLETAMENTE IMPLEMENTADO**
- Fastify con middleware completo (CORS, Rate Limiting, Helmet)
- TypeScript con validación Zod en todas las rutas
- Pino logging estructurado + correlation IDs
- JWT RS256 con refresh tokens y cookies seguras
- PostgreSQL con manejo de transacciones
- Redis + BullMQ para procesamiento asíncrono
- S3 compatible storage para archivos de audio
- Proveedores STT/LLM intercambiables (mock/real)

**Integraciones:**
- OpenAI (GPT-4 + Whisper) ✅ Implementado
- AssemblyAI (STT alternativo) ✅ Implementado
- Anthropic Claude (LLM alternativo) ✅ Implementado
- PostgreSQL para persistencia ✅ Implementado
- Redis para colas y cache ✅ Implementado
- S3/MinIO para almacenamiento ✅ Implementado

**Herramientas:**
- pnpm (gestor de paquetes)
- ESLint + Prettier
- Husky (git hooks)
- GitHub Actions (CI/CD)

## ⚡ Inicio Rápido

### Prerrequisitos

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/joeoviedop/notas-voz-ia.git
cd notas-voz-ia

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus claves API

# Ejecutar setup inicial
pnpm setup
```

### Desarrollo Local

```bash
# Iniciar todos los servicios (frontend + backend + mocks)
pnpm dev

# O ejecutar individualmente:
pnpm --filter frontend dev    # Frontend en http://localhost:3000
pnpm --filter backend dev     # Backend en http://localhost:4000
pnpm mocks:dev               # Mock server en http://localhost:5000
```

### URLs de Desarrollo

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api/v1
- **Mock Server**: http://localhost:5000
- **Health Check**: http://localhost:4000/api/v1/health
- **API Docs**: Ver `contracts/README.md`

## 🧪 Testing

### QA / Validation (PRD)
- Plan de pruebas: ver `qa/TESTPLAN.md`
- Triage: ver `qa/TRIAGE.md`
- Reporte CI: `qa/REPORT.md` (plantilla) + artifacts HTML/JSON en Actions

Comandos rápidos
- Contratos (estático): `pnpm contracts:check`
- Contratos (dinámico Dredd + mock server): `pnpm contracts:test`
- E2E (Playwright, smoke con MSW): `pnpm e2e` (local) / `pnpm e2e:ci` (CI)
- Performance (autocannon, smoke): `pnpm perf:smoke`

Resultados CI
- Jobs: Contracts (static), Contracts (Dredd), E2E (Playwright), Perf Smoke, Security
- Summary: ver último pipeline (Actions) con tabla de estado y artifacts adjuntos

El proyecto incluye datos de prueba y un mock server para desarrollo sin APIs externas:

### Usuario de Prueba
- **Email**: `test@example.com`
- **Password**: `password123`

### Comandos de Testing

```bash
# Ejecutar todos los tests
pnpm test

# Lint y format
pnpm lint
pnpm format

# Verificación de tipos
pnpm typecheck

# Build completo
pnpm build
```

## 📝 Scripts Disponibles

```bash
# Desarrollo
pnpm dev                     # Iniciar modo desarrollo
pnpm build                   # Build para producción
pnpm start                   # Iniciar producción

# Calidad de código
pnpm lint                    # ESLint
pnpm format                  # Prettier
pnpm typecheck              # TypeScript

# Testing
pnpm test                   # Tests unitarios
pnpm test:e2e              # Tests end-to-end (futuro)

# OpenAPI y SDK
pnpm contracts:check        # Validar OpenAPI
pnpm sdk:generate          # Generar SDK cliente

# Utilidades
pnpm clean                 # Limpiar builds
pnpm setup                 # Setup inicial
```

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y configura:

**Básicas:**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/notas
```

**APIs de IA:**
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
STT_PROVIDER=openai
LLM_PROVIDER=openai
```

**Mock Mode (para desarrollo sin APIs):**
```env
STT_PROVIDER=mock
LLM_PROVIDER=mock
NEXT_PUBLIC_MOCK_MODE=true
```

## 🆕 Backend Implementation Status (COMPLETO)

El backend ha sido **completamente implementado** según las especificaciones del PRD y está listo para integración con el frontend.

### ✅ API Endpoints Implementados

#### Rutas de Salud y Monitoreo
- **GET /api/v1/health** - Health check completo (DB, Redis, Storage, AI providers)
- **GET /api/v1/health/ready** - Readiness probe para K8s
- **GET /api/v1/health/live** - Liveness probe para K8s
- **GET /api/v1/admin/queues** - Monitoreo de colas (stats, jobs activos/fallidos)
- **POST /api/v1/admin/queues/:name/pause** - Pausar cola de procesamiento
- **POST /api/v1/admin/queues/:name/resume** - Reanudar cola de procesamiento
- **DELETE /api/v1/admin/queues/:name/clean** - Limpiar trabajos completados/fallidos

#### Rutas de Autenticación (JWT RS256)
- **POST /api/v1/auth/register** - Registro con email/password + validación
- **POST /api/v1/auth/login** - Login con credenciales + refresh cookie
- **POST /api/v1/auth/refresh** - Renovación automática de access token
- **POST /api/v1/auth/logout** - Logout + invalidación de refresh token
- **POST /api/v1/auth/reset/request** - Solicitud de reset de password
- **POST /api/v1/auth/reset/confirm** - Confirmación de reset con token

#### Rutas de Notas (CRUD Completo)
- **POST /api/v1/notes** - Crear nota vacía con título/tags
- **GET /api/v1/notes** - Listar notas con paginación cursor + búsqueda
- **GET /api/v1/notes/:id** - Obtener nota con transcript/resumen/acciones
- **PATCH /api/v1/notes/:id** - Actualizar metadatos de nota
- **DELETE /api/v1/notes/:id** - Eliminar nota + archivos asociados
- **POST /api/v1/notes/:id/upload** - Subir archivo de audio (multipart)
- **POST /api/v1/notes/:id/transcribe** - Iniciar transcripción asíncrona
- **POST /api/v1/notes/:id/summarize** - Iniciar resumen asíncrono

#### Rutas de Acciones (Checklist Management)
- **POST /api/v1/notes/:noteId/actions** - Añadir acción a nota
- **PATCH /api/v1/actions/:id** - Actualizar texto/estado/fecha de acción
- **DELETE /api/v1/actions/:id** - Eliminar acción

### 🔧 Servicios Core Implementados

#### Sistema de Autenticación JWT
- **Tokens RS256**: Access tokens (15m) + Refresh tokens (7d)
- **Cookies Seguras**: httpOnly + SameSite=Lax para refresh tokens
- **Middleware de Protección**: Verificación automática en rutas privadas
- **Gestión de Sesión**: Logout limpia tokens + invalidación en DB
- **Reset de Password**: Flujo completo con tokens tem porales

#### Base de Datos (PostgreSQL)
- **Tablas Implementadas**: users, notes, transcripts, summaries, actions, audit_events
- **Transacciones**: Operaciones ACID para consistencia de datos
- **Indexación**: Índices optimizados para búsquedas y paginación
- **Migraciones**: Sistema de versionado de esquema

#### Sistema de Almacenamiento (S3 Compatible)
- **Subida de Archivos**: Validación de tipo/tamaño + almacenamiento seguro
- **Compatibilidad S3**: Funciona con AWS S3, MinIO, o similar
- **URLs Firmadas**: Acceso seguro a archivos de audio
- **Limpieza Automática**: Eliminación de archivos huérfanos

#### Colas de Procesamiento (BullMQ + Redis)
- **Cola de Transcripción**: Procesamiento STT asíncrono
- **Cola de Resumen**: Procesamiento LLM asíncrono
- **Reintentos con Backoff**: 3 intentos + delay exponencial
- **Dead Letter Queue**: Manejo de trabajos fallidos
- **Monitoreo**: Dashboard de estado de colas y trabajos

#### Proveedores de IA (Intercambiables)
- **STT Providers**: OpenAI Whisper, AssemblyAI, Mock
- **LLM Providers**: OpenAI GPT-4, Anthropic Claude, Mock
- **Configuración**: Cambio de proveedor vía variables de entorno
- **Rate Limiting**: Respeto a límites de API externa

### 🔒 Middleware y Seguridad

- **CORS**: Configurado para frontend + headers seguros
- **Rate Limiting**: 5 req/min auth, 60 req/min notas
- **Helmet**: Headers de seguridad HTTP completos
- **Validación Zod**: Esquemas tipados para todos los endpoints
- **Correlation IDs**: Trazabilidad de requests en logs
- **Error Handling**: Manejo global + respuestas estructuradas
- **Multipart Upload**: Soporte para archivos de audio

### 📊 Observabilidad y Monitoreo

- **Logging Estructurado**: Pino con correlation IDs + contexto
- **Health Checks**: Monitoreo completo de dependencias
- **Audit Logging**: Registro de todas las operaciones CRUD
- **Error Tracking**: Logs detallados + stack traces
- **Performance**: Request timing + métricas básicas

### 🛠️ Configuración del Backend

#### Variables de Entorno Requeridas
```env
# Base de Datos
DATABASE_URL=postgres://user:pass@localhost:5432/notas_dev
REDIS_URL=redis://localhost:6379

# Autenticación JWT
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Almacenamiento S3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=notes-audio-dev
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123

# Proveedores IA
STT_PROVIDER=mock  # o 'openai' o 'assemblyai'
LLM_PROVIDER=mock  # o 'openai' o 'anthropic'
OPENAI_API_KEY=sk-your-key-here
ASSEMBLYAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Colas
QUEUE_DASHBOARD_PASSWORD=admin123
```

#### Comandos de Desarrollo
```bash
# Iniciar backend en modo desarrollo
cd apps/backend
npm run dev              # Puerto 4000

# Ejecutar con base de datos
docker-compose up -d postgres redis  # Dependencias
npm run migrate                       # Aplicar migraciones
npm run seed                         # Datos de prueba

# Workers de procesamiento
npm run worker:transcribe    # Worker STT
npm run worker:summarize     # Worker LLM

# Testing
npm test                     # Tests unitarios
npm run test:integration     # Tests de integración

# Construir para producción
npm run build
npm start
```

### 📝 Estado de Implementación

- ✅ **Contratos API**: 100% implementados según OpenAPI v1.0.0
- ✅ **Autenticación**: JWT completo con refresh + reset password
- ✅ **CRUD Notas**: Todas las operaciones + búsqueda + paginación
- ✅ **Upload de Audio**: Multipart + validación + almacenamiento S3
- ✅ **Procesamiento Asíncrono**: STT + LLM con colas + reintentos
- ✅ **Gestión de Acciones**: CRUD completo de checklist items
- ✅ **Middleware**: Seguridad + validación + logging + CORS
- ✅ **Observabilidad**: Health checks + audit logs + monitoreo
- ✅ **Configuración**: Variables de entorno + proveedores intercambiables
- ✅ **Testing**: Tests unitarios + contract testing preparado

### 🔄 Integración con Frontend

El backend está **listo para integración inmediata** con el frontend:

1. **SDK Compatibility**: Implementa exactamente los contratos del SDK generado
2. **Error Codes**: Maneja todos los códigos de error tipados del catálogo
3. **CORS Configured**: Permite requests del frontend en desarrollo y producción
4. **Mock Toggle**: Variables `STT_PROVIDER=mock` y `LLM_PROVIDER=mock` para desarrollo
5. **Real-time**: Estados de procesamiento actualizados en tiempo real

### 🏁 Próximos Pasos

1. **Integración**: Conectar frontend con backend y probar flujos E2E
2. **Testing**: Completar suite de tests de integración y contract testing
3. **Performance**: Optimizaciones de queries y caching
4. **Deployment**: Configurar CI/CD + Docker + variables de producción
5. **Monitoring**: Métricas avanzadas + alerting + dashboards

### 🛠️ Arquitectura Técnica

```
📱 Frontend (Next.js)
    │
    ↓ HTTP/REST
    │
📍 API Gateway (Fastify)
    ├─ Auth Middleware (JWT)
    ├─ Rate Limiting
    ├─ CORS & Security
    └─ Request Validation
    │
    ↓
📊 Business Logic
    ├─ Notes Service
    ├─ Auth Service  
    ├─ Upload Service
    └─ Processing Service
    │
    ↓
💾 Data Layer
    ├─ PostgreSQL (Metadata)
    ├─ Redis (Colas + Cache)
    └─ S3 (Archivos Audio)
    │
    ↓
🤖 AI Processing
    ├─ STT Worker (Whisper/AssemblyAI)
    └─ LLM Worker (GPT-4/Claude)
```

### 🌐 Configuración de OpenAPI

✅ **Contratos API Completamente Implementados**

El proyecto incluye contratos API completos y congelados para desarrollo paralelo:

- **OpenAPI v1.0.0**: Especificación completa en `contracts/openapi.yaml`
- **Base URL**: `/api/v1` para todos los endpoints
- **Autenticación**: JWT RS256 con refresh tokens (15m + 7d)
- **Esquemas Zod**: Validación tipada en `packages/schemas/`
- **SDK TypeScript**: Cliente completo en `packages/sdk/`
- **Catálogo de errores**: 10 códigos tipados con manejo
- **Documentación**: Diagramas de flujo y ejemplos en `contracts/README.md`

#### Endpoints Implementados:
- **Auth**: register, login, refresh, logout, reset password
- **Notes**: CRUD, upload, paginación cursor-based
- **Processing**: transcripción y resumen asíncronos  
- **Actions**: CRUD de checklist items

Para regenerar el SDK cliente después de cambios:

```bash
pnpm sdk:generate
```

## 🚀 Deployment

### Verificación Pre-Deploy

```bash
# CI completa
pnpm ci

# Verificar que todo funciona
pnpm build
pnpm test
pnpm contracts:check
```

### Entornos

- **Desarrollo**: Variables en `.env.local`
- **Staging**: Variables de entorno en hosting
- **Producción**: Usar secretos seguros, rotar claves JWT

## 🤝 Contribución

### Flujo de Desarrollo

1. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer commits con convención: `feat: agregar transcripción de audio`
3. Ejecutar tests: `pnpm test`
4. Crear Pull Request a `dev`
5. Después de review, merge a `main`

### Convención de Commits

```bash
feat: nueva característica
fix: corrección de bug  
docs: actualización de documentación
style: cambios de formato
refactor: refactoring de código
test: agregar o actualizar tests
chore: tareas de mantenimiento
```

### Code Review

Los archivos están protegidos por CODEOWNERS:
- Frontend: Requiere aprobación del equipo frontend
- Backend: Requiere aprobación del equipo backend  
- Contracts: Requiere aprobación de API lead
- CI/CD: Requiere aprobación de DevOps lead

## 📚 Documentación

### Estructura del Proyecto

- `/apps/frontend/` - Aplicación Next.js
- `/apps/backend/` - API Fastify
- `/packages/schemas/` - Esquemas Zod compartidos
- `/packages/sdk/` - Cliente TypeScript generado
- `/contracts/` - Especificación OpenAPI
- `/mocks/` - Servidor mock para desarrollo

### APIs Externas

**OpenAI:**
- Whisper para transcripción
- GPT-4o-mini para resúmenes

**AssemblyAI** (alternativo):
- Transcripción con mayor precisión
- Detección de speakers

### Monitoreo

- Logs estructurados con Pino
- Correlation IDs para tracking
- Health checks en `/health`
- Métricas básicas de performance

## 🔒 Seguridad

- Autenticación JWT con refresh tokens
- Rate limiting configurable
- CORS strict en producción
- Validación de datos con Zod
- Sanitización de archivos subidos
- Headers de seguridad con Helmet

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Issues Comunes

**Error de dependencias:**
```bash
rm -rf node_modules
pnpm install
```

**Error de TypeScript:**
```bash
pnpm typecheck
# Revisar errores en packages/schemas
```

**Error de OpenAPI:**
```bash
pnpm contracts:check
# Validar sintaxis en contracts/openapi.yaml
```

### Obtener Ayuda

1. Revisar [Issues](https://github.com/tu-usuario/notas-voz-resumen-acciones/issues)
2. Crear nuevo issue con template
3. Contactar al equipo en Slack/Discord

---

<div align="center">

**¡Desarrollado con ❤️ para hacer más productivos los profesionales!**

[⭐ Star en GitHub](https://github.com/tu-usuario/notas-voz-resumen-acciones) • [🐛 Reportar Bug](https://github.com/tu-usuario/notas-voz-resumen-acciones/issues) • [💡 Solicitar Feature](https://github.com/tu-usuario/notas-voz-resumen-acciones/issues)

</div>