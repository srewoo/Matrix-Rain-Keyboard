// Copies package.json's version into manifest.json. Runs on `npm version <x>`.
import { readFile, writeFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
manifest.version = version;
await writeFile("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json -> ${version}`);
