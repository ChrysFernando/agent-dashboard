// Unpack a Claude artifact bundle HTML into a folder of source files.
// Usage: node scripts/unpack-bundle.mjs <input.html> <outdir>
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";

const [, , input, outdir] = process.argv;
if (!input || !outdir) {
  console.error("usage: node scripts/unpack-bundle.mjs <input.html> <outdir>");
  process.exit(1);
}

const html = await readFile(input, "utf8");

function extractScript(type) {
  const re = new RegExp(`<script[^>]*type=["']${type}["'][^>]*>([\\s\\S]*?)</script>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return m[1];
}

const manifestText = extractScript("__bundler/manifest");
const templateText = extractScript("__bundler/template");
const extResText = extractScript("__bundler/ext_resources");

if (!manifestText || !templateText) {
  console.error("Could not find manifest or template script tags.");
  process.exit(2);
}

const manifest = JSON.parse(manifestText);
const template = JSON.parse(templateText);
const extResources = extResText ? JSON.parse(extResText) : [];

// Build name → uuid map (best effort from ext_resources and from common patterns)
const uuidToName = {};
for (const r of extResources) {
  if (r.uuid && r.id) uuidToName[r.uuid] = r.id;
}

// Heuristic naming: detect script tags / link tags in template that reference UUIDs
const tagUuids = [...template.matchAll(/(src|href)=["']([0-9a-f-]{20,})["']/gi)];
for (const m of tagUuids) {
  const uuid = m[2];
  if (!uuidToName[uuid]) uuidToName[uuid] = `asset_${uuid.slice(0, 8)}`;
}

await mkdir(outdir, { recursive: true });

const index = [];
for (const [uuid, entry] of Object.entries(manifest)) {
  const data = Buffer.from(entry.data, "base64");
  const raw = entry.compressed ? gunzipSync(data) : data;

  // Determine extension from mime
  const mime = entry.mime || "application/octet-stream";
  const ext =
    mime === "text/html" ? "html" :
    mime === "text/css" ? "css" :
    mime === "application/javascript" || mime === "text/javascript" ? "js" :
    mime === "text/babel" ? "jsx" :
    mime === "application/json" ? "json" :
    mime === "image/svg+xml" ? "svg" :
    mime === "image/png" ? "png" :
    mime === "image/jpeg" ? "jpg" :
    "bin";

  let name = uuidToName[uuid] || `asset_${uuid.slice(0, 8)}`;
  if (!name.includes(".")) name = `${name}.${ext}`;

  const target = join(outdir, name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, raw);
  index.push({ uuid, name, mime, size: raw.length, compressed: !!entry.compressed });
}

// Write the template with UUIDs replaced by relative filenames
let templateOut = template;
for (const { uuid, name } of index) {
  templateOut = templateOut.split(uuid).join(name);
}
await writeFile(join(outdir, "index.html"), templateOut);
await writeFile(join(outdir, "_manifest.json"), JSON.stringify({ index, extResources }, null, 2));

console.log(`Unpacked ${index.length} assets to ${outdir}`);
for (const entry of index) {
  console.log(`  ${entry.size.toString().padStart(8)} ${entry.mime.padEnd(28)} ${entry.name}`);
}
