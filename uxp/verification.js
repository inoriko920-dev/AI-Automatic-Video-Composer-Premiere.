const { host, versions, storage } = require("uxp");
const os = require("os");

const verifyFs = storage.localFileSystem;
const verificationState = { outputFolder: null };

function vEl(id) {
  return document.getElementById(id);
}

function vLog(message, level = "INFO") {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  const node = vEl("log");
  if (node) {
    node.textContent += `${line}\n`;
    node.scrollTop = node.scrollHeight;
  }
}

function vStatus(id) {
  const node = vEl(id);
  return node ? String(node.textContent || "NOT RUN").trim() : "NOT AVAILABLE";
}

function vText(id) {
  const node = vEl(id);
  return node ? String(node.textContent || "").trim() : null;
}

function vCollectStatuses() {
  const statuses = {};
  for (let i = 1; i <= 16; i += 1) {
    const key = `S${String(i).padStart(2, "0")}`;
    statuses[key] = vStatus(`s${String(i).padStart(2, "0")}Badge`);
  }
  return statuses;
}

function vGateDecision(statuses) {
  const mandatory = ["S07", "S08", "S10", "S11", "S12"];
  const failed = mandatory.filter((key) => statuses[key] !== "PASS");
  return {
    decision: failed.length ? "NO_GO" : "GO_CANDIDATE",
    mandatory,
    blockingOrUnverified: failed,
    note: failed.includes("S10")
      ? "S10 non-PASS may be resolved only by an explicit approved fallback ADR after real-host evidence."
      : "GO_CANDIDATE still requires human review of exported evidence before Stage 02."
  };
}

function vResultSnapshot() {
  const resultIds = [
    "statePreview",
    "s05Result", "s06Result", "s07Result", "s08Result",
    "s09Result", "s10Result", "s11Result",
    "s12Result", "s13Result", "s14Result", "s15Result", "s16Result"
  ];
  const results = {};
  for (const id of resultIds) {
    const text = vText(id);
    if (text) results[id] = text;
  }
  return results;
}

function vBuildReport() {
  const statuses = vCollectStatuses();
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    product: "AI Automatic Video Composer Premiere",
    foundationVersion: versions.plugin || null,
    host: {
      name: host.name || null,
      version: host.version || null,
      locale: host.uiLocale || null,
      uxpVersion: versions.uxp || null,
      osPlatform: os.platform(),
      osRelease: os.release(),
      architecture: os.arch()
    },
    statuses,
    gate: vGateDecision(statuses),
    results: vResultSnapshot(),
    diagnosticsLog: vText("log") || ""
  };
}

function vBuildTextSummary(report) {
  const lines = [];
  lines.push("AI AUTOMATIC VIDEO COMPOSER PREMIERE — FOUNDATION VERIFICATION");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Plugin: ${report.foundationVersion || "unknown"}`);
  lines.push(`Premiere: ${report.host.version || "unknown"}`);
  lines.push(`UXP: ${report.host.uxpVersion || "unknown"}`);
  lines.push(`Gate: ${report.gate.decision}`);
  lines.push("");
  for (const [key, value] of Object.entries(report.statuses)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("");
  lines.push(`Blocking/unverified: ${report.gate.blockingOrUnverified.join(", ") || "none"}`);
  lines.push(report.gate.note);
  return lines.join("\r\n");
}

async function vPickOutputFolder() {
  try {
    const folder = await verifyFs.getFolder();
    if (!folder) return;
    verificationState.outputFolder = folder;
    const label = vEl("verificationFolder");
    if (label) label.textContent = folder.nativePath || folder.name;
    vLog(`Verification output folder selected: ${folder.nativePath || folder.name}`);
  } catch (error) {
    vLog(`Verification folder picker failed — ${error.message || error}`, "ERROR");
  }
}

async function vExportReport() {
  try {
    if (!verificationState.outputFolder) {
      throw new Error("Pilih folder report terlebih dahulu.");
    }

    const report = vBuildReport();
    const stamp = report.generatedAt.replace(/[:.]/g, "-");
    const base = `aavc-foundation-report-${stamp}`;
    const jsonFile = await verificationState.outputFolder.createFile(`${base}.json`, { overwrite: true });
    await jsonFile.write(JSON.stringify(report, null, 2));
    const txtFile = await verificationState.outputFolder.createFile(`${base}.txt`, { overwrite: true });
    await txtFile.write(vBuildTextSummary(report));

    const result = vEl("verificationResult");
    if (result) {
      result.textContent = JSON.stringify({
        json: jsonFile.nativePath || jsonFile.name,
        text: txtFile.nativePath || txtFile.name,
        gate: report.gate
      }, null, 2);
    }
    vLog(`Verification report exported. Gate=${report.gate.decision}`);
  } catch (error) {
    vLog(`Verification export failed — ${error.message || error}`, "ERROR");
  }
}

function vWire() {
  const pick = vEl("pickVerificationFolder");
  const exportButton = vEl("exportVerificationReport");
  if (pick) pick.addEventListener("click", vPickOutputFolder);
  if (exportButton) exportButton.addEventListener("click", vExportReport);
  vLog("Verification report exporter loaded.");
}

vWire();
