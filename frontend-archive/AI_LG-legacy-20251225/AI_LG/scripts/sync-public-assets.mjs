import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

// Repo root is one level above AI_LG
const repoRoot = path.resolve(projectRoot, "..");

const source = path.join(repoRoot, "attached_assets", "ai-hero-bg.png");
const destDir = path.join(projectRoot, "public");
const dest = path.join(destDir, "ai-hero-bg.png");

function copyIfExists() {
  if (!fs.existsSync(source)) {
    // Don't fail builds; just warn so deploys still succeed even if the file isn't present.
    console.warn(`[sync-public-assets] Missing source: ${source}`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(source, dest);
  console.log(`[sync-public-assets] Copied ${source} -> ${dest}`);
}

copyIfExists();
