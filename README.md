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

**Backend:**
- Fastify
- TypeScript
- Pino (logging)
- Zod (validación)

**Integraciones:**
- OpenAI (GPT-4 + Whisper)
- AssemblyAI (STT alternativo)
- Anthropic Claude (LLM alternativo)

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

### Configuración de OpenAPI

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