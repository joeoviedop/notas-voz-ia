# Backend API - Notas de Voz con IA

Backend completo implementado en **Fastify + TypeScript** siguiendo las especificaciones del PRD Backend. Esta API proporciona todas las funcionalidades necesarias para el manejo de notas de voz, transcripción con STT, generación de resúmenes con LLM, y gestión de acciones.

## 🚀 Características Implementadas

### ✅ Completado

- **Autenticación JWT RS256** con access/refresh tokens
- **Base de datos Prisma** con PostgreSQL (esquema completo)
- **Almacenamiento S3-compatible** para archivos de audio
- **Proveedores de IA**:
  - STT: Mock, OpenAI Whisper, AssemblyAI
  - LLM: Mock, OpenAI GPT, Anthropic Claude
- **Sistema de colas BullMQ** con Redis para procesamiento asíncrono
- **Workers** para transcripción y resumen
- **Observabilidad** con logs estructurados y correlation IDs
- **Esquemas de validación** con Zod (compartidos)
- **Seguridad** básica (CORS, helmet, rate limiting)

### 🚧 Por Implementar

- **Todas las rutas API** del OpenAPI spec
- **Middleware de validación** completo
- **Health checks** avanzados
- **Tests** (unit, integration, contract)
- **Configuración CI/CD**

## 📋 Requisitos

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **Redis** >= 6.x (para colas)
- **S3-compatible storage** (AWS S3, MinIO, etc.)

## 🛠️ Configuración de Desarrollo

### 1. Instalación

```bash
# Desde la raíz del monorepo
pnpm install

# O desde el directorio backend
cd apps/backend
pnpm install
```

### 2. Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

**Variables críticas:**

```env
# Base de datos
DATABASE_URL=postgres://user:password@localhost:5432/notas_voz_dev

# Redis para colas
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Storage S3-compatible
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=notas-audio
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123

# Proveedores de IA (opcionales para desarrollo)
STT_PROVIDER=mock
LLM_PROVIDER=mock
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
ASSEMBLYAI_API_KEY=your-key-here
```

### 3. Servicios Locales con Docker

```bash
# PostgreSQL + Redis + MinIO
docker compose up -d postgres redis minio

# O individualmente:
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
docker run -d --name redis -p 6379:6379 redis:7-alpine
docker run -d --name minio -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

### 4. Base de Datos

```bash
# Generar cliente Prisma
pnpm db:generate

# Aplicar migraciones
pnpm db:migrate

# Poblar con datos de ejemplo
pnpm db:seed
```

### 5. Ejecutar en Desarrollo

```bash
# Servidor API
pnpm dev

# Workers en paralelo (terminal separado)
pnpm dev:workers

# O ambos con concurrently:
pnpm dev:all
```

## 🏗️ Arquitectura

### Estructura de Directorios

```
src/
├── middleware/          # Auth, validación, logging
│   └── auth.middleware.ts
├── routes/             # Endpoints API (TODO: implementar todas)
│   ├── auth.ts
│   ├── health.ts
│   └── notes.ts
├── services/           # Lógica de negocio
│   ├── auth.service.ts
│   ├── storage.service.ts
│   ├── queue.service.ts
│   ├── stt/           # Proveedores STT
│   └── llm/           # Proveedores LLM
├── workers/            # Procesadores de cola
│   └── index.ts
├── scripts/           # Utilidades (seed, etc.)
└── index.ts           # Servidor principal
```

### Base de Datos (Prisma)

**Entidades principales:**
- `User` - Usuarios con auth
- `Note` - Notas de voz con estados
- `Media` - Archivos de audio
- `Transcript` - Transcripciones STT
- `Summary` - Resúmenes LLM
- `Action` - Tareas extraídas
- `ProcessingJob` - Jobs de cola
- `AuditEvent` - Auditoría

### Flujo de Procesamiento

```mermaid
graph LR
    A[Upload Audio] --> B[Note: uploaded]
    B --> C[Queue Transcribe]
    C --> D[STT Processing]
    D --> E[Note: transcribing]
    E --> F[Save Transcript]
    F --> G[Queue Summarize]
    G --> H[LLM Processing]
    H --> I[Save Summary + Actions]
    I --> J[Note: ready]
```

## 🔧 Proveedores de IA

### STT (Speech-to-Text)

**Mock Provider** (desarrollo):
```env
STT_PROVIDER=mock
```

**OpenAI Whisper**:
```env
STT_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_STT_MODEL=whisper-1
```

**AssemblyAI**:
```env
STT_PROVIDER=assemblyai
ASSEMBLYAI_API_KEY=your-key
```

### LLM (Resúmenes)

**Mock Provider** (desarrollo):
```env
LLM_PROVIDER=mock
```

**OpenAI GPT**:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
```

**Anthropic Claude**:
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

## 📊 Monitoreo

### Health Checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/detailed
```

### Workers Health

```bash
# Verificar estado de workers
pnpm --filter @notas-voz/backend start:workers -- --health
```

### Queue Dashboard

Con Redis instalado, puedes usar herramientas como:
- Bull Dashboard
- BullMQ Arena
- RedisInsight

## 🧪 Testing

### Unit Tests

```bash
# Ejecutar tests
pnpm test

# Con coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Contract Tests

```bash
# Tests contra OpenAPI spec
pnpm test:contract
```

### Integration Tests

```bash
# Con base de datos de test
TEST_DATABASE_URL=postgres://... pnpm test:integration
```

## 🚢 Despliegue

### Variables de Producción

**Obligatorias:**
- `NODE_ENV=production`
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` o `REDIS_HOST/PORT/PASSWORD`
- `STORAGE_*` configuración
- `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` (RS256)

**Recomendadas:**
- `SENTRY_DSN` (monitoreo de errores)
- Proveedores de IA reales (`OPENAI_API_KEY`, etc.)

### Docker

```dockerfile
# Dockerfile incluido en el proyecto
docker build -t notas-backend .
docker run -p 4000:4000 notas-backend
```

### Proceso de Workers

Los workers **deben ejecutarse por separado** en producción:

```bash
# Servidor API
node dist/index.js

# Workers (proceso separado)
node dist/workers/index.js
```

## 🔍 Debugging

### Logs Estructurados

```bash
# Nivel debug
LOG_LEVEL=debug pnpm dev

# Formato JSON
LOG_FORMAT=json pnpm dev
```

### Correlation IDs

Todos los requests incluyen `x-correlation-id` para trazabilidad.

### Queue Monitoring

```bash
# Estado de colas
curl http://localhost:4000/admin/queues

# Jobs fallidos
curl http://localhost:4000/admin/queues/transcribe/failed
```

## 🛡️ Seguridad

### JWT RS256

- Access tokens: **15 minutos**
- Refresh tokens: **7 días** (httpOnly cookies)
- Claves RSA auto-generadas en desarrollo

### Rate Limiting

- Global: 100 req/min (dev: 1000)
- Por usuario: configurable via middleware

### CORS

Configurado desde `CORS_ORIGIN` o automático en desarrollo.

### Validación

Todas las entradas validadas con **Zod** usando esquemas compartidos.

## 📈 Performance

### Métricas Clave

- P95 `GET /notes/:id` < 200ms
- Transcripción: ~2-10min (según proveedor)
- Resumen: ~10-30s (según proveedor)

### Optimizaciones

- Conexión pool PostgreSQL
- Cache Redis para sesiones
- Compresión de archivos
- Pagination cursor-based

## 🆘 Solución de Problemas

### Error: "Storage credentials not configured"

```bash
# Verificar variables de storage
echo $STORAGE_ACCESS_KEY
echo $STORAGE_SECRET_KEY
```

### Error: "Redis connection failed"

```bash
# Verificar Redis
docker ps | grep redis
redis-cli ping
```

### Error: "Database connection failed"

```bash
# Verificar PostgreSQL
psql $DATABASE_URL -c "SELECT 1"
```

### Workers no procesan jobs

```bash
# Verificar workers están corriendo
ps aux | grep workers

# Ver logs de workers
tail -f logs/workers.log
```

## 📚 API Endpoints

### Implementados

- `GET /health` - Health check básico
- `GET /health/detailed` - Health check completo
- `POST /auth/login` - Login (mock)
- `POST /auth/register` - Registro (mock)

### Por Implementar (según OpenAPI)

- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Cerrar sesión
- `POST /auth/reset/request` - Solicitar reset
- `POST /auth/reset/confirm` - Confirmar reset
- `GET /notes` - Listar notas con paginación
- `POST /notes` - Crear nota
- `GET /notes/:id` - Obtener nota
- `PATCH /notes/:id` - Actualizar nota
- `DELETE /notes/:id` - Eliminar nota
- `POST /notes/:id/upload` - Subir audio
- `POST /notes/:id/transcribe` - Iniciar transcripción
- `POST /notes/:id/summarize` - Iniciar resumen
- `POST /notes/:id/actions` - Crear acción
- `PATCH /actions/:id` - Actualizar acción
- `DELETE /actions/:id` - Eliminar acción

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crear branch** para feature: `git checkout -b feature/nueva-funcionalidad`
3. **Implementar** siguiendo las convenciones del proyecto
4. **Tests** unitarios y de integración
5. **Pull Request** con descripción detallada

## 📄 Licencia

MIT - Ver `LICENSE` file para detalles.

---

## 📞 Soporte

Para dudas o issues:

1. **GitHub Issues** para bugs/features
2. **Documentación** en `/docs`
3. **Health checks** para status del servicio
4. **Logs** estructurados para debugging

**Próximos pasos**: Implementar todas las rutas API del OpenAPI spec y completar los tests de integración.