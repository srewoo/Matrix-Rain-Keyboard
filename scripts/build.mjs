// Validates the extension and packages it into dist/.
//   dist/extension/                         unpacked build (what e2e tests load)
//   dist/digital-rain-keyboard-v<ver>.zip   Chrome Web Store upload
// Fails loudly on anything the Web Store would reject or that would ship broken.
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "extension");

// Allowlist: only these ship. Anything else (tests, assets, docs) stays out.
const FILES = [
  "manifest.json", "background.js", "config.js", "rain.js", "content.js",
  "popup.html", "popup.js", "icon16.png", "icon48.png", "icon128.png",
];

const errors = [];
const fail = (msg) => errors.push(msg);
const readJson = async (f) => JSON.parse(await readFile(path.join(ROOT, f), "utf8"));

const manifest = await readJson("manifest.json");
const pkg = await readJson("package.json");

if (manifest.version !== pkg.version) {
  fail(`manifest version ${manifest.version} != package.json ${pkg.version} (run: node scripts/sync-version.mjs)`);
}
if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
if (manifest.name.length > 75) fail(`name is ${manifest.name.length} chars (max 75)`);
if (manifest.description.length > 132) fail(`description is ${manifest.description.length} chars (max 132)`);

// Every file the manifest references must exist and be in the allowlist.
const referenced = new Set([
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((c) => c.js ?? []),
].filter(Boolean));
for (const f of referenced) if (!FILES.includes(f)) fail(`manifest references ${f}, missing from FILES`);

for (const f of FILES) {
  try {
    await stat(path.join(ROOT, f));
  } catch {
    fail(`missing file: ${f}`);
    continue;
  }
  if (!f.endsWith(".js")) continue;
  try {
    execFileSync(process.execPath, ["--check", path.join(ROOT, f)], { stdio: "pipe" });
  } catch (e) {
    fail(`syntax error in ${f}: ${e.stderr}`);
  }
  // Web Store policy: no remotely hosted or dynamically evaluated code.
  const src = await readFile(path.join(ROOT, f), "utf8");
  if (/\beval\s*\(|new\s+Function\s*\(|https?:\/\//.test(src)) fail(`${f}: eval/Function/remote URL found`);
}

if (errors.length) {
  console.error(`Build failed:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of FILES) await cp(path.join(ROOT, f), path.join(OUT, f));

const zip = path.join(DIST, `digital-rain-keyboard-v${manifest.version}.zip`);
execFileSync("zip", ["-q", "-X", "-r", zip, "."], { cwd: OUT }); // -X: no macOS metadata
const { size } = await stat(zip);
console.log(`Built ${path.relative(ROOT, zip)} (${(size / 1024).toFixed(1)} KB, ${FILES.length} files)`);
