# Batch E — S12–S16

Status implementasi: **IMPLEMENTED / NOT VERIFIED ON REAL PREMIERE HOST**

Versi foundation: `0.0.5`

Batch E menutup Tahap 01 foundation. Tidak ada spike yang boleh diberi PASS final hanya karena static check GitHub berhasil.

## S12 — Identity / Rerun Safety

Tujuan: hasil generate dapat ditemukan kembali setelah reload/restart tanpa mengandalkan index track.

Implementasi:
- persistent Project Property `aavc.identity.projectRole=AAVC_TEST_PROJECT`;
- persistent Sequence Property `aavc.identity.sequenceRole=AAVC_COMPOSER_SEQUENCE`;
- schema property `aavc.identity.schema=1`;
- backup `s12-identity-state.json` di UXP data folder berisi project GUID + sequence GUID.

Prosedur:
1. Jalankan `Run S12 · Write Identity`.
2. Pastikan property + JSON readback cocok.
3. Restart Premiere / reload plugin.
4. Buka project test yang sama.
5. Klik `Verify S12 Restart`.
6. PASS hanya bila persistent properties dan GUID backup masih cocok.

## S13 — Network Permission

Manifest v5 sekarang mengizinkan **hanya** `https://httpbin.org` untuk spike foundation.

Probe melakukan:
- GET `/get?probe=AAVC_S13`;
- POST `/post` JSON;
- timeout/failure ditangkap tanpa crash.

`httpbin.org` adalah domain TEST dan harus dihapus/diganti domain provider yang benar sebelum production release. Gemini/AI tetap opsional; composer dasar tidak boleh bergantung pada network.

PASS bila GET + POST sukses. Offline/blocked harus menghasilkan failure yang terkontrol, bukan crash.

## S14 — EncoderManager / AME Export

Baseline API: Premiere 25.6+.

Prosedur:
1. Pilih output folder.
2. Pilih preset `.epr`.
3. Klik `Probe S14` dan pastikan AME terdeteksi.
4. Klik `Queue to AME` pada project/sequence TEST.
5. Probe memakai `EncoderManager.getManager()`, `getExportFileExtension()`, dan `exportSequence(..., QUEUE_TO_AME, ...)`.
6. PASS bila queue diterima (`true`) dan job terlihat di AME.

`launchEncoder()` dan `startBatchEncode()` bukan dependency baseline karena baru tersedia pada host lebih baru (26.3+).

## S15 — MOGRT / Graphics Feasibility

P2, bukan blocker composer dasar.

Probe:
- membaca `SequenceEditor.getInstalledMogrtPath()`;
- user memilih `.mogrt` fixture;
- `insertMogrtFromPath()` menyisipkan template ke V3 @ 0s;
- returned track items diinspeksi untuk component chain dan parameter.

Jika tidak ada fixture MOGRT, keberhasilan membaca installed MOGRT path hanya `PASS_WITH_LIMIT`.

PASS penuh memerlukan MOGRT benar-benar masuk timeline dan track item dikembalikan oleh API.

## S16 — Packaging CCX

Static CI menjalankan:
- JavaScript syntax checks;
- manifest validation;
- `scripts/validate-package-readiness.mjs`.

PASS final **tidak dapat dibuktikan oleh CI**. Prosedur manual wajib:
1. UDT → Actions (`...`) → Package.
2. Pastikan file `.ccx` terbentuk.
3. Install `.ccx` melalui Creative Cloud Desktop.
4. Buka Premiere → Window → UXP Plugins.
5. Jalankan smoke test S01 + S02 dari installed package.
6. Naikkan patch version dan uji reinstall/update.

## Manual verification sheet

| Field | Result |
|---|---|
| Premiere version | NOT TESTED |
| UXP version | NOT TESTED |
| Windows version | NOT TESTED |
| Plugin version | 0.0.5 |
| S12 write/read | NOT VERIFIED |
| S12 after restart | NOT VERIFIED |
| S13 GET | NOT VERIFIED |
| S13 POST | NOT VERIFIED |
| S13 offline/error handling | NOT VERIFIED |
| AME installed | NOT VERIFIED |
| S14 preset extension | NOT VERIFIED |
| S14 queue result | NOT VERIFIED |
| S15 installed MOGRT path | NOT VERIFIED |
| S15 insert from path | NOT VERIFIED |
| S15 editable params discovered | NOT VERIFIED |
| S16 UDT package | NOT VERIFIED |
| S16 CCX install | NOT VERIFIED |
| S16 packaged S01/S02 smoke | NOT VERIFIED |
| S16 update/reinstall | NOT VERIFIED |
| Notes / limitations | NOT VERIFIED |

## Tahap 01 gate

Tahap 01 baru boleh dinyatakan selesai setelah seluruh P0 yang relevan diverifikasi di Premiere nyata, terutama:
- S07 Timeline Placement;
- S08 Timing & Duration;
- S10 Keyframe readback (atau limitation/ADR yang jelas);
- S11 Transaction & One Undo;
- S12 Identity persistence.

S13–S16 dapat mempunyai limitation terkontrol sesuai prioritasnya, tetapi harus didokumentasikan.

Setelah gate terpenuhi, masuk **Tahap 02 — Core Architecture Production**: adapter Premiere + project state + Scene DOCX parser + Axxx binder + timeline composer.