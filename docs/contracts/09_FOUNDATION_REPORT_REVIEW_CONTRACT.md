# 09 — Foundation Report Review Contract

Status: **ACTIVE PRE-PRODUCTION CONTROL**

Dokumen ini mendefinisikan cara `aavc-foundation-report-*.json` dari Premiere nyata harus direview sebelum `docs/foundation-gate.json` boleh berubah menjadi `GO_APPROVED`.

## Tujuan

Mencegah dua kesalahan:
1. membuka Tahap 02 hanya karena report terlihat hijau secara visual;
2. mengubah gate tanpa bukti file yang dapat diverifikasi kembali.

Review dilakukan oleh:

```bash
node scripts/review-foundation-report.mjs <report.json>
```

Opsional simpan hasil review:

```bash
node scripts/review-foundation-report.mjs <report.json> --out <review.json>
```

Jika S10 gagal/limit tetapi ada fallback ADR yang telah disetujui:

```bash
node scripts/review-foundation-report.mjs <report.json> --s10-fallback-adr docs/adr/<file>.md --out <review.json>
```

## Input minimum

Report harus merupakan JSON hasil exporter Foundation v0.0.6+ dan memiliki:
- `schema = 1`;
- `product = "AI Automatic Video Composer Premiere"`;
- `foundationVersion`;
- `host.version`;
- `host.uxpVersion`;
- `statuses.S01` sampai `statuses.S16`;
- status hanya boleh: `NOT RUN`, `PASS`, `PASS_WITH_LIMIT`, `FAIL`, `BLOCKED_BY_VERSION`.

## Baseline host

Reviewer menolak GO bila Premiere di bawah `25.6.0`.

## Gate P0

Harus `PASS`:
- S07 Timeline Placement;
- S08 Timing & Duration;
- S11 Transaction & One Undo;
- S12 Identity & Rerun Safety.

S10 Native Keyframe harus:
- `PASS`; atau
- memiliki fallback ADR eksplisit yang menyebut S10/keyframe dan berstatus `ACCEPTED`/`APPROVED`.

## Output keputusan

Reviewer hanya boleh mengeluarkan:

### `NO_GO`
Ada blocker wajib, schema invalid, atau host tidak memenuhi baseline.

### `REQUIRES_S10_FALLBACK_ADR`
S07/S08/S11/S12 sudah PASS tetapi S10 belum PASS dan belum ada fallback ADR yang disetujui.

### `GO_CANDIDATE`
S07/S08/S10/S11/S12 memenuhi gate.

### `GO_CANDIDATE_WITH_S10_FALLBACK`
S07/S08/S11/S12 PASS dan S10 digantikan oleh fallback ADR yang valid.

`GO_CANDIDATE*` **bukan** `GO_APPROVED`.

## Evidence integrity

Review JSON wajib mencatat:
- path report;
- nama file;
- SHA-256 report;
- waktu review;
- foundation version;
- Premiere/UXP/OS info;
- seluruh status S01–S16;
- status P0;
- alasan keputusan;
- daftar non-PASS.

Hash SHA-256 membuat file bukti yang direview dapat dibandingkan dengan file sumber yang disimpan.

## Aturan membuka gate

`scripts/review-foundation-report.mjs` **dilarang** mengubah `docs/foundation-gate.json` secara otomatis.

Gate hanya boleh dibuka dalam commit terpisah setelah:
1. report real-host tersedia;
2. reviewer menghasilkan `GO_CANDIDATE*`;
3. evidence dibaca manusia/agent reviewer;
4. limitation yang relevan dicatat;
5. bila memakai fallback S10, ADR-nya benar-benar telah disetujui;
6. `evidenceReport` di `docs/foundation-gate.json` menunjuk bukti yang direview;
7. status diubah eksplisit menjadi `GO_APPROVED`.

## Exit codes

- `0` — GO candidate;
- `1` — NO_GO;
- `2` — input/schema/command error;
- `3` — S10 membutuhkan fallback ADR.

Exit code ini dapat dipakai di script lokal/CI, tetapi tidak boleh dipakai untuk auto-approve Tahap 02.
