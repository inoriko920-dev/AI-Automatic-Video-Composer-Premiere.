const pproE = require("premierepro");
const { host: uxpHostE, versions: uxpVersionsE, storage: uxpStorageE } = require("uxp");

const eFS = uxpStorageE.localFileSystem;
const E_SEQUENCE_NAME = "AAVC_SPIKE_S07_S08";
const E_IDENTITY_FILE = "s12-identity-state.json";
const E_PROJECT_ROLE_KEY = "aavc.identity.projectRole";
const E_SEQUENCE_ROLE_KEY = "aavc.identity.sequenceRole";
const E_SCHEMA_KEY = "aavc.identity.schema";
const E_PROJECT_ROLE = "AAVC_TEST_PROJECT";
const E_SEQUENCE_ROLE = "AAVC_COMPOSER_SEQUENCE";

const batchE = {
  statuses: { s12: "NOT RUN", s13: "NOT RUN", s14: "NOT RUN", s15: "NOT RUN", s16: "NOT RUN" },
  outputFolder: null,
  presetFile: null,
  mogrtFile: null
};

function eEl(id) { return document.getElementById(id); }
function eNow() { return new Date().toISOString(); }
function eText(value, fallback = "—") { return value === null || value === undefined || value === "" ? fallback : String(value); }
function eLog(message, level = "INFO") {
  const line = `[${eNow()}] [${level}] ${message}`;
  console.log(line);
  const node = eEl("log");
  if (node) { node.textContent += `${line}\n`; node.scrollTop = node.scrollHeight; }
}
function eError(error) {
  if (!error) return "Unknown error";
  if (error.stack) return `${error.message || error}\n${error.stack}`;
  return String(error.message || error);
}
function eSetBadge(id, status) {
  const node = eEl(id);
  if (!node) return;
  node.textContent = status;
  node.className = "badge badge-neutral";
  if (status === "PASS") node.className = "badge badge-pass";
  else if (status === "PASS_WITH_LIMIT") node.className = "badge badge-warn";
  else if (status === "FAIL" || status === "BLOCKED_BY_VERSION") node.className = "badge badge-fail";
}
function eSetStatus(spike, status) {
  batchE.statuses[spike] = status;
  eSetBadge(`${spike}Badge`, status);
  eUpdateOverall();
}
function eUpdateOverall() {
  const values = [];
  for (let i = 1; i <= 16; i += 1) {
    const node = eEl(`s${String(i).padStart(2, "0")}Badge`);
    if (node) values.push(String(node.textContent || "NOT RUN"));
  }
  if (!values.length) return;
  let overall = "NOT RUN";
  if (values.some((v) => v === "FAIL" || v === "BLOCKED_BY_VERSION")) overall = "FAIL";
  else if (values.every((v) => v === "PASS")) overall = "PASS";
  else if (values.some((v) => v === "PASS" || v === "PASS_WITH_LIMIT")) overall = "PASS_WITH_LIMIT";
  eSetBadge("overallBadge", overall);
}

async function eProjectSequence() {
  const project = await pproE.Project.getActiveProject();
  if (!project) throw new Error("Tidak ada active project Premiere.");
  const sequences = await project.getSequences();
  const sequence = sequences.find((item) => String(item.name || "") === E_SEQUENCE_NAME) || await project.getActiveSequence();
  if (!sequence) throw new Error(`Sequence ${E_SEQUENCE_NAME} atau active sequence tidak ditemukan.`);
  return { project, sequence };
}

async function eWriteIdentityBackup(payload) {
  const dataFolder = await eFS.getDataFolder();
  const file = await dataFolder.createFile(E_IDENTITY_FILE, { overwrite: true });
  await file.write(JSON.stringify(payload, null, 2));
}
async function eReadIdentityBackup() {
  const dataFolder = await eFS.getDataFolder();
  const file = await dataFolder.getEntry(E_IDENTITY_FILE);
  return JSON.parse(await file.read());
}
async function eReadIdentityProperties(project, sequence) {
  const projectProps = await pproE.Properties.getProperties(project);
  const sequenceProps = await pproE.Properties.getProperties(sequence);
  return {
    projectRole: projectProps.hasValue(E_PROJECT_ROLE_KEY) ? projectProps.getValue(E_PROJECT_ROLE_KEY) : null,
    sequenceRole: sequenceProps.hasValue(E_SEQUENCE_ROLE_KEY) ? sequenceProps.getValue(E_SEQUENCE_ROLE_KEY) : null,
    projectSchema: projectProps.hasValue(E_SCHEMA_KEY) ? projectProps.getValue(E_SCHEMA_KEY) : null,
    sequenceSchema: sequenceProps.hasValue(E_SCHEMA_KEY) ? sequenceProps.getValue(E_SCHEMA_KEY) : null
  };
}

async function runS12() {
  try {
    const { project, sequence } = await eProjectSequence();
    const projectProps = await pproE.Properties.getProperties(project);
    const sequenceProps = await pproE.Properties.getProperties(sequence);

    project.lockedAccess(() => {
      const actions = [
        projectProps.createSetValueAction(E_PROJECT_ROLE_KEY, E_PROJECT_ROLE, pproE.Constants.PropertyType.PERSISTENT),
        projectProps.createSetValueAction(E_SCHEMA_KEY, "1", pproE.Constants.PropertyType.PERSISTENT),
        sequenceProps.createSetValueAction(E_SEQUENCE_ROLE_KEY, E_SEQUENCE_ROLE, pproE.Constants.PropertyType.PERSISTENT),
        sequenceProps.createSetValueAction(E_SCHEMA_KEY, "1", pproE.Constants.PropertyType.PERSISTENT)
      ];
      const ok = project.executeTransaction((compoundAction) => {
        for (const action of actions) compoundAction.addAction(action);
      }, "AAVC S12: Persist identity tags");
      if (!ok) throw new Error("executeTransaction returned false for S12 identity tags.");
    });

    const props = await eReadIdentityProperties(project, sequence);
    const payload = {
      schema: 1,
      writtenAt: eNow(),
      projectGuid: eText(project.guid),
      projectName: eText(project.name),
      sequenceGuid: eText(sequence.guid),
      sequenceName: eText(sequence.name),
      properties: props
    };
    await eWriteIdentityBackup(payload);
    const backup = await eReadIdentityBackup();
    const propertyOk = props.projectRole === E_PROJECT_ROLE && props.sequenceRole === E_SEQUENCE_ROLE && props.projectSchema === "1" && props.sequenceSchema === "1";
    const backupOk = backup.projectGuid === payload.projectGuid && backup.sequenceGuid === payload.sequenceGuid;

    eEl("s12Result").textContent = JSON.stringify({ propertyOk, backupOk, payload, readback: backup }, null, 2);
    eEl("s12Identity").textContent = propertyOk && backupOk ? "written + read back" : "mismatch";
    if (!propertyOk || !backupOk) {
      eSetStatus("s12", "FAIL");
      eLog("S12 FAIL — persistent property atau JSON readback mismatch.", "ERROR");
      return;
    }
    eSetStatus("s12", "PASS_WITH_LIMIT");
    eLog("S12 PASS_WITH_LIMIT — identity tersimpan dan terbaca. Restart Premiere lalu gunakan Verify S12 Restart untuk bukti persistence penuh.", "WARN");
  } catch (error) {
    eSetStatus("s12", "FAIL");
    eLog(`S12 FAIL — ${eError(error)}`, "ERROR");
  }
}

async function verifyS12Restart() {
  try {
    const { project, sequence } = await eProjectSequence();
    const props = await eReadIdentityProperties(project, sequence);
    const backup = await eReadIdentityBackup();
    const current = { projectGuid: eText(project.guid), sequenceGuid: eText(sequence.guid) };
    const pass = props.projectRole === E_PROJECT_ROLE && props.sequenceRole === E_SEQUENCE_ROLE && backup.projectGuid === current.projectGuid && backup.sequenceGuid === current.sequenceGuid;
    eEl("s12Result").textContent = JSON.stringify({ current, props, backup, restartVerification: pass }, null, 2);
    eEl("s12Identity").textContent = pass ? "restart identity verified" : "restart mismatch";
    eSetStatus("s12", pass ? "PASS" : "FAIL");
    eLog(pass ? "S12 PASS — persistent identity survives reload/restart context." : "S12 FAIL — identity did not match current project/sequence after reload.", pass ? "INFO" : "ERROR");
  } catch (error) {
    eSetStatus("s12", "FAIL");
    eLog(`S12 restart verification failed — ${eError(error)}`, "ERROR");
  }
}

async function eFetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs))
  ]);
}

async function runS13() {
  const result = { domain: "https://httpbin.org", get: null, post: null, handledFailure: false };
  try {
    const getResponse = await eFetchWithTimeout("https://httpbin.org/get?probe=AAVC_S13", { method: "GET" });
    result.get = { ok: getResponse.ok, status: getResponse.status };
    if (getResponse.ok) await getResponse.json();

    const postResponse = await eFetchWithTimeout("https://httpbin.org/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probe: "AAVC_S13", timestamp: eNow() })
    });
    result.post = { ok: postResponse.ok, status: postResponse.status };
    if (postResponse.ok) await postResponse.json();

    const pass = Boolean(result.get.ok && result.post.ok);
    eEl("s13Result").textContent = JSON.stringify(result, null, 2);
    eEl("s13Network").textContent = pass ? "GET + POST allowed" : "request returned error";
    eSetStatus("s13", pass ? "PASS" : "FAIL");
    eLog(pass ? "S13 PASS — manifest network allowlist permits GET and POST." : "S13 FAIL — one or more network requests returned non-2xx.", pass ? "INFO" : "ERROR");
  } catch (error) {
    result.handledFailure = true;
    result.error = String(error.message || error);
    eEl("s13Result").textContent = JSON.stringify(result, null, 2);
    eEl("s13Network").textContent = "failure handled without crash";
    eSetStatus("s13", "FAIL");
    eLog(`S13 FAIL — network unavailable/blocked but failure was handled cleanly: ${eError(error)}`, "ERROR");
  }
}

async function pickS14OutputFolder() {
  try {
    const folder = await eFS.getFolder();
    if (!folder) return;
    batchE.outputFolder = folder;
    eEl("s14Output").textContent = folder.nativePath || folder.name;
    eLog(`S14 output folder selected: ${folder.nativePath || folder.name}`);
  } catch (error) { eLog(`S14 output folder picker failed — ${eError(error)}`, "ERROR"); }
}
async function pickS14Preset() {
  try {
    const file = await eFS.getFileForOpening({ allowMultiple: false, types: ["epr"] });
    if (!file) return;
    batchE.presetFile = file;
    eEl("s14Preset").textContent = file.nativePath || file.name;
    eLog(`S14 preset selected: ${file.name}`);
  } catch (error) { eLog(`S14 preset picker failed — ${eError(error)}`, "ERROR"); }
}
function eJoinPath(folderPath, fileName) {
  const sep = String(folderPath).includes("\\") ? "\\" : "/";
  return String(folderPath).replace(/[\\\/]$/, "") + sep + fileName;
}
function eSafeFilename(name) { return String(name || "AAVC_S14").replace(/[<>:"/\\|?*]+/g, "_").trim() || "AAVC_S14"; }

async function probeS14() {
  try {
    const { sequence } = await eProjectSequence();
    const manager = pproE.EncoderManager.getManager();
    const info = { isAMEInstalled: Boolean(manager.isAMEInstalled), sequence: sequence.name, presetSelected: Boolean(batchE.presetFile), outputFolderSelected: Boolean(batchE.outputFolder) };
    if (batchE.presetFile && batchE.presetFile.nativePath) {
      try { info.extension = await pproE.EncoderManager.getExportFileExtension(sequence, batchE.presetFile.nativePath); } catch (error) { info.extensionError = String(error.message || error); }
    }
    eEl("s14Result").textContent = JSON.stringify(info, null, 2);
    eEl("s14Encoder").textContent = info.isAMEInstalled ? "AME installed" : "AME not installed";
    eSetStatus("s14", info.isAMEInstalled ? "PASS_WITH_LIMIT" : "FAIL");
    eLog(info.isAMEInstalled ? "S14 probe ready — AME detected. Select output folder + EPR then queue export for full PASS." : "S14 FAIL — AME is not installed/detected.", info.isAMEInstalled ? "WARN" : "ERROR");
  } catch (error) {
    eSetStatus("s14", "FAIL");
    eLog(`S14 probe failed — ${eError(error)}`, "ERROR");
  }
}

async function queueS14() {
  try {
    if (!batchE.outputFolder || !batchE.outputFolder.nativePath) throw new Error("Pilih output folder lebih dulu.");
    if (!batchE.presetFile || !batchE.presetFile.nativePath) throw new Error("Pilih preset .epr lebih dulu.");
    const { sequence } = await eProjectSequence();
    const manager = pproE.EncoderManager.getManager();
    if (!manager.isAMEInstalled) throw new Error("Adobe Media Encoder tidak terdeteksi.");
    let extension = await pproE.EncoderManager.getExportFileExtension(sequence, batchE.presetFile.nativePath);
    extension = String(extension || "mp4").replace(/^\./, "");
    const outputFile = eJoinPath(batchE.outputFolder.nativePath, `${eSafeFilename(sequence.name)}_S14.${extension}`);
    const queued = await manager.exportSequence(sequence, pproE.Constants.ExportType.QUEUE_TO_AME, outputFile, batchE.presetFile.nativePath, true);
    const payload = { queued, exportType: "QUEUE_TO_AME", outputFile, presetFile: batchE.presetFile.nativePath, extension };
    eEl("s14Result").textContent = JSON.stringify(payload, null, 2);
    eEl("s14Encoder").textContent = queued ? "queued to AME" : "queue rejected";
    eSetStatus("s14", queued ? "PASS" : "FAIL");
    eLog(queued ? `S14 PASS — export queued to AME: ${outputFile}` : "S14 FAIL — EncoderManager.exportSequence returned false.", queued ? "INFO" : "ERROR");
  } catch (error) {
    eSetStatus("s14", "FAIL");
    eLog(`S14 queue failed — ${eError(error)}`, "ERROR");
  }
}

async function pickS15Mogrt() {
  try {
    const file = await eFS.getFileForOpening({ allowMultiple: false, types: ["mogrt"] });
    if (!file) return;
    batchE.mogrtFile = file;
    eEl("s15Mogrt").textContent = file.nativePath || file.name;
    eLog(`S15 MOGRT selected: ${file.name}`);
  } catch (error) { eLog(`S15 MOGRT picker failed — ${eError(error)}`, "ERROR"); }
}

async function runS15() {
  try {
    const { sequence } = await eProjectSequence();
    const installedMogrtPath = await pproE.SequenceEditor.getInstalledMogrtPath();
    if (!batchE.mogrtFile || !batchE.mogrtFile.nativePath) {
      eEl("s15Result").textContent = JSON.stringify({ installedMogrtPath, selectedMogrt: null, note: "Select a .mogrt file for insertion proof." }, null, 2);
      eSetStatus("s15", "PASS_WITH_LIMIT");
      eLog("S15 PASS_WITH_LIMIT — installed MOGRT path API works, but no .mogrt fixture selected for insertion.", "WARN");
      return;
    }

    const editor = pproE.SequenceEditor.getEditor(sequence);
    const returned = await Promise.resolve(editor.insertMogrtFromPath(batchE.mogrtFile.nativePath, pproE.TickTime.createWithSeconds(0), 2, 0));
    const items = Array.isArray(returned) ? returned : [];
    const itemInfo = [];
    for (const item of items) {
      const info = { hasComponentChain: typeof item.getComponentChain === "function" };
      if (info.hasComponentChain) {
        try {
          const chain = await item.getComponentChain();
          info.componentCount = chain.getComponentCount();
          info.components = [];
          for (let i = 0; i < info.componentCount; i += 1) {
            const component = chain.getComponentAtIndex(i);
            let displayName = "";
            let matchName = "";
            try { displayName = await component.getDisplayName(); } catch (_) {}
            try { matchName = await component.getMatchName(); } catch (_) {}
            const paramCount = component.getParamCount();
            const params = [];
            for (let p = 0; p < paramCount; p += 1) {
              const param = component.getParam(p);
              params.push(String(param.displayName || ""));
            }
            info.components.push({ displayName, matchName, paramCount, params });
          }
        } catch (error) { info.componentError = String(error.message || error); }
      }
      itemInfo.push(info);
    }
    const pass = items.length > 0;
    const payload = { installedMogrtPath, selectedMogrt: batchE.mogrtFile.nativePath, target: "V3 @ 0s", insertedItemCount: items.length, itemInfo };
    eEl("s15Result").textContent = JSON.stringify(payload, null, 2);
    eSetStatus("s15", pass ? "PASS" : "FAIL");
    eLog(pass ? `S15 PASS — MOGRT inserted; returned items=${items.length}.` : "S15 FAIL — insertMogrtFromPath returned no track items.", pass ? "INFO" : "ERROR");
  } catch (error) {
    eSetStatus("s15", "FAIL");
    eLog(`S15 FAIL — ${eError(error)}`, "ERROR");
  }
}

function runS16() {
  try {
    const info = {
      host: eText(uxpHostE.name),
      hostVersion: eText(uxpHostE.version),
      uxpVersion: eText(uxpVersionsE.uxp),
      pluginVersion: eText(uxpVersionsE.plugin),
      expectedPackageFormat: ".ccx",
      distributionHost: "premierepro",
      manualRequired: [
        "UDT Actions > Package",
        "Install generated .ccx through Creative Cloud Desktop",
        "Open Premiere > Window > UXP Plugins",
        "Run S01/S02 smoke test from packaged install",
        "Increment patch version and test reinstall/update"
      ]
    };
    eEl("s16Result").textContent = JSON.stringify(info, null, 2);
    eEl("s16Package").textContent = "static-ready; manual CCX test required";
    eSetStatus("s16", "PASS_WITH_LIMIT");
    eLog("S16 PASS_WITH_LIMIT — runtime/package prerequisites are present. Final PASS requires manual UDT package + CCX install smoke test.", "WARN");
  } catch (error) {
    eSetStatus("s16", "FAIL");
    eLog(`S16 readiness failed — ${eError(error)}`, "ERROR");
  }
}

function eWire() {
  const handlers = {
    runS12, verifyS12Restart, runS13, pickS14OutputFolder, pickS14Preset, probeS14, queueS14, pickS15Mogrt, runS15, runS16
  };
  for (const [id, handler] of Object.entries(handlers)) {
    const node = eEl(id);
    if (node) node.addEventListener("click", handler);
  }
  eLog("Batch E S12–S16 loaded. S14/S15/S16 require manual host-side verification for final PASS.");
}

eWire();