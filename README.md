# AI Automatic Video Composer - Premiere

Plugin Adobe Premiere Pro untuk menyusun video naratif/infografis secara otomatis dari **Scene DOCX + aset canonical `Axxx` + narasi + subtitle**, tetapi hasil akhirnya tetap berupa timeline Premiere yang dapat diedit manual.

## Status proyek

**Fase saat ini: Tahap 00 selesai / Tahap 01 sedang berjalan / Batch A S01–S03 sudah diimplementasikan dan belum diverifikasi di Premiere nyata.**

Repo sengaja memakai pola **implement → verify di host nyata → baru promote ke production architecture**. Kode probe tidak otomatis dianggap PASS hanya karena sudah ada di repo.

Baseline teknis yang dikunci untuk foundation:

- Premiere Pro **25.6+**
- UXP Developer Tool **2.2+**
- UXP Manifest **v5**
- TypeScript/JavaScript + HTML/CSS/Spectrum UXP
- Windows 11 sebagai platform development pertama
- Premiere/Adobe Media Encoder sebagai jalur timeline dan export utama

## Goal utama

Alur target:

`Scene DOCX + Folder Axxx + Narasi + SRT`

→ parse scene
→ bind aset
→ tentukan SINGLE/DOUBLE layout
→ susun clip pada V1/V2
→ set durasi
→ motion/keyframe
→ subtitle
→ audio
→ validasi
→ timeline Premiere siap diedit
→ export Premiere/AME

## Dokumen wajib

1. [`docs/00_MASTER_PLAN_AI_AUTOMATIC_VIDEO_COMPOSER_PREMIERE.md`](docs/00_MASTER_PLAN_AI_AUTOMATIC_VIDEO_COMPOSER_PREMIERE.md) — dokumen induk proyek.
2. [`docs/01_UXP_FOUNDATION_API_SPIKE_PLAN.md`](docs/01_UXP_FOUNDATION_API_SPIKE_PLAN.md) — rencana pembuktian API sebelum engine production.
3. [`docs/adr/README.md`](docs/adr/README.md) — aturan Architecture Decision Record.
4. [`docs/spike-results/README.md`](docs/spike-results/README.md) — format hasil setiap API spike.
5. [`docs/spike-results/S01-S03_BATCH_A.md`](docs/spike-results/S01-S03_BATCH_A.md) — record verifikasi Batch A.
6. [`uxp/README.md`](uxp/README.md) — cara load dan menguji plugin foundation.

## Batch A — S01–S03

Kode UXP minimal tersedia di folder [`uxp/`](uxp/):

- **S01 Plugin Boot & Panel** — manifest v5, panel diagnostics, lifecycle/logging.
- **S02 Host & Version Gate** — host, Premiere version, UXP version, OS, architecture, locale, minimum gate 25.6.
- **S03 Filesystem Access** — PNG picker, folder picker, enumerasi `Axxx`, write/read persistent plugin-data JSON.

Batch ini memakai **JavaScript murni tanpa bundler** untuk mengurangi variabel kegagalan saat foundation diuji. Refactor TypeScript dilakukan setelah API foundation terbukti.

### Cara mulai test

1. Buka Premiere Pro 25.6+.
2. Buka UXP Developer Tool 2.2+.
3. Add Plugin → pilih `uxp/manifest.json`.
4. Load plugin.
5. Premiere → `Window > UXP Plugins > AI Automatic Video Composer`.
6. Ikuti checklist di `uxp/README.md`.

## Prinsip implementasi

- Jangan menyalin Python/PySide/FFmpeg dari AAVC standalone 1:1.
- Port **logika bisnis**, lalu implementasikan integrasi dengan API native Premiere UXP.
- API yang hanya terlihat di dokumentasi belum dianggap aman sampai dibuktikan dengan spike pada Premiere nyata.
- Operasi timeline harus memakai Action/Transaction/Undo bila API mendukung.
- Jangan merusak edit manual user saat plugin dijalankan ulang.
- Gemini/AI adalah fitur opsional; composer dasar harus tetap bekerja tanpa internet.
- Fitur Premiere 26.x/27.x harus di-version-gate dan tidak boleh diam-diam menaikkan minimum MVP 25.6.

## Gate Tahap 01

Sebelum parser DOCX/composer production dibuat, tiga kemampuan berikut wajib terbukti stabil:

- **S07 — Timeline Placement**
- **S08 — Timing & Duration**
- **S11 — Transaction & Undo**

Jika salah satu gagal tanpa fallback yang layak, arsitektur harus diselesaikan lebih dulu.

## Workflow agen

- **ASTRA / planner:** memecah pekerjaan, menilai hasil spike, membuat ADR, menjaga scope dan acceptance criteria.
- **SOL / implementer:** membangun kode, menjalankan spike, membuat test/log/result, dan hanya membawa API yang sudah terbukti ke adapter production.

## Langkah berikutnya

1. Verifikasi S01–S03 di Premiere/UDT nyata.
2. Catat hasil di `docs/spike-results/S01-S03_BATCH_A.md`.
3. Jika Batch A PASS, lanjut Batch B: **S04 Active Project → S05 Bin/Import Media → S06 Sequence Creation**.
4. Setelah itu baru masuk blocker utama S07/S08/S11.
