"use strict";
/**
 * ZZC One-shot setup script — cross-platform (Windows PowerShell + Mac/Linux)
 *
 * Usage:
 *   node scripts/setup.js
 *   node scripts/setup.js --force     # overwrite existing Firestore data
 *
 * What it does:
 *   1. Verifies serviceAccountKey-prod.json exists and targets zeneration-z-chautari
 *   2. Seeds 15 signal routes into Firestore (or skips if already seeded)
 *   3. Seeds Nepal Policy FY 2083/84 intelligence document + 12 signals + queue items
 *   4. Reminds you to deploy Firestore rules via Firebase CLI
 *
 * Prerequisites:
 *   - serviceAccountKey-prod.json in project root
 *   - npm install already completed
 */

const fs           = require("fs");
const path         = require("path");
const { execSync } = require("child_process");

const PROJECT    = "zeneration-z-chautari";
const FORCE_FLAG = process.argv.includes("--force") ? " --force" : "";

function sep() { console.log("═".repeat(59)); }
function ok(msg)   { console.log(`✓  ${msg}`); }
function warn(msg) { console.log(`⚠  ${msg}`); }
function err(msg)  { console.error(`❌  ${msg}`); }

function run(label, cmd) {
  console.log(`\n${label}`);
  console.log("─".repeat(59));
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, SA_KEY_PATH: "serviceAccountKey-prod.json" } });
  } catch (e) {
    err(`Step failed: ${label}`);
    process.exit(1);
  }
}

// ── Step 0: Verify service account key ────────────────────────────────────────

sep();
console.log("  ZZC System Setup");
sep();
console.log();

const KEY_PATH = path.resolve("serviceAccountKey-prod.json");
if (!fs.existsSync(KEY_PATH)) {
  err("serviceAccountKey-prod.json not found.");
  console.log();
  console.log("   Get it from:");
  console.log(`   https://console.firebase.google.com/project/${PROJECT}/settings/serviceaccounts/adminsdk`);
  console.log("   → Generate new private key → save as serviceAccountKey-prod.json");
  console.log();
  process.exit(1);
}

let sa;
try {
  sa = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
} catch {
  err("serviceAccountKey-prod.json is not valid JSON.");
  process.exit(1);
}

if (sa.project_id !== PROJECT) {
  err(`serviceAccountKey-prod.json targets project '${sa.project_id}', expected '${PROJECT}'.`);
  console.log(`   Download the correct key from:`);
  console.log(`   https://console.firebase.google.com/project/${PROJECT}/settings/serviceaccounts/adminsdk`);
  process.exit(1);
}

ok(`Service account verified: ${PROJECT}`);
console.log();

// ── Step 1: Seed signal routes ────────────────────────────────────────────────

run("Step 1 — Seeding signal routes...", `node scripts/seed-signal-routes.js${FORCE_FLAG}`);

// ── Step 2: Seed policy signals ───────────────────────────────────────────────

run("Step 2 — Seeding Nepal Policy FY 2083/84 pipeline...", `node scripts/seed-policy-signals.js${FORCE_FLAG}`);

// ── Step 3: Firebase rules reminder ──────────────────────────────────────────

console.log();
console.log("Step 3 — Deploy Firestore + Storage security rules:");
console.log("─".repeat(59));
try {
  execSync("npx firebase --version", { stdio: "ignore" });
  console.log("  Running: firebase deploy --only firestore:rules,storage");
  try {
    execSync(`npx firebase deploy --only firestore:rules,storage --project ${PROJECT}`, { stdio: "inherit" });
    ok("Rules deployed.");
  } catch {
    warn("Rules deploy failed. Run manually:");
    console.log(`   npx firebase deploy --only firestore:rules,storage --project ${PROJECT}`);
  }
} catch {
  warn("Firebase CLI not available. Install it then run:");
  console.log(`   npm install -g firebase-tools`);
  console.log(`   npx firebase deploy --only firestore:rules,storage --project ${PROJECT}`);
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log();
sep();
console.log("  Setup complete.");
console.log();
console.log("  Next steps:");
console.log("  1. Open vault: https://zzc.jeevanregmi.com.np/vault/documents");
console.log("  2. You should see the Nepal Policy document");
console.log("  3. Click 'Process with AI' to run Claude extraction");
console.log("  4. After processing, go to Admin Vault to approve");
console.log();
console.log("  For local dev (no sign-in required):");
console.log("  .env.development.local has DEV_VAULT_MODE=true");
console.log("  Run: npm run dev  →  http://localhost:3000/vault/documents");
sep();
console.log();
