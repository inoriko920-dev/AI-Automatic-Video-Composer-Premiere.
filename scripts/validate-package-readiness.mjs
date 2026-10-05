import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "uxp", "manifest.json");
const indexPath = path.join(root, "uxp", "index.html");

function fail(message) {
  console.error(`PACKAGE_READINESS_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(manifestPath)) fail("uxp/manifest.json is missing");
if (!fs.existsSync(indexPath)) fail("uxp/index.html is missing");
if (process.exitCode) process.exit();

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const html = fs.readFileSync(indexPath, "utf8");

if (manifest.manifestVersion !== 5) fail("manifestVersion must be 5");
if (!manifest.id || typeof manifest.id !== "string") fail("stable plugin id is required");
if (!/^\d+\.\d+\.\d+$/.test(String(manifest.version || ""))) fail("version must be semver x.y.z");
if (Array.isArray(manifest.host)) fail("distribution manifest must target a single host");
if (!manifest.host || manifest.host.app !== "premierepro") fail("host.app must be premierepro");
if (!manifest.host || manifest.host.minVersion !== "25.6.0") fail("baseline minVersion must remain 25.6.0");
if (manifest.main !== "index.html") fail("main must be index.html");

const requiredFiles = [
  "uxp/main.js",
  "uxp/batch-c.js",
  "uxp/batch-d.js",
  "uxp/batch-e.js",
  "uxp/styles.css"
];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) fail(`${relative} is missing`);
}

for (const script of ["main.js", "batch-c.js", "batch-d.js", "batch-e.js"]) {
  if (!html.includes(`src=\"${script}\"`)) fail(`index.html does not load ${script}`);
}

const domains = manifest.requiredPermissions?.network?.domains || [];
if (domains.some((domain) => domain === "*" || domain.includes("*://*"))) {
  fail("network wildcard is too broad for packaging readiness");
}

console.log("Package readiness static checks passed.");
console.log(`Plugin: ${manifest.id} v${manifest.version}`);
console.log(`Host: ${manifest.host.app} >= ${manifest.host.minVersion}`);
console.log(`Network domains: ${domains.length ? domains.join(", ") : "none"}`);
console.log("NOTE: final S16 PASS still requires UDT Package -> install .ccx -> packaged smoke test on a real Premiere host.");