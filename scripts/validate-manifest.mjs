import fs from "node:fs";

const manifestPath = new URL("../uxp/manifest.json", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(manifest.manifestVersion === 5, "manifestVersion must be 5");
assert(manifest.host?.app === "premierepro", "host.app must be premierepro");
assert(manifest.host?.minVersion === "25.6.0", "host.minVersion must remain 25.6.0 for foundation baseline");
assert(manifest.requiredPermissions?.localFileSystem === "request", "localFileSystem permission must be request for S03");
assert(manifest.main === "index.html", "manifest.main must be index.html");
assert(Array.isArray(manifest.entrypoints) && manifest.entrypoints.length >= 1, "at least one entrypoint is required");

const diagnosticsPanel = (manifest.entrypoints || []).find((entry) => entry.id === "aavcDiagnosticsPanel");
assert(Boolean(diagnosticsPanel), "aavcDiagnosticsPanel entrypoint is required");
assert(diagnosticsPanel?.type === "panel", "aavcDiagnosticsPanel must be a panel");

if (failures.length > 0) {
  console.error("Manifest validation FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Manifest validation PASS");
console.log(`Plugin: ${manifest.name} v${manifest.version}`);
console.log(`Host: ${manifest.host.app} >= ${manifest.host.minVersion}`);
