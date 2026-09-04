import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const communityRoot = resolve(here, "..");
const sourcePath = resolve(communityRoot, "src/app/assets.css");
const outputPath = resolve(communityRoot, "public/byetale-world.webp");

const css = await readFile(sourcePath, "utf8");
const match = css.match(/data:image\/webp;base64,([^"')]+)/);

if (!match?.[1]) {
  throw new Error("ByeTale scene data was not found in src/app/assets.css");
}

const bytes = Buffer.from(match[1], "base64");
if (bytes.length < 1024) {
  throw new Error(`Extracted ByeTale scene is unexpectedly small: ${bytes.length} bytes`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
console.log(`ByeTale scene extracted: ${bytes.length} bytes -> public/byetale-world.webp`);
