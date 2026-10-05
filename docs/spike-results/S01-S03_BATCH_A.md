# Batch A — S01–S03 Verification Record

Status dokumen: `IMPLEMENTED_NOT_VERIFIED`

Kode probe sudah tersedia di `uxp/`, tetapi hasil berikut belum boleh diisi PASS sampai dijalankan pada Premiere + UXP Developer Tool nyata.

## Environment
- Date:
- Commit:
- Windows version:
- Premiere version:
- UXP runtime:
- UDT version:
- UI locale:

## S01 — Plugin Boot & Panel
Status: `NOT_EXECUTED`

Checklist:
- [ ] manifest load tanpa error
- [ ] panel muncul dari Window > UXP Plugins
- [ ] Run S01 berhasil
- [ ] reload UDT 10x berhasil
- [ ] buka/tutup panel berulang berhasil
- [ ] restart Premiere berhasil
- [ ] tidak ada exception global

Observed behavior:

Limitations:

Decision:

## S02 — Host & Version Gate
Status: `NOT_EXECUTED`

Checklist:
- [ ] host name terbaca
- [ ] Premiere version terbaca
- [ ] UXP version terbaca
- [ ] OS/release terbaca
- [ ] architecture terbaca
- [ ] locale terbaca
- [ ] minimum gate 25.6 bekerja
- [ ] unsupported host/version tidak crash

Observed behavior:

Limitations:

Decision:

## S03 — Filesystem Access
Status: `NOT_EXECUTED`

Checklist:
- [ ] pilih PNG berhasil
- [ ] pilih folder berhasil
- [ ] enumerate file berhasil
- [ ] A001/A002 terdeteksi
- [ ] state JSON ditulis ke plugin data folder
- [ ] state JSON dibaca kembali
- [ ] restart Premiere / reload plugin
- [ ] state lama masih dapat dibaca setelah restart
- [ ] cancel picker tidak dianggap error fatal

Observed behavior:

Limitations:

Decision:

## Gate Batch A
Batch A dinyatakan `PASS` hanya jika S01, S02, dan S03 memenuhi acceptance criteria dari `01_UXP_FOUNDATION_API_SPIKE_PLAN.md`.

Jika ada kegagalan, jangan lanjut ke engine composer. Catat failure, lakukan fix kecil, ulangi spike, lalu buat ADR bila perlu.
