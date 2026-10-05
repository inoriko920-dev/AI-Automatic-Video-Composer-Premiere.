# API Spike Results

Setiap spike S01–S16 wajib mempunyai file hasil sendiri setelah dijalankan pada Premiere nyata.

Format nama:

`S01_PLUGIN_BOOT.md`
`S02_HOST_VERSION_GATE.md`
...

Template:

```md
# Sxx — Nama Spike

## Environment
- Date:
- Premiere:
- UXP runtime:
- UXP Developer Tool:
- OS:
- Plugin commit:

## Result
PASS / PASS_WITH_LIMIT / FAIL / BLOCKED_BY_VERSION

## Setup
Fixture/project/permission yang digunakan.

## Steps Executed
1.
2.
3.

## Observed Behavior
Apa yang benar-benar terjadi di Premiere.

## DOM Readback Proof
Nilai yang dibaca kembali dari Premiere DOM.

## Undo Result
PASS / N/A / FAIL

## Rerun Result
Idempotent / Duplicate / Destructive / Other

## Known Limitations
- 

## Error / Log Evidence
Ringkasan error tanpa API key/secret.

## Decision
API/fallback yang akan dipakai engine.

## Follow-up
Issue/ADR berikutnya bila ada.
```

## Aturan
- Jangan menulis PASS hanya karena API return `true`; baca kembali state dari DOM bila memungkinkan.
- Untuk mutasi timeline, uji Undo dan rerun.
- Jangan memakai project produksi.
- Jangan memasukkan API key, token, password, atau secret ke result file.
- Hasil spike adalah fakta arsitektur; bila bertentangan dengan asumsi Master Plan, buat ADR.
