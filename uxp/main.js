const { entrypoints, host, versions, storage } = require("uxp");
const os = require("os");
const app = require("premierepro");

const localFileSystem = storage.localFileSystem;
const MIN_PREMIERE = "25.6.0";
const PERSISTENCE_FILE = "s03-persistent-state.json";
const GENERATED_BIN_NAME = "AAVC_GENERATED";
const S06_SEQUENCE_NAME = "AAVC_SPIKE_S06";

const runtime = {
  panelCreated: false,
  panelShown: false,
  pickedFile: null,
  pickedFolder: null,
  canonicalAssets: [],
  canonicalAssetEntries: [],
  wroteState: false,
  readState: false,
  project: null,
  rootItem: null,
  insertionBin: null,
  generatedBin: null,
  importedClips: [],
  createdSequence: null,
  statuses: {
    s01: "NOT RUN",
    s02: "NOT RUN",
    s03: "NOT RUN",
    s04: "NOT RUN",
    s05: "NOT RUN",
    s06: "NOT RUN"
  }
};

function el(id) {
  return document.getElementById(id);
}

function nowIso() {
  return new Date().toISOString();
}

function log(message, level = "INFO") {
  const line = `[${nowIso()}] [${level}] ${message}`;
  console.log(line);
  const node = el("log");
  if (node) {
    node.textContent += `${line}\n`;
    node.scrollTop = node.scrollHeight;
  }
}

function errorToText(error) {
  if (!error) return "Unknown error";
  if (error.stack) return `${error.message || error}\n${error.stack}`;
  return String(error.message || error);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return String(value);
  } catch (_) {
    return fallback;
  }
}

function setBadge(id, status) {
  const node = el(id);
  if (!node) return;
  node.textContent = status;
  node.className = "badge badge-neutral";
  if (status === "PASS") node.className = "badge badge-pass";
  else if (status === "PASS_WITH_LIMIT") node.className = "badge badge-warn";
  else if (status === "FAIL" || status === "BLOCKED_BY_VERSION") node.className = "badge badge-fail";
}

function setStatus(spike, status) {
  runtime.statuses[spike] = status;
  setBadge(`${spike}Badge`, status);
  updateOverallStatus();
}

function updateOverallStatus() {
  const values = Object.values(runtime.statuses);
  let overall = "NOT RUN";
  if (values.includes("FAIL") || values.includes("BLOCKED_BY_VERSION")) overall = "FAIL";
  else if (values.every((v) => v === "PASS")) overall = "PASS";
  else if (values.some((v) => v === "PASS_WITH_LIMIT")) overall = "PASS_WITH_LIMIT";
  else if (values.some((v) => v === "PASS")) overall = "PASS_WITH_LIMIT";
  setBadge("overallBadge", overall);
}

function normalizeVersion(input) {
  const matches = String(input || "").match(/\d+/g) || [];
  return [0, 1, 2].map((i) => Number(matches[i] || 0));
}

function isVersionAtLeast(current, minimum) {
  const a = normalizeVersion(current);
  const b = normalizeVersion(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

function renderLifecycle() {
  const node = el("panelLifecycle");
  if (!node) return;
  node.textContent = `created=${runtime.panelCreated}, shown=${runtime.panelShown}`;
}

function collectHostInfo() {
  return {
    hostName: host.name,
    hostVersion: host.version,
    uxpVersion: versions.uxp,
    pluginVersion: versions.plugin,
    locale: host.uiLocale,
    osPlatform: os.platform(),
    osRelease: os.release(),
    architecture: os.arch()
  };
}

function renderHostInfo(info) {
  el("hostName").textContent = info.hostName || "—";
  el("hostVersion").textContent = info.hostVersion || "—";
  el("uxpVersion").textContent = info.uxpVersion || "—";
  el("pluginVersion").textContent = info.pluginVersion || "—";
  el("localeInfo").textContent = info.locale || "—";
  el("osInfo").textContent = `${info.osPlatform || "—"} ${info.osRelease || ""}`.trim();
  el("archInfo").textContent = info.architecture || "—";
}

function runS01() {
  try {
    renderLifecycle();
    el("pluginVersion").textContent = versions.plugin || "unknown";
    const ok = Boolean(runtime.panelCreated && runtime.panelShown && versions.plugin);
    if (ok) {
      setStatus("s01", "PASS");
      log("S01 PASS — panel lifecycle and plugin runtime are active.");
    } else {
      setStatus("s01", "PASS_WITH_LIMIT");
      log("S01 PASS_WITH_LIMIT — runtime active, but lifecycle evidence is incomplete.", "WARN");
    }
  } catch (error) {
    setStatus("s01", "FAIL");
    log(`S01 FAIL — ${errorToText(error)}`, "ERROR");
  }
}

function runS02() {
  try {
    const info = collectHostInfo();
    renderHostInfo(info);

    const hostLooksCorrect = String(info.hostName || "").toLowerCase().includes("premiere");
    const versionOk = isVersionAtLeast(info.hostVersion, MIN_PREMIERE);
    const message = el("versionMessage");

    if (!hostLooksCorrect) {
      message.className = "notice fail";
      message.textContent = `Host tidak sesuai: ${info.hostName}. Plugin ini hanya untuk Premiere Pro.`;
      setStatus("s02", "FAIL");
      log(`S02 FAIL — unexpected host ${info.hostName}.`, "ERROR");
      return;
    }

    if (!versionOk) {
      message.className = "notice fail";
      message.textContent = `Premiere ${info.hostVersion} terlalu lama. Minimum ${MIN_PREMIERE}.`;
      setStatus("s02", "BLOCKED_BY_VERSION");
      log(`S02 BLOCKED_BY_VERSION — Premiere ${info.hostVersion}, minimum ${MIN_PREMIERE}.`, "ERROR");
      return;
    }

    message.className = "notice pass";
    message.textContent = `Compatible: Premiere ${info.hostVersion} ≥ ${MIN_PREMIERE}`;
    setStatus("s02", "PASS");
    log(`S02 PASS — ${info.hostName} ${info.hostVersion}, UXP ${info.uxpVersion}, ${info.osPlatform}/${info.architecture}.`);
  } catch (error) {
    setStatus("s02", "FAIL");
    log(`S02 FAIL — ${errorToText(error)}`, "ERROR");
  }
}

async function pickPng() {
  try {
    const picked = await localFileSystem.getFileForOpening({
      allowMultiple: false,
      types: ["png"]
    });
    if (!picked) {
      log("S03 PNG picker cancelled.", "WARN");
      return;
    }
    runtime.pickedFile = picked;
    el("pickedFile").textContent = picked.nativePath || picked.name;
    log(`S03 selected PNG: ${picked.name}`);
  } catch (error) {
    setStatus("s03", "FAIL");
    log(`S03 PNG picker failed — ${errorToText(error)}`, "ERROR");
  }
}

async function pickAssetFolder() {
  try {
    const folder = await localFileSystem.getFolder();
    if (!folder) {
      log("S03 folder picker cancelled.", "WARN");
      return;
    }

    const entries = await folder.getEntries();
    const canonicalEntries = entries
      .filter((entry) => entry && entry.isFile && /^A\d{3,}\.(png|jpe?g|webp)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    runtime.pickedFolder = folder;
    runtime.canonicalAssetEntries = canonicalEntries;
    runtime.canonicalAssets = canonicalEntries.map((entry) => entry.name);

    el("pickedFolder").textContent = folder.nativePath || folder.name;
    el("assetCount").textContent = String(runtime.canonicalAssets.length);
    el("assetPreview").textContent = runtime.canonicalAssets.length
      ? runtime.canonicalAssets.slice(0, 20).join(", ") + (runtime.canonicalAssets.length > 20 ? " …" : "")
      : "Tidak ada file canonical Axxx yang ditemukan di level folder ini.";

    log(`S03 folder selected: ${folder.name}; canonical assets=${runtime.canonicalAssets.length}.`);
  } catch (error) {
    setStatus("s03", "FAIL");
    log(`S03 folder enumeration failed — ${errorToText(error)}`, "ERROR");
  }
}

async function writePersistentState() {
  try {
    const dataFolder = await localFileSystem.getDataFolder();
    const file = await dataFolder.createFile(PERSISTENCE_FILE, { overwrite: true });
    const payload = {
      schema: 1,
      spike: "S03",
      writtenAt: nowIso(),
      host: collectHostInfo(),
      selectedPngName: runtime.pickedFile ? runtime.pickedFile.name : null,
      selectedFolderName: runtime.pickedFolder ? runtime.pickedFolder.name : null,
      canonicalAssetCount: runtime.canonicalAssets.length,
      canonicalAssetSample: runtime.canonicalAssets.slice(0, 20)
    };
    await file.write(JSON.stringify(payload, null, 2));
    runtime.wroteState = true;
    el("statePreview").textContent = JSON.stringify(payload, null, 2);
    log(`S03 persistent state written: plugin-data/${PERSISTENCE_FILE}.`);
  } catch (error) {
    setStatus("s03", "FAIL");
    log(`S03 state write failed — ${errorToText(error)}`, "ERROR");
  }
}

async function readPersistentState() {
  try {
    const dataFolder = await localFileSystem.getDataFolder();
    const file = await dataFolder.getEntry(PERSISTENCE_FILE);
    const text = await file.read();
    const payload = JSON.parse(text);
    runtime.readState = true;
    el("statePreview").textContent = JSON.stringify(payload, null, 2);
    log(`S03 persistent state read successfully; writtenAt=${payload.writtenAt || "unknown"}.`);
  } catch (error) {
    runtime.readState = false;
    log(`S03 state read unavailable — write it once first, then restart/reload and read again. ${error.message || error}`, "WARN");
  }
}

function runS03Summary() {
  if (runtime.statuses.s03 === "FAIL") return;

  const selectedFile = Boolean(runtime.pickedFile);
  const selectedFolder = Boolean(runtime.pickedFolder);
  const persistenceProven = Boolean(runtime.wroteState && runtime.readState);

  if (selectedFile && selectedFolder && persistenceProven) {
    setStatus("s03", "PASS");
    log("S03 PASS — file picker, folder enumeration, state write and state read succeeded. Restart persistence still needs the manual checklist confirmation.");
  } else {
    setStatus("s03", "PASS_WITH_LIMIT");
    log(`S03 PASS_WITH_LIMIT — file=${selectedFile}, folder=${selectedFolder}, write/read=${persistenceProven}. Complete all controls and perform restart test.`, "WARN");
  }
}

async function getProjectContext() {
  const project = await app.Project.getActiveProject();
  if (!project) {
    throw new Error("Tidak ada active project. Buka atau buat project Premiere terlebih dahulu.");
  }
  const rootItem = await project.getRootItem();
  const insertionBin = await project.getInsertionBin();
  const sequences = await project.getSequences();
  return { project, rootItem, insertionBin, sequences };
}

async function runS04() {
  try {
    const context = await getProjectContext();
    runtime.project = context.project;
    runtime.rootItem = context.rootItem;
    runtime.insertionBin = context.insertionBin;

    const rootChildren = context.rootItem ? await context.rootItem.getItems() : [];
    let activeSequence = null;
    try {
      activeSequence = await context.project.getActiveSequence();
    } catch (_) {
      activeSequence = null;
    }

    el("projectName").textContent = safeText(context.project.name);
    el("projectGuid").textContent = safeText(context.project.guid);
    el("projectPath").textContent = safeText(context.project.path, "(project belum disimpan / path kosong)");
    el("rootItemName").textContent = context.rootItem ? safeText(context.rootItem.name, "(root)") : "—";
    el("insertionBinName").textContent = context.insertionBin ? safeText(context.insertionBin.name, "(root)") : "—";
    el("sequenceCount").textContent = String(context.sequences.length);
    el("activeSequenceName").textContent = activeSequence ? safeText(activeSequence.name) : "(tidak ada active sequence)";
    el("rootChildCount").textContent = String(rootChildren.length);

    const ok = Boolean(context.project && context.rootItem && Array.isArray(context.sequences));
    if (!ok) {
      setStatus("s04", "FAIL");
      log("S04 FAIL — project object ditemukan tetapi root/sequences tidak lengkap.", "ERROR");
      return;
    }

    setStatus("s04", "PASS");
    log(`S04 PASS — project=${context.project.name}, sequences=${context.sequences.length}, rootChildren=${rootChildren.length}.`);
  } catch (error) {
    setStatus("s04", "FAIL");
    log(`S04 FAIL — ${errorToText(error)}`, "ERROR");
  }
}

function tryCastFolder(projectItem) {
  if (!projectItem) return null;
  try {
    return app.FolderItem.cast(projectItem);
  } catch (_) {
    return null;
  }
}

function tryCastClip(projectItem) {
  if (!projectItem) return null;
  try {
    return app.ClipProjectItem.cast(projectItem);
  } catch (_) {
    return null;
  }
}

function toProjectItem(item) {
  try {
    return app.ProjectItem.cast(item);
  } catch (_) {
    return item;
  }
}

async function findChildFolderByName(folderItem, name) {
  const items = await folderItem.getItems();
  for (const item of items) {
    if (safeText(item.name, "") !== name) continue;
    const folder = tryCastFolder(item);
    if (folder) return folder;
  }
  return null;
}

async function ensureGeneratedBin(project, rootItem) {
  let folder = await findChildFolderByName(rootItem, GENERATED_BIN_NAME);
  if (folder) {
    log(`S05 using existing bin ${GENERATED_BIN_NAME}.`);
    return folder;
  }

  project.lockedAccess(() => {
    const action = rootItem.createBinAction(GENERATED_BIN_NAME, false);
    const success = project.executeTransaction((compoundAction) => {
      compoundAction.addAction(action);
    }, "AAVC: Create Generated Bin");

    if (!success) {
      throw new Error("executeTransaction returned false while creating generated bin.");
    }
  });

  folder = await findChildFolderByName(rootItem, GENERATED_BIN_NAME);
  if (!folder) {
    throw new Error(`Bin ${GENERATED_BIN_NAME} tidak ditemukan setelah transaction.`);
  }

  log(`S05 created bin ${GENERATED_BIN_NAME}.`);
  return folder;
}

function canonicalKeyFromName(name) {
  const match = String(name || "").match(/^(A\d{3,})(?:\.[^.]+)?$/i);
  return match ? match[1].toUpperCase() : null;
}

async function collectCanonicalClips(folderItem, keys) {
  const wanted = new Set(keys.map((key) => key.toUpperCase()));
  const result = [];
  const items = await folderItem.getItems();

  for (const item of items) {
    const key = canonicalKeyFromName(item.name);
    if (!key || !wanted.has(key)) continue;
    const clip = tryCastClip(item);
    if (clip) result.push({ key, clip, item });
  }

  return result;
}

function selectedCanonicalEntries(limit = 2) {
  return runtime.canonicalAssetEntries.slice(0, limit);
}

async function runS05() {
  try {
    if (!runtime.pickedFolder || runtime.canonicalAssetEntries.length < 2) {
      throw new Error("S05 membutuhkan folder aset dari S03 dengan minimal dua file canonical Axxx.");
    }

    const context = await getProjectContext();
    runtime.project = context.project;
    runtime.rootItem = context.rootItem;

    const generatedBin = await ensureGeneratedBin(context.project, context.rootItem);
    runtime.generatedBin = generatedBin;

    const selected = selectedCanonicalEntries(2);
    const keys = selected.map((entry) => canonicalKeyFromName(entry.name)).filter(Boolean);
    const paths = selected.map((entry) => entry.nativePath).filter(Boolean);

    if (paths.length !== selected.length) {
      throw new Error("Satu atau lebih file fixture tidak menyediakan nativePath. Pilih ulang folder melalui S03.");
    }

    const before = await collectCanonicalClips(generatedBin, keys);
    const import1 = await context.project.importFiles(paths, true, toProjectItem(generatedBin), false);
    const afterFirst = await collectCanonicalClips(generatedBin, keys);

    const import2 = await context.project.importFiles(paths, true, toProjectItem(generatedBin), false);
    const afterSecond = await collectCanonicalClips(generatedBin, keys);

    runtime.importedClips = [];
    for (const key of keys) {
      const match = afterSecond.find((entry) => entry.key === key);
      if (match && !runtime.importedClips.includes(match.clip)) {
        runtime.importedClips.push(match.clip);
      }
    }

    const duplicateDelta = afterSecond.length - afterFirst.length;
    const payload = {
      targetBin: GENERATED_BIN_NAME,
      files: selected.map((entry) => entry.name),
      import1,
      import2,
      matchingClipsBefore: before.length,
      matchingClipsAfterFirst: afterFirst.length,
      matchingClipsAfterSecond: afterSecond.length,
      duplicateDelta,
      uniqueClipKeysReady: runtime.importedClips.length
    };

    el("s05Result").textContent = JSON.stringify(payload, null, 2);

    const importedEnough = runtime.importedClips.length >= 2;
    if (!import1 || !importedEnough) {
      setStatus("s05", "FAIL");
      log(`S05 FAIL — import1=${import1}, unique clips ready=${runtime.importedClips.length}.`, "ERROR");
      return;
    }

    if (duplicateDelta > 0) {
      setStatus("s05", "PASS_WITH_LIMIT");
      log(`S05 PASS_WITH_LIMIT — import berhasil, tetapi second import menambah ${duplicateDelta} matching item(s). Strategi anti-duplikasi wajib di production.`, "WARN");
    } else {
      setStatus("s05", "PASS");
      log("S05 PASS — Axxx import berhasil dan second import tidak menambah matching item baru.");
    }
  } catch (error) {
    setStatus("s05", "FAIL");
    log(`S05 FAIL — ${errorToText(error)}`, "ERROR");
  }
}

async function getImportedClipsForS06(project, generatedBin) {
  if (runtime.importedClips.length >= 2) return runtime.importedClips.slice(0, 2);

  const keys = selectedCanonicalEntries(2)
    .map((entry) => canonicalKeyFromName(entry.name))
    .filter(Boolean);

  if (keys.length < 2) return [];

  const matches = await collectCanonicalClips(generatedBin, keys);
  const clips = [];
  for (const key of keys) {
    const match = matches.find((entry) => entry.key === key);
    if (match) clips.push(match.clip);
  }
  return clips;
}

async function runS06() {
  try {
    const context = await getProjectContext();
    runtime.project = context.project;
    runtime.rootItem = context.rootItem;

    const generatedBin = runtime.generatedBin || await findChildFolderByName(context.rootItem, GENERATED_BIN_NAME);
    if (!generatedBin) {
      throw new Error(`Bin ${GENERATED_BIN_NAME} belum ada. Jalankan S05 terlebih dahulu.`);
    }
    runtime.generatedBin = generatedBin;

    const clips = await getImportedClipsForS06(context.project, generatedBin);
    if (clips.length < 2) {
      throw new Error("S06 membutuhkan minimal dua ClipProjectItem hasil S05.");
    }

    const existingSequences = await context.project.getSequences();
    let sequence = existingSequences.find((item) => safeText(item.name, "") === S06_SEQUENCE_NAME) || null;
    let createdNow = false;

    if (!sequence) {
      sequence = await context.project.createSequenceFromMedia(
        S06_SEQUENCE_NAME,
        clips.slice(0, 2),
        toProjectItem(generatedBin)
      );
      createdNow = Boolean(sequence);
    }

    if (!sequence) {
      throw new Error("createSequenceFromMedia tidak mengembalikan Sequence.");
    }

    runtime.createdSequence = sequence;

    let setActiveResult = null;
    try {
      setActiveResult = await context.project.setActiveSequence(sequence);
    } catch (error) {
      log(`S06 note — setActiveSequence failed: ${error.message || error}`, "WARN");
    }

    let openedResult = null;
    try {
      openedResult = await context.project.openSequence(sequence);
    } catch (error) {
      log(`S06 note — openSequence failed: ${error.message || error}`, "WARN");
    }

    const sequencesAfter = await context.project.getSequences();
    const readback = sequencesAfter.find((item) => safeText(item.name, "") === S06_SEQUENCE_NAME) || null;
    const videoTrackCount = await sequence.getVideoTrackCount();
    const audioTrackCount = await sequence.getAudioTrackCount();
    const frameSize = await sequence.getFrameSize();
    const timebase = await sequence.getTimebase();
    const endTime = await sequence.getEndTime();

    const payload = {
      strategy: "Project.createSequenceFromMedia",
      baseline: "Premiere 25.6+",
      sequenceName: sequence.name,
      sequenceGuid: safeText(sequence.guid),
      createdNow,
      readbackFound: Boolean(readback),
      setActiveResult,
      openedResult,
      videoTrackCount,
      audioTrackCount,
      frameSize: frameSize ? { x: frameSize.x, y: frameSize.y, width: frameSize.width, height: frameSize.height } : null,
      timebase: safeText(timebase),
      endTimeTicks: endTime ? safeText(endTime.ticks) : null
    };

    el("s06Result").textContent = JSON.stringify(payload, null, 2);
    el("createdSequenceName").textContent = sequence.name || "—";
    el("createdSequenceTracks").textContent = `V=${videoTrackCount}, A=${audioTrackCount}`;

    if (!readback) {
      setStatus("s06", "FAIL");
      log("S06 FAIL — sequence returned but was not found in getSequences() readback.", "ERROR");
      return;
    }

    if (!createdNow) {
      setStatus("s06", "PASS_WITH_LIMIT");
      log(`S06 PASS_WITH_LIMIT — existing ${S06_SEQUENCE_NAME} found and read back. Delete it manually if you need to re-prove creation.`, "WARN");
      return;
    }

    setStatus("s06", "PASS");
    log(`S06 PASS — sequence ${S06_SEQUENCE_NAME} created from media; V=${videoTrackCount}, A=${audioTrackCount}.`);
  } catch (error) {
    setStatus("s06", "FAIL");
    log(`S06 FAIL — ${errorToText(error)}`, "ERROR");
  }
}

function wireUi() {
  el("runS01").addEventListener("click", runS01);
  el("runS02").addEventListener("click", runS02);
  el("pickImage").addEventListener("click", pickPng);
  el("pickFolder").addEventListener("click", pickAssetFolder);
  el("writeState").addEventListener("click", writePersistentState);
  el("readState").addEventListener("click", readPersistentState);
  el("runS03").addEventListener("click", runS03Summary);
  el("runS04").addEventListener("click", runS04);
  el("runS05").addEventListener("click", runS05);
  el("runS06").addEventListener("click", runS06);
  el("clearLog").addEventListener("click", () => { el("log").textContent = ""; });
}

function initializeDom() {
  wireUi();
  renderLifecycle();
  renderHostInfo(collectHostInfo());
  log("Diagnostics UI initialized. Batch A S01–S03 + Batch B S04–S06 are implemented.");
}

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("error", (event) => {
    log(`Global error — ${event.message || "unknown"}`, "ERROR");
  });
  window.addEventListener("unhandledrejection", (event) => {
    log(`Unhandled rejection — ${errorToText(event.reason)}`, "ERROR");
  });
}

entrypoints.setup({
  plugin: {
    create() {
      console.log("[AAVC] plugin create");
    },
    destroy() {
      console.log("[AAVC] plugin destroy");
    }
  },
  panels: {
    aavcDiagnosticsPanel: {
      create() {
        runtime.panelCreated = true;
        renderLifecycle();
        log("Panel lifecycle: create");
      },
      show() {
        runtime.panelShown = true;
        renderLifecycle();
        log("Panel lifecycle: show");
      },
      hide() {
        runtime.panelShown = false;
        renderLifecycle();
        log("Panel lifecycle: hide");
      },
      destroy() {
        runtime.panelCreated = false;
        runtime.panelShown = false;
        console.log("[AAVC] panel destroy");
      }
    }
  }
});

initializeDom();
