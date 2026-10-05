const { entrypoints, host, versions, storage } = require("uxp");
const os = require("os");

const localFileSystem = storage.localFileSystem;
const MIN_PREMIERE = "25.6.0";
const PERSISTENCE_FILE = "s03-persistent-state.json";

const runtime = {
  panelCreated: false,
  panelShown: false,
  pickedFile: null,
  pickedFolder: null,
  canonicalAssets: [],
  wroteState: false,
  readState: false,
  statuses: { s01: "NOT RUN", s02: "NOT RUN", s03: "NOT RUN" }
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
  else if (values.some((v) => v === "PASS" || v === "PASS_WITH_LIMIT")) overall = "PASS_WITH_LIMIT";
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
    const canonical = entries
      .filter((entry) => entry && entry.isFile && /^A\d{3,}\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    runtime.pickedFolder = folder;
    runtime.canonicalAssets = canonical;

    el("pickedFolder").textContent = folder.nativePath || folder.name;
    el("assetCount").textContent = String(canonical.length);
    el("assetPreview").textContent = canonical.length
      ? canonical.slice(0, 20).join(", ") + (canonical.length > 20 ? " …" : "")
      : "Tidak ada file canonical Axxx yang ditemukan di level folder ini.";

    log(`S03 folder selected: ${folder.name}; canonical assets=${canonical.length}.`);
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

function wireUi() {
  el("runS01").addEventListener("click", runS01);
  el("runS02").addEventListener("click", runS02);
  el("pickImage").addEventListener("click", pickPng);
  el("pickFolder").addEventListener("click", pickAssetFolder);
  el("writeState").addEventListener("click", writePersistentState);
  el("readState").addEventListener("click", readPersistentState);
  el("runS03").addEventListener("click", runS03Summary);
  el("clearLog").addEventListener("click", () => { el("log").textContent = ""; });
}

function initializeDom() {
  wireUi();
  renderLifecycle();
  renderHostInfo(collectHostInfo());
  log("Diagnostics UI initialized. Run S01, S02, then complete all S03 controls.");
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
