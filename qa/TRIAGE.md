# TRIAGE — Severidades y SLAs

Severidades
- S1 (Bloqueante):
  - No se puede completar el flujo feliz (login → upload → transcribir → resumir → checklist → buscar)
  - Impacto crítico o caída total
  - Acción: Reparar antes de release. Go/No-Go = NO.
- S2 (Alta):
  - Afecta a >20% de usuarios o pérdida de datos
  - Acción: Corregir en < 48 horas
- S3 (Media):
  - Existe workaround razonable
  - Acción: Corregir en < 7 días
- S4 (Baja):
  - Cosmético o edge case
  - Acción: Backlog y priorización futura

Clasificación rápida
- Seguridad: tokens/cookies/vulnerabilidades → al menos S2, S1 si comprometedor
- Pérdida de datos: S1–S2 según alcance
- Interrupción funcional: S1 si bloquea core; S2 si perimetral
- Degradación de performance: S2 si P95 incumple consistentemente; S3 si puntual

SLA de respuesta
- S1: Acknowledge inmediata, fix en rama hotfix, validación y despliegue priorizado
- S2: Plan de corrección en < 8h, fix en < 48h
- S3: Triage semanal, fix < 7 días
- S4: Programar en backlog, reevaluar trimestralmente

Proceso
1) Abrir issue con template (Impacto, Repro, Logs, Evidencia)
2) Asignar severidad conforme a guía
3) Marcar etiquetas: area(frontend|backend|contracts|auth|infra), tipo(bug|perf|security), severidad(S1..S4)
4) Vincular a PR(s) y a reporte (/qa/REPORT.md)
5) Cerrar con validación de QA y enlaces a CI/artefactos
