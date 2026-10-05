# UXP Foundation Diagnostics — S01–S16

Folder `uxp/` adalah plugin diagnostic untuk membuktikan API Premiere sebelum engine composer production dibuat.

## Baseline
- Premiere Pro 25.6+
- UXP Developer Tool 2.2+
- Manifest v5
- Windows 11 sebagai environment development pertama
- Foundation plugin v0.0.5

## Load plugin
1. Buka Premiere Pro dan aktifkan Developer Mode di Preferences > Plugins.
2. Restart Premiere bila baru mengaktifkan Developer Mode.
3. Buka UXP Developer Tool.
4. Add Plugin → pilih `uxp/manifest.json`.
5. Klik Load.
6. Premiere → Window → UXP Plugins → AI Automatic Video Composer.

Gunakan **project TEST**. S05 ke atas dapat memodifikasi project/timeline.

## Urutan test

### Batch A
**S01** — Run, reload UDT 10×, buka/tutup panel, restart Premiere.

**S02** — host harus Premiere dan version >= 25.6; catat UXP/OS/locale.

**S03** — pilih PNG + folder minimal A001/A002, write/read state, restart lalu read state lagi.

### Batch B
**S04** — baca active project, root, insertion bin, sequences.

**S05** — import A001/A002 ke bin `AAVC_GENERATED`; catat duplicate behavior.

**S06** — buat/readback `AAVC_SPIKE_S06` via `createSequenceFromMedia()`.

### Batch C — blocker
**S07** — A001 harus V1 @ 0s dan A002 V2 @ 1s.

**S08** — A001 0→3s dan A002 1→6s; semua readback dalam toleransi <= 1 frame.

### Batch D
**S09** — inventory Motion components/params; static mutation harus readback + restore.

**S10** — native keyframes @ 0s dan 2s. PASS hanya bila keyframe list/value readback benar.

**S11** — dua timing mutation dibuat dalam satu `executeTransaction`. Setelah tombol Run, tekan **Ctrl+Z sekali** tanpa edit lain, lalu klik Verify. PASS hanya bila dua nilai kembali ke baseline sekaligus.

### Batch E
**S12 — Identity / rerun safety**
1. Klik `Run S12 · Write Identity`.
2. Project + Sequence persistent Properties dan JSON backup harus cocok.
3. Restart/reload Premiere.
4. Buka project test yang sama.
5. Klik `Verify S12 Restart`.

**S13 — Network**
- Klik `Run S13 · GET + POST`.
- Manifest foundation hanya mengizinkan `https://httpbin.org`.
- GET dan POST harus sukses.
- Coba juga kondisi offline/blocked: plugin harus menangkap error tanpa crash.
- Domain httpbin wajib dihapus sebelum production.

**S14 — AME export**
1. Pilih output folder.
2. Pilih preset `.epr`.
3. Klik `Probe S14`; pastikan AME detected.
4. Klik `Queue to AME`.
5. Pastikan job benar-benar terlihat di Adobe Media Encoder.

Catatan: queue ini nyata; gunakan sequence TEST.

**S15 — MOGRT**
1. Klik `Run S15` tanpa fixture untuk membuktikan installed MOGRT path (hasil maksimal PASS_WITH_LIMIT).
2. Untuk PASS penuh, klik `Pilih MOGRT`, pilih `.mogrt` test, lalu Run S15.
3. Template disisipkan ke V3 @ 0s dan returned track item/component chain dicatat.

**S16 — CCX packaging**
1. Jalankan `npm run check` dari repo clone dan pastikan hijau.
2. Di UDT, Actions (`...`) → Package.
3. Pastikan `.ccx` terbentuk.
4. Install `.ccx` melalui Creative Cloud Desktop.
5. Buka Premiere dan jalankan S01/S02 dari packaged install.
6. Naikkan patch version lalu uji reinstall/update.

Panel hanya memberi `PASS_WITH_LIMIT` untuk S16 readiness. PASS final dicatat manual di `docs/spike-results/S12-S16_BATCH_E.md`.

## Status yang valid
- `PASS` — bukti runtime/readback memenuhi acceptance criteria.
- `PASS_WITH_LIMIT` — inti bekerja tetapi restart/manual/package/fixture proof belum lengkap.
- `FAIL` — API/runtime/readback gagal.
- `BLOCKED_BY_VERSION` — host tidak memenuhi baseline.

## Static check

```bash
npm run check
```

Memeriksa syntax semua JS, manifest, dan package-readiness dasar.

## Tahap 01 selesai kapan?
Tahap 01 tidak selesai hanya karena S01–S16 sudah ada di repo. Hasil nyata harus dicatat pada seluruh file `docs/spike-results/`.

Gate terpenting sebelum Tahap 02:
- S07 placement;
- S08 duration;
- S10 keyframe readback / documented ADR limitation;
- S11 one-Undo;
- S12 restart identity.

Setelah gate terbukti, baru refactor ke TypeScript dan mulai Core Architecture production.