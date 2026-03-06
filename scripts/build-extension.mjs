import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const distDir = path.join(root, "dist");
const extDir = path.join(root, "extension");
const outDir = path.join(root, "extension-dist");

async function rmIfExists(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
}

async function main() {
  await rmIfExists(outDir);
  await copyDir(distDir, outDir);
  const extFiles = await fs.readdir(extDir, { withFileTypes: true });
  for (const entry of extFiles) {
    const srcPath = path.join(extDir, entry.name);
    const destPath = path.join(outDir, entry.name);
    if (entry.isDirectory()) await copyDir(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
  console.log("Extension output ready:", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
