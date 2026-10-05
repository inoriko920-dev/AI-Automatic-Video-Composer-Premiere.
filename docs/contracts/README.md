# Production Contracts — Stage 02

Status folder: **DESIGN ONLY / DO NOT IMPLEMENT BEFORE FOUNDATION GATE GO**

Dokumen di folder ini adalah kontrak production yang harus diikuti setelah ADR-0001 membuka Tahap 02.

Urutan baca:

1. `05_SCENE_DOCX_INPUT_CONTRACT.md`
2. `06_AXXX_ASSET_BINDER_CONTRACT.md`
3. `07_COMPOSER_PLAN_PROJECT_STATE_SCHEMA.md`
4. `08_VALIDATION_ERROR_CATALOG.md`

Kontrak ini melengkapi:
- `docs/03_STAGE_02_CORE_ARCHITECTURE_PRODUCTION_PLAN.md`
- `docs/04_STAGE_02_EXECUTION_CHECKLIST_ASTRA_SOL.md`
- `docs/adr/0001-foundation-gate-before-production.md`
- `docs/adr/0002-preserve-user-edits-on-rerun.md`

Aturan utama:
- parser/binder/domain logic tidak bergantung pada Premiere runtime;
- tidak ada mutation sebelum validation selesai;
- all production state schema-versioned;
- stable IDs tidak bergantung pada track index;
- rerun memakai three-way comparison;
- edit manual user protected by default;
- validation codes stabil dan dapat diuji.