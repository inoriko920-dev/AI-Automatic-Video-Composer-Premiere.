# ADR-0001 — Foundation Gate Before Production

Status: **ACCEPTED**

Date: 2026-10-06

## Context

Repo mempunyai dua jenis kode yang berbeda tujuan:

1. **Foundation/API spike code** — membuktikan perilaku nyata Premiere UXP melalui S01–S16.
2. **Production composer code** — engine TypeScript yang nantinya digunakan user untuk menyusun timeline nyata.

Static validation dan dokumentasi API tidak cukup untuk membuktikan bahwa mutation Premiere benar-benar bekerja sesuai kebutuhan. Beberapa operasi harus dibuktikan melalui DOM readback dan interaksi host nyata, terutama placement, timing, keyframe, Undo, dan persistence identity.

Membangun engine production sebelum kemampuan ini terbukti akan membuat arsitektur bergantung pada asumsi yang mungkin salah dan meningkatkan biaya rewrite.

## Decision

Production implementation Tahap 02 **dilarang dimulai/promote** sampai Foundation Gate mempunyai evidence host nyata.

Gate minimum:

- S07 Timeline Placement = PASS.
- S08 Timing & Duration = PASS.
- S11 Transaction & One Undo = PASS.
- S12 Identity after reload/restart = PASS.
- S10 Keyframe = PASS, atau limitation host dibuktikan dan fallback disetujui melalui ADR tambahan.

Evidence utama adalah report JSON dari Foundation Verification Kit, lengkap dengan versi Premiere, UXP, OS, statuses, readback, dan diagnostics log.

Planning, dokumentasi, interface design, fixture design, dan test design Tahap 02 **boleh** dilakukan sebelum gate. Production runtime code yang menggunakan asumsi API kritis **tidak boleh**.

## Consequences

### Positive
- Mengurangi rewrite besar.
- Memisahkan experimental code dari production code.
- Menjaga semua keputusan API berbasis evidence.
- Memaksa readback sebagai acceptance, bukan return value saja.
- Mempermudah ASTRA/SOL mengetahui kapan boleh melanjutkan.

### Negative
- Tahap 02 implementation menunggu satu sesi test Premiere nyata.
- Beberapa pekerjaan production tidak bisa diparalelkan penuh sebelum gate.

## Allowed before gate

- `docs/03_STAGE_02_CORE_ARCHITECTURE_PRODUCTION_PLAN.md`
- domain/interface design
- test fixture design
- ADR draft
- verification tooling
- documentation

## Not allowed before gate

- mempromosikan spike adapter sebagai production adapter;
- menghapus spike diagnostics yang masih dibutuhkan untuk evidence;
- membuat production composer yang mengandalkan S07/S08/S10/S11/S12 tanpa bukti host nyata;
- mengubah status Tahap 02 menjadi READY TO IMPLEMENT hanya karena CI hijau.

## Revisit

ADR ini dapat ditutup setelah Foundation Gate dinyatakan GO dan evidence disimpan/direview. Prinsip umum "API host-critical harus dibuktikan dengan real-host test" tetap berlaku untuk fitur baru setelahnya.
