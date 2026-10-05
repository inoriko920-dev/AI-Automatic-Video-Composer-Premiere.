# AI Automatic Video Composer - Premiere

Plugin Adobe Premiere Pro untuk menyusun video naratif/infografis secara otomatis dari **Scene DOCX + aset canonical `Axxx` + narasi + subtitle**, tetapi hasil akhirnya tetap berupa timeline Premiere yang dapat diedit manual.

## Status proyek

**Fase saat ini: Tahap 00 selesai / Tahap 01 sedang berjalan / Batch A S01–S03 dan Batch B S04–S06 sudah diimplementasikan, tetapi belum diverifikasi di Premiere nyata.**

Repo memakai pola **implement → verify di host nyata → baru promote ke production architecture**. Kode probe tidak otomatis dianggap PASS hanya karena sudah ada di repo atau static check GitHub berhasil.

Baseline teknis:

- Premiere Pro **25.6+**
- UXP Developer Tool **2.2+**
- UXP Manifest **v5**
- JavaScript UXP murni selama fase spike foundation
- TypeScript production setelah API P0 terbukti
- Windows 11 sebagai platform development pertama
- Premiere/Adobe Media Encoder sebagai jalur timeline dan export utama

## Goal utama

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
5. [`docs/spike-results/S01-S03_BATCH_A.md`](docs/spike-results/S01-S03_BATCH_A.md) — record Batch A.
6. [`docs/spike-results/S04-S06_BATCH_B.md`](docs/spike-results/S04-S06_BATCH_B.md) — record Batch B.
7. [`uxp/README.md`](uxp/README.md) — cara load dan menguji plugin foundation.

## Foundation yang sudah diimplementasikan

### Batch A — S01–S03
- **S01 Plugin Boot & Panel** — manifest v5, panel diagnostics, lifecycle/logging.
- **S02 Host & Version Gate** — host, Premiere version, UXP version, OS, architecture, locale, minimum gate 25.6.
- **S03 Filesystem Access** — PNG picker, folder picker, enumerasi `Axxx`, write/read persistent plugin-data JSON.

### Batch B — S04–S06
- **S04 Active Project** — membaca active project, root item, insertion bin, sequences, active sequence dan root children.
- **S05 Bin + Import Media** — membuat/memakai bin `AAVC_GENERATED`, import dua canonical asset, readback sebagai ClipProjectItem, dan mengamati duplicate behavior.
- **S06 Sequence Creation** — membuat `AAVC_SPIKE_S06` melalui `Project.createSequenceFromMedia()` dan membaca metadata sequence kembali.

Pembuatan bin memakai `Project.lockedAccess()` + `Project.executeTransaction()` agar Action dibuat di scope yang aman dan masuk Undo history secara logis.

`createSequenceWithPresetPath()` tidak menjadi dependency MVP karena baru tersedia mulai Premiere 26.3; baseline S06 memakai API yang tersedia sejak 25.6.

## Cara test

1. Gunakan **project TEST**, bukan project produksi.
2. Buka Premiere Pro 25.6+.
3. Buka UXP Developer Tool 2.2+.
4. Add Plugin → pilih `uxp/manifest.json`.
5. Load plugin.
6. Premiere → `Window > UXP Plugins > AI Automatic Video Composer`.
7. Jalankan S01 → S02 → S03 → S04 → S05 → S06.
8. Isi hasil nyata di `docs/spike-results/`.

S05 dan S06 memodifikasi project test.

## Prinsip implementasi

- Jangan menyalin Python/PySide/FFmpeg dari AAVC standalone 1:1.
- Port **logika bisnis**, lalu implementasikan integrasi dengan API native Premiere UXP.
- API yang hanya terlihat di dokumentasi belum dianggap aman sampai dibuktikan dengan spike pada Premiere nyata.
- Operasi yang menghasilkan Action harus mengikuti `lockedAccess` / transaction rules.
- Jangan merusak edit manual user saat plugin dijalankan ulang.
- Gemini/AI adalah fitur opsional; composer dasar harus tetap bekerja tanpa internet.
- Fitur Premiere 26.x/27.x harus di-version-gate dan tidak boleh diam-diam menaikkan minimum MVP 25.6.

## Gate Tahap 01

Tiga kemampuan berikut adalah blocker utama sebelum parser DOCX/composer production dibuat:

- **S07 — Timeline Placement**
- **S08 — Timing & Duration**
- **S11 — Transaction & Undo**

Jika salah satu gagal tanpa fallback yang layak, arsitektur harus diselesaikan lebih dulu.

## Workflow agen

- **ASTRA / planner:** memecah pekerjaan, menilai hasil spike, membuat ADR, menjaga scope dan acceptance criteria.
- **SOL / implementer:** membangun kode, menjalankan spike, membuat test/log/result, dan hanya membawa API yang sudah terbukti ke adapter production.

## Langkah berikutnya

Setelah Batch A/B diuji di Premiere nyata, lanjutkan:

**S07 Timeline Placement → S08 Timing/Duration → S09 Motion → S10 Keyframe → S11 Transaction/Undo.**

Jangan mulai parser DOCX production sebelum blocker S07/S08/S11 mempunyai jalur yang terbukti.
