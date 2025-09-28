# QA Tooling Change Log

Date: 2025-09-28
Scope: PRD Validation — test harness additions (dev-only)

Added dev dependencies (root)
- @playwright/test: ^1.48.2 — E2E browser automation and HTML report
- autocannon: ^7.15.0 — HTTP performance smoke tests
- concurrently: ^9.1.0 — Run multiple services in CI for E2E
- start-server-and-test: ^2.0.8 — Orchestrate server startup and tests in CI

Scripts added (root package.json)
- contracts:test — Dredd against mock server with JSON report → qa/artifacts/contracts-report.json
- e2e / e2e:ci — Playwright smoke with HTML report → qa/artifacts/e2e-report
- perf:smoke — Autocannon smoke with JSON report → qa/artifacts/perf-smoke.json

Notes
- No production dependencies changed.
- Health route aligned to OpenAPI base path (/api/v1/health) to satisfy contract.
