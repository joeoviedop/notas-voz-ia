# QA Validation Report (MVP)

Estado general
- Fecha: {{DATE}}
- Branch/commit: {{BRANCH}} / {{COMMIT_SHA}}
- Entorno: CI (GitHub Actions)

Resumen de suites
- Contracts (OpenAPI): {{CONTRACTS_STATUS}} — ver artifacts
- E2E (Playwright): {{E2E_STATUS}} — ver artifacts HTML
- Performance (autocannon): {{PERF_STATUS}} — ver JSON

Criterios de aceptación
- E2E feliz: {{E2E_HAPPY_OK}}
- Contrato: {{CONTRACTS_OK}}
- Performance P95: {{PERF_P95_OK}}
- Resiliencia (mocks): {{RESILIENCE_OK}}
- Seguridad base: {{SECURITY_OK}}
- PWA/A11y: {{PWA_A11Y_OK}}

Hallazgos
- S1: 
- S2: 
- S3: 
- S4: 

Recomendación Go/No-Go
- {{GO_NO_GO}}

Notas
- Este archivo se actualiza manualmente o con resultados de CI. Ver Actions para reportes detallados.
