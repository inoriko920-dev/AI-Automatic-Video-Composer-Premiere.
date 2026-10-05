# Architecture Decision Records (ADR)

Folder ini menyimpan keputusan arsitektur yang lahir dari fakta implementasi/API spike.

Gunakan ADR ketika keputusan:
- mengubah baseline Premiere minimum,
- membutuhkan fallback template sequence/track,
- mengubah strategi identity/rerun,
- membutuhkan Hybrid UXP/external companion,
- mengganti jalur subtitle/graphics,
- mengubah transaction boundary,
- mengubah kontrak input/output inti.

Format nama:

`ADR-0001-judul-singkat.md`

Template:

```md
# ADR-0001 — Judul

## Status
Proposed / Accepted / Superseded

## Context
Fakta masalah dan hasil spike yang memicu keputusan.

## Decision
Keputusan yang diambil.

## Alternatives
Alternatif yang diuji/dipertimbangkan.

## Consequences
Dampak positif, negatif, version gate, testing, dan migration.

## Evidence
Spike ID, Premiere version, commit SHA, result file.
```

Jangan membuat ADR untuk perubahan kosmetik kecil.
