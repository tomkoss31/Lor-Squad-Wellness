// One-shot script : compresse les 2 images du bilan en WebP + PNG léger.
// Usage : node scripts/optimize-bilan-images.mjs
// Exige sharp installé (devDependency).

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const SRC_DIR = path.resolve("public/images/assessment");

const TARGETS = [
  {
    name: "petit-dejeuner-concept",
    maxWidth: 1400, // plus large que le display 900px pour du retina x1.5
    webpQuality: 78,
    pngQuality: 80,
  },
  {
    name: "saveurs-formula1",
    maxWidth: 900, // display ~500px, retina x1.8
    webpQuality: 82,
    pngQuality: 82,
  },
];

async function compress(target) {
  const srcPng = path.join(SRC_DIR, `${target.name}.png`);
  const outPng = path.join(SRC_DIR, `${target.name}.png`);
  const outWebp = path.join(SRC_DIR, `${target.name}.webp`);

  const statSrc = await fs.stat(srcPng);
  const srcKb = Math.round(statSrc.size / 1024);
  console.log(`\n→ ${target.name}.png (${srcKb} KB)`);

  const base = sharp(srcPng).resize({ width: target.maxWidth, withoutEnlargement: true });

  // WebP moderne, très compact
  await base.clone().webp({ quality: target.webpQuality, effort: 6 }).toFile(outWebp);
  const statWebp = await fs.stat(outWebp);
  console.log(
    `   WebP  → ${target.name}.webp (${Math.round(statWebp.size / 1024)} KB, -${Math.round(
      (1 - statWebp.size / statSrc.size) * 100
    )}%)`
  );

  // PNG recompressé en quantized palette (pngquant-like via sharp)
  // On écrit d'abord dans un tmp puis on remplace pour éviter un self-read conflict.
  const tmpPng = outPng + ".tmp";
  await base
    .clone()
    .png({
      quality: target.pngQuality,
      compressionLevel: 9,
      palette: true, // active la quantification
    })
    .toFile(tmpPng);
  await fs.rename(tmpPng, outPng);
  const statPng = await fs.stat(outPng);
  console.log(
    `   PNG   → ${target.name}.png (${Math.round(statPng.size / 1024)} KB, -${Math.round(
      (1 - statPng.size / statSrc.size) * 100
    )}%)`
  );
}

for (const t of TARGETS) {
  // eslint-disable-next-line no-await-in-loop
  await compress(t);
}

console.log("\n✓ Done.");
