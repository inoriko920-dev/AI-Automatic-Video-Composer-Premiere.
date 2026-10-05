# AI Automatic Video Composer - Premiere

Plugin Adobe Premiere Pro untuk menyusun video naratif/infografis secara otomatis dari **Scene DOCX + aset canonical `Axxx` + narasi + subtitle**, tetapi hasil akhirnya tetap berupa timeline Premiere yang dapat diedit manual.

## Status proyek

**Fase saat ini: Tahap 00 selesai / Tahap 01 sedang berjalan / Batch A S01–S03, Batch B S04–S06, Batch C S07–S08, dan Batch D S09–S11 sudah diimplementasikan, tetapi belum diverifikasi di Premiere nyata.**

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
7. [`docs/spike-results/S07-S08_BATCH_C.md`](docs/spike-results/S07-S08_BATCH_C.md) — record Batch C.
8. [`docs/spike-results/S09-S11_BATCH_D.md`](docs/spike-results/S09-S11_BATCH_D.md) — record Batch D.
9. [`uxp/README.md`](uxp/README.md) — cara load dan menguji plugin foundation.

## Foundation yang sudah diimplementasikan

### Batch A — S01–S03
- **S01 Plugin Boot & Panel** — manifest v5, panel diagnostics, lifecycle/logging.
- **S02 Host & Version Gate** — host, Premiere version, UXP version, OS, architecture, locale, minimum gate 25.6.
- **S03 Filesystem Access** — PNG picker, folder picker, enumerasi `Axxx`, write/read persistent plugin-data JSON.

### Batch B — S04–S06
- **S04 Active Project** — membaca active project, root item, insertion bin, sequences, active sequence dan root children.
- **S05 Bin + Import Media** — membuat/memakai bin `AAVC_GENERATED`, import dua canonical asset, readback sebagai ClipProjectItem, dan mengamati duplicate behavior.
- **S06 Sequence Creation** — membuat `AAVC_SPIKE_S06` melalui `Project.createSequenceFromMedia()` dan membaca metadata sequence kembali.

### Batch C — S07–S08
- **S07 Timeline Placement** — sequence khusus `AAVC_SPIKE_S07_S08`, A001 di V1 @ 0 s, A002 di V2 @ 1 s, menggunakan `SequenceEditor.createInsertProjectItemAction()` dan DOM readback.
- **S08 Timing & Duration** — A001 ditargetkan 3 s, A002 ditargetkan 5 s menggunakan `VideoClipTrackItem.createSetEndAction()` dalam satu transaction, lalu diverifikasi lewat `getStartTime()`, `getEndTime()`, dan `getDuration()` dengan toleransi maksimum 1 frame.

### Batch D — S09–S11
- **S09 Motion Parameter Discovery** — enumerate seluruh video component/parameter A001, baca component `matchName`, parameter display/value/keyframe capability, cari kandidat Motion/Position/Scale/Opacity, lalu static mutation + readback + restore pada numeric candidate yang aman.
- **S10 Native Keyframe Animation** — enable time-varying, tambah dua keyframe pada 0 s dan 2 s, set LINEAR interpolation bila tersedia, lalu verifikasi lewat keyframe list dan value readback. Transaction success saja tidak dianggap bukti.
- **S11 Transaction & One Undo** — dua perubahan timing dimasukkan ke satu `executeTransaction()`. Setelah satu Ctrl+Z manual di Premiere, tombol Verify wajib membuktikan kedua state kembali ke baseline.

Semua Action dibuat di dalam `Project.lockedAccess()` dan dieksekusi lewat `Project.executeTransaction()` sesuai aturan API Premiere terbaru.

`createSequenceWithPresetPath()` tidak menjadi dependency MVP karena baru tersedia mulai Premiere 26.3; baseline menggunakan API yang tersedia sejak 25.6.

## Cara test

1. Gunakan **project TEST**, bukan project produksi.
2. Buka Premiere Pro 25.6+.
3. Buka UXP Developer Tool 2.2+.
4. Add Plugin → pilih `uxp/manifest.json`.
5. Load plugin.
6. Premiere → `Window > UXP Plugins > AI Automatic Video Composer`.
7. Jalankan S01 → S02 → ... → S11 secara berurutan.
8. Pada S11, setelah mutation berhasil, tekan **Ctrl+Z satu kali** tanpa edit lain lalu klik `Verify S11 Undo`.
9. Isi hasil nyata di `docs/spike-results/`.

S05–S11 memodifikasi project test; beberapa probe merestore nilainya sendiri, tetapi jangan gunakan project produksi.

## Prinsip implementasi

- Jangan menyalin Python/PySide/FFmpeg dari AAVC standalone 1:1.
- Port **logika bisnis**, lalu implementasikan integrasi dengan API native Premiere UXP.
- API yang hanya terlihat di dokumentasi belum dianggap aman sampai dibuktikan dengan spike pada Premiere nyata.
- Operasi yang menghasilkan Action harus mengikuti `lockedAccess` / transaction rules.
- Jangan merusak edit manual user saat plugin dijalankan ulang.
- Gemini/AI adalah fitur opsional; composer dasar harus tetap bekerja tanpa internet.
- Fitur Premiere 26.x/27.x harus di-version-gate dan tidak boleh diam-diam menaikkan minimum MVP 25.6.
- Parameter Motion tidak boleh bergantung pada satu English display name; simpan inventory host/locale dan gunakan capability/shape/matchName evidence.

## Gate Tahap 01

Tiga kemampuan berikut adalah blocker utama sebelum parser DOCX/composer production dibuat:

- **S07 — Timeline Placement**
- **S08 — Timing & Duration**
- **S11 — Transaction & Undo**

S10 juga harus PASS bila motion/keyframe native dijadikan bagian wajib MVP. Bila host mengalami bug keyframe tetapi S07/S08/S11 stabil, composer MVP dapat dilanjutkan tanpa motion native sementara dan motion dibuat capability-gated.

## Workflow agen

- **ASTRA / planner:** memecah pekerjaan, menilai hasil spike, membuat ADR, menjaga scope dan acceptance criteria.
- **SOL / implementer:** membangun kode, menjalankan spike, membuat test/log/result, dan hanya membawa API yang sudah terbukti ke adapter production.

## Langkah berikutnya

Setelah Batch D diverifikasi pada Premiere nyata, lanjutkan Tahap 01:

**S12 Identity / Rerun Safety → S13 Network Permission → S14 Encoder Export → S15 MOGRT/Graphics → S16 Packaging CCX.**

Jangan mulai parser DOCX production sebelum blocker S07/S08/S11 mempunyai jalur yang terbukti.