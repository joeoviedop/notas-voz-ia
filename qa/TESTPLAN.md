# QA Test Plan — PRD Validation (MVP)

Objetivo
- Validar que el MVP cumple contrato, funciona E2E, resiste errores mínimos y rinde con parámetros base antes de exponer a usuarios o abrir features en paralelo.

Alcance
- Contratos (API ↔ OpenAPI/SDK)
- E2E (login → crear nota → upload → transcribir → resumir → checklist → buscar)
- Integración (auth middleware, colas STT/LLM)
- Performance (latencias clave, concurrencia básica)
- Resiliencia (reintentos, DLQ simulado, flujos de error visibles)
- Seguridad base (rate limiting, CORS, cookies, errores sin stack)
- Observabilidad (logs, health, métricas básicas)
- PWA/Accesibilidad (instalable, navegación teclado)

Cómo correr las suites
- Pre-requisitos: Node >= 20, pnpm >= 8
- Entorno rápido de desarrollo
  - cp .env.example .env
  - pnpm install
  - pnpm build

Suites automatizadas
1) Contratos (OpenAPI)
- Validación estática:
  - pnpm contracts:check
- Validación dinámica (Dredd contra servidor de mock o backend real):
  - Mock server (rápido): pnpm contracts:test
    - Levanta mocks en :5000 y ejecuta Dredd contra contracts/openapi.yaml
  - Backend real (opcional, staging): ver sección “Ejecución avanzada”

2) E2E (Playwright)
- Smoke feliz con MSW (rápido):
  - pnpm e2e:ci
  - Flujo: login (mock) → crear nota → upload (mock) → transcribir → resumir → checklist → buscar
- Reporte: artifacts HTML en CI (ver Actions → Job E2E)

3) Performance (autocannon) — smoke
- pnpm perf:smoke
- Escenarios:
  - GET /notes 20 rps 15s, extrae P95
  - GET /notes/:id (nota semilla) 20 rps 15s, extrae P95
- Reporte: JSON en artifacts de CI

Criterios de aceptación mínimos
- Smoke E2E (feliz) 100% verde
  1. Registro/Login → 200
  2. Crear nota → 201
  3. Upload audio (≤ 3 min) → 200 + status=uploaded (mock OK)
  4. POST /transcribe → 202 → status transcribing
  5. POST /summarize → 202 → status ready
  6. Ver TL;DR + bullets + ≥3 acciones
  7. Marcar 1 acción como hecha
  8. Buscar por palabra del transcript y por etiqueta
- Contrato:
  - Dredd verde contra openapi.yaml (mock o real)
- Performance (dataset chico ~200 notas):
  - GET /notes/:id P95 < 200 ms
  - Flujo audio→resumen (mock) < 120 s para audios ≤ 3 min
- Resiliencia (mock):
  - STT/LLM falla → 3 reintentos + “status=error” y botón Reintentar (UI)
- Seguridad:
  - Rate limit /auth 5/min/IP; cookies httpOnly SameSite=Lax; CORS solo FRONT_ORIGIN; errores sin stack
- PWA/A11y:
  - Instalable + navegación teclado básica

Matriz de pruebas (resumen)
- Contrato: Dredd contra /api/v1 (Auth, Notes, Upload, Processing, Actions)
- E2E (Playwright): Feliz + errores comunes (FILE_TOO_LARGE, MIME inválido, fallos STT/LLM), offline create/sync
- Integración backend: Colas arrancan, reintentos, DLQ (mock); auth middleware en rutas protegidas
- Performance: Ráfaga 20 rps GET /notes y GET /notes/:id; 10 uploads en paralelo (mock)
- Seguridad: CORS restringido, Helmet, rate-limit, validaciones Zod, mensajes genéricos en Auth
- Observabilidad: logs JSON con correlation-id; métricas básicas; GET /health cubre DB/redis/storage/colas

Datos de prueba
- Audios: 3 archivos cortos (~30–120s). En mocks/.fixtures hay guía para generar fakes.
- Usuarios: 2 cuentas semilla (A/B) — demo@example.com/password123 y test@example.com/password123 (mocks)
- Notas: 10 notas preseed para búsqueda y estados mezclados (mocks o seed backend)

Ejecución avanzada
- Backend real (local):
  - pnpm --filter backend start
  - pnpm --filter frontend build && pnpm --filter frontend start
  - export NEXT_PUBLIC_USE_MOCKS=false
  - Ejecutar: pnpm e2e
- Backend en staging:
  - Ajustar NEXT_PUBLIC_API_BASE a la URL de staging

Entregables
- /qa/TESTPLAN.md (este documento)
- /qa/TRIAGE.md (severidades/SLAs)
- /qa/REPORT.md (informe de validación Go/No-Go)
- Artefactos CI: HTML/JSON por suite + summary en pipeline

Severidades & SLAs (resumen)
- S1 (bloqueante): No se puede completar flujo feliz → reparar antes de release
- S2 (alta): Afecta >20% usuarios o pérdida de datos → fix < 48h
- S3 (media): Workaround disponible → fix < 7 días
- S4 (baja): Cosmético/edge → backlog
