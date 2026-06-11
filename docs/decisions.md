# Decisiones de producto y técnicas (sección 40 de la spec)

Cerradas el 2026-06-11 con la usuaria. Cualquier cambio posterior debe anotarse aquí con fecha y motivo.

| Decisión | Elección | Motivo |
|---|---|---|
| Nombre | **OncoTrack** (definitivo) | Repo, Vercel y Supabase usan este nombre; dominio se compra antes de producción sin afectar al desarrollo. |
| Framework | **Next.js** (App Router, TypeScript, Tailwind) | Frontend + API serverless en un solo proyecto Vercel; las claves viven solo en servidor. |
| OCR | **Solo OpenAI multimodal** | El modelo lee PDF/imagen y devuelve extracción estructurada en un paso. Si falla con tablas difíciles, se reevaluará añadir OCR dedicado. |
| Confirmación de datos | **Paciente y cuidador** | Cualquiera de los dos confirma datos extraídos; la auditoría registra quién. |
| Correo | **Solo el integrado de Supabase (auth)** | Sin proveedor transaccional externo: "es interno, no queremos complicaciones". Ningún aviso depende del correo. |
| Notificaciones | **Push PWA + centro de avisos interno** | Push del navegador (Android e iOS ≥16.4 con PWA instalada) + avisos dentro de la app. |
| Presupuesto OpenAI | **10 €/mes** | Con avisos al 50% y 80%. Controles de coste (caché, límite de páginas, modelo barato por tarea) obligatorios desde Fase 2. |
| Enlaces compartidos | **30 días por defecto** | Configurables por enlace y revocables al instante. |
| Región de datos | **UE — Supabase Frankfurt (eu-central-1)** | Datos sanitarios + RGPD. |
| Retención | **Indefinida hasta borrado manual** | Es el expediente personal de la paciente. |
| Escalas de síntomas | **0–10 configurables por síntoma** | Según sección 18.3 de la spec. |
| Parámetros iniciales | **Lista de la sección 9.3** | Gastrina, cromogranina A, hemograma, función renal y hepática, peso. Validar con el equipo médico. |
| Límites de archivos | **25 MB/archivo, ~50 páginas/documento** | Control de coste y de procesamiento. |
| Backups | **Automáticos de Supabase + dump periódico propio** | Ver docs/security.md. |
| Radar científico | **Semanal; ClinicalTrials.gov, REEC, PubMed** | Fase 6, no bloquea el MVP. |
| Logotipo | **Diferido** | Antes del paso a producción. |
