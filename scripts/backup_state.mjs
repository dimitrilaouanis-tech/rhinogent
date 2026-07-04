// scripts/backup_state.mjs
// Backup runtime state files to Cloudflare R2 (or any S3‑compatible bucket) and to a backup Git branch.
// Run this script from the project root (e.g., via `node scripts/backup_state.mjs`).

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ==== Configuration =========================================================
// List of files (relative to project root) that should be backed up.
const filesToBackup = [
  "src/lib/governance/params.json",
  "public/governance/parameter_delta.json",
  "public/learning/epoch.json",
  "public/learning/epoch.hash",
  "public/metrics.json",
  // add more paths here if needed
];

// Cloudflare R2 bucket name – must exist and be accessible with the credentials
const R2_BUCKET = process.env.R2_BUCKET || "YOUR_R2_BUCKET";
// S3‑compatible endpoint for Cloudflare R2 (default for EU region – adjust if needed)
const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://<ACCOUNT_ID>.r2.cloudflarestorage.com";

// Create an S3 client that talks to Cloudflare R2
const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "YOUR_ACCESS_KEY_ID",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "YOUR_SECRET_ACCESS_KEY",
  },
});

// ==== Helper Functions ======================================================
/**
 * Upload a file buffer to R2 under a timestamped key.
 * The key format is `backup/<yyyyMMdd_HHmmss>/<relative_path>`.
 */
async function uploadToR2(relativePath, content) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
  const key = `backup/${timestamp}/${relativePath}`;
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: content,
    ContentType: "application/json",
  });
  await s3.send(command);
  console.log(`✅ Uploaded ${relativePath} → s3://${R2_BUCKET}/${key}`);
}

/** Compute a SHA‑256 hash of a Buffer – useful for integrity checks. */
function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Execute a Git command and return trimmed stdout. */
function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

/** Main backup routine */
async function main() {
  const projectRoot = path.resolve(import.meta.url, "../..", ".."); // repo root
  console.log("🔧 Project root:", projectRoot);

  // 1️⃣ Ensure all listed files exist
  for (const rel of filesToBackup) {
    const abs = path.join(projectRoot, rel);
    try {
      await fs.access(abs);
    } catch (e) {
      console.warn(`⚠️  File not found, skipping: ${rel}`);
      continue;
    }
    const content = await fs.readFile(abs);
    // 2️⃣ Upload to R2
    await uploadToR2(rel, content);
  }

  // 3️⃣ Commit to a backup branch (creates it if missing)
  const backupBranch = "backup/state";
  try {
    // make sure we have the latest refs
    git("fetch --all");
    // create branch if it does not exist
    const branches = git("branch --list");
    if (!branches.split("\n").includes(backupBranch)) {
      git(`checkout -b ${backupBranch}`);
    } else {
      git(`checkout ${backupBranch}`);
    }
    // copy the files into the branch (they already exist, just add)
    git("add " + filesToBackup.map(p => `"${p}"`).join(" "));
    const timestamp = new Date().toISOString();
    git(`commit -m "🔄 Backup state ${timestamp}"`);
    git(`push origin ${backupBranch}`);
    console.log(`✅ Pushed backup branch ${backupBranch}`);
  } catch (e) {
    console.error("❌ Git backup failed:", e.message);
  }

  console.log("✅ Backup completed.");
}

main().catch(err => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
