# ADR 0002 — Preserve Manual User Edits on Rerun

Status: **ACCEPTED**

## Context

AAVC Premiere menghasilkan timeline native yang sengaja tetap editable. Setelah generation pertama, user dapat memindahkan clip, mengubah duration, scale, position, keyframe, subtitle, atau elemen lain secara manual.

Rerun dari input baru tidak boleh menganggap seluruh timeline sebagai milik eksklusif plugin.

## Decision

Production rerun menggunakan **three-way comparison**:

1. previous applied plugin state;
2. current Premiere state;
3. new desired composer plan.

Jika current Premiere state berbeda dari previous applied state pada field yang material, item diklasifikasikan sebagai `USER_MODIFIED`.

Default policy:

**USER_MODIFIED item tidak ditimpa otomatis.**

Plugin hanya boleh:
- mempertahankan item;
- menandai conflict;
- menampilkan proposed change;
- meminta tindakan eksplisit bila update tetap diperlukan.

## Safe automatic cases

Automatic update diperbolehkan bila:
- field belum berubah sejak last applied state;
- item baru belum pernah ada;
- metadata ownership plugin dapat dibuktikan;
- perubahan tidak menghapus edit manual yang terdeteksi.

## Unsafe cases

Automatic overwrite dilarang bila:
- duration manual berubah;
- track/placement manual berubah;
- Motion/Scale/Position berbeda dari last applied state;
- keyframe user berubah;
- plugin tidak dapat membuktikan identity item;
- state lama hilang atau corrupt sehingga baseline comparison tidak terpercaya.

## Removed source item

Jika scene/asset dihapus dari source tetapi generated item sudah diedit user, plugin tidak langsung menghapusnya.

Status:

`REMOVED_FROM_SOURCE + USER_MODIFIED`

User harus memilih keep/remove secara eksplisit.

## Missing generated item

Jika state mengatakan item pernah dibuat tetapi item tidak ditemukan di Premiere:
- jangan mengasumsikan item aman dibuat ulang;
- klasifikasikan `MISSING_IN_PREMIERE`;
- planner dapat menawarkan recreate setelah validation.

## Identity requirement

Detection tidak boleh bergantung hanya pada track index.

Gunakan kombinasi:
- generatedItemId;
- sceneId;
- assetId;
- persistent Project/Sequence state;
- last applied plan hash;
- Premiere identity/fingerprint yang tersedia.

## Consequences

Positif:
- rerun lebih aman;
- timeline tetap benar-benar editable;
- user tidak takut memakai Premiere manual setelah generation.

Negatif:
- rerun engine lebih kompleks;
- perlu state versioning;
- beberapa update membutuhkan conflict UI.

Kompleksitas tersebut diterima karena menjaga edit manual adalah requirement produk inti.

## Verification

Unit tests minimum:
- unchanged item -> SAFE_UPDATE;
- duration manually changed -> USER_MODIFIED;
- position changed -> USER_MODIFIED;
- new item -> NEW;
- removed untouched item -> removable candidate;
- removed modified item -> conflict;
- missing baseline state -> unsafe/block.

Real-host test minimum:
1. generate scene;
2. edit satu generated clip manual di Premiere;
3. rerun dengan source berubah;
4. pastikan clip manual tidak ditimpa;
5. Validation Center menampilkan `USER_EDIT_CONFLICT` / `RERUN_USER_MODIFIED_ITEM`.