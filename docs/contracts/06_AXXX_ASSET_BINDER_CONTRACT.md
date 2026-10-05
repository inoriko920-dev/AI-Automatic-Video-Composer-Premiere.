# 06 — Canonical Axxx Asset Binder Contract

Status: **DESIGN COMPLETE / IMPLEMENTATION BLOCKED BY FOUNDATION GATE**

Binder menghubungkan `SceneAssetRef` dari parser dengan file media nyata sebelum Premiere project dimutasi.

## 1. Canonical naming

Format utama:

`A001.png`, `A002.png`, `A003.png`, ...

Regex logical ID:

`^A\d{3,}$`

Ekstensi file dipisahkan dari logical ID.

## 2. Domain model

```ts
interface AssetCandidate {
  assetId: string;
  fileName: string;
  nativePath: string;
  extension: string;
  sizeBytes?: number;
}

interface AssetBinding {
  assetId: string;
  source: AssetCandidate;
  usedBySceneIds: string[];
  status: "BOUND" | "MISSING" | "DUPLICATE" | "UNSUPPORTED" | "UNREADABLE";
}
```

## 3. Supported media policy

MVP visual asset wajib mendukung PNG.

Ekstensi lain hanya boleh ditambahkan setelah adapter/import test nyata tersedia. Jangan menganggap format yang dapat dibuka OS pasti aman di Premiere UXP.

## 4. Binding rules

1. Enumerasi folder input sekali.
2. Canonicalize logical ID tanpa mengubah nama file fisik.
3. Buat map `assetId -> candidates[]`.
4. Cocokkan seluruh `SceneAssetRef` sebelum import Premiere.
5. Semua required reference harus `BOUND` sebelum mutation.

## 5. Duplicate handling

Jika ada:

- `A001.png`
- `A001.PNG`
- `A001 copy.png`

maka hanya file yang benar-benar menghasilkan logical ID `A001` masuk kandidat canonical. Bila lebih dari satu kandidat canonical mempunyai ID sama, status = `DUPLICATE` dan generate diblokir.

Binder tidak memilih file berdasarkan modified-time atau ukuran.

## 6. Missing asset

Required asset yang tidak ditemukan menghasilkan:

`ASSET_MISSING`

Issue harus menyertakan:
- assetId;
- sceneId yang membutuhkan;
- folder input;
- suggested action.

## 7. Unused asset

Asset canonical yang ada di folder tetapi tidak dirujuk scene menghasilkan warning:

`ASSET_UNUSED`

Tidak memblokir generate.

## 8. Stable source fingerprint

Binder harus dapat membuat fingerprint deterministik untuk source-set, minimal berdasarkan:
- sorted logical IDs;
- normalized filenames;
- file size bila tersedia.

Tujuannya mendeteksi perubahan input antar composer run tanpa membaca pixel seluruh PNG.

## 9. Premiere import boundary

Binder domain tidak memanggil Premiere API.

Alur:

`DOCX parser -> binder plan -> validation -> PremiereMediaAdapter.importBindings()`

Premiere adapter bertanggung jawab untuk:
- dedicated bin;
- import;
- duplicate import avoidance;
- readback ProjectItem;
- mapping `assetId -> ProjectItem identity`.

## 10. Rerun behavior

Pada rerun:
- asset source sama + imported item masih ada = reuse;
- path berubah tetapi logical ID sama = validation/relink decision;
- source berubah = mark binding changed;
- generated clip yang diedit user tidak boleh otomatis diganti sebelum policy menentukan aman.

## 11. Fixture minimum

- F-ASSET-01 A001–A003 valid PNG.
- F-ASSET-02 A002 missing.
- F-ASSET-03 duplicate canonical A001.
- F-ASSET-04 unsupported extension.
- F-ASSET-05 unused A099.
- F-ASSET-06 100 canonical assets.

## 12. Acceptance criteria

- hasil binding deterministic;
- zero Premiere mutation sebelum validation selesai;
- duplicate tidak dipilih diam-diam;
- missing required memblokir composer;
- unused hanya warning;
- 100-file fixture selesai tanpa mismatch ID;
- unit test tidak membutuhkan Premiere host.