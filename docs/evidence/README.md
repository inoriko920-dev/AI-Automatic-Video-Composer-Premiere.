# Runtime Evidence

Folder ini mendefinisikan cara menyimpan bukti real-host sebelum Foundation Gate dibuka.

## Prinsip

- Evidence harus berasal dari Premiere nyata, bukan hasil edit manual JSON.
- Report sumber harus dipertahankan tanpa perubahan.
- Review harus mencatat SHA-256 report sumber.
- `GO_CANDIDATE` belum berarti `GO_APPROVED`.
- `docs/foundation-gate.json` hanya boleh diubah dalam commit review terpisah.

## Alur yang disarankan

1. Jalankan Foundation Verification Kit v0.0.6.
2. Export `aavc-foundation-report-*.json` dari panel.
3. Jalankan reviewer:

```bash
npm run review:foundation -- <path-ke-report.json> --out .aavc-foundation-test/results/foundation-review.json
```

Atau Windows: drag report JSON ke:

`scripts/windows/REVIEW_FOUNDATION_REPORT.cmd`

4. Periksa keputusan dan P0:
   - S07;
   - S08;
   - S10;
   - S11;
   - S12.
5. Buat Evidence Bundle Windows bila ingin menyimpan/mengirim satu file ZIP. Drag report JSON ke:

`scripts/windows/BUILD_FOUNDATION_EVIDENCE_BUNDLE.cmd`

Script tersebut akan:
- memastikan review JSON tersedia;
- mempertahankan report asli;
- menyertakan `windows-environment.json` bila ditemukan;
- membuat `EVIDENCE_MANIFEST.json`;
- menghitung SHA-256 setiap file bukti;
- membuat `aavc-foundation-evidence-<timestamp>.zip` di `.aavc-foundation-test/evidence`.

Evidence bundle boleh dibuat juga saat keputusan `NO_GO`; kegagalan tetap harus dapat diaudit.

6. Simpan screenshot bila ada FAIL atau PASS_WITH_LIMIT yang membutuhkan konteks visual.
7. Bila keputusan `GO_CANDIDATE*`, lakukan human/agent review.
8. Baru setelah review eksplisit, update `docs/foundation-gate.json` ke `GO_APPROVED` dan isi `evidenceReport`.

## Bukti minimum untuk membuka gate

- report JSON exporter plugin;
- review JSON dari `scripts/review-foundation-report.mjs`;
- SHA-256 report sumber;
- versi Premiere;
- versi UXP;
- status S07/S08/S10/S11/S12;
- limitation/ADR bila S10 memakai fallback;
- catatan reviewer.

Evidence ZIP adalah convenience artifact; sumber keputusan tetap report + review JSON yang ada di dalamnya.

## Yang tidak boleh dilakukan

- mengubah status report dengan text editor agar terlihat PASS;
- menerima screenshot saja tanpa report JSON;
- auto-approve gate dari script;
- menghapus FAIL/PASS_WITH_LIMIT dari evidence;
- memakai report dari Premiere di bawah baseline tanpa ADR/version-policy baru.
