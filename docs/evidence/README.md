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
5. Simpan report sumber, review JSON, dan screenshot kegagalan/limitasi bila ada.
6. Bila keputusan `GO_CANDIDATE*`, lakukan human/agent review.
7. Baru setelah review eksplisit, update `docs/foundation-gate.json` ke `GO_APPROVED` dan isi `evidenceReport`.

## Bukti minimum untuk membuka gate

- report JSON exporter plugin;
- review JSON dari `scripts/review-foundation-report.mjs`;
- SHA-256 report sumber;
- versi Premiere;
- versi UXP;
- status S07/S08/S10/S11/S12;
- limitation/ADR bila S10 memakai fallback;
- catatan reviewer.

## Yang tidak boleh dilakukan

- mengubah status report dengan text editor agar terlihat PASS;
- menerima screenshot saja tanpa report JSON;
- auto-approve gate dari script;
- menghapus FAIL/PASS_WITH_LIMIT dari evidence;
- memakai report dari Premiere di bawah baseline tanpa ADR/version-policy baru.
