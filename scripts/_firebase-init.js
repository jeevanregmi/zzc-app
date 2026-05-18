"use strict";
/**
 * Shared Firebase Admin initialiser for all ZZC scripts.
 *
 * Dev env  → zzc-finance project (serviceAccountKey.json)
 * Prod env → zeneration-z-chautari (serviceAccountKey-prod.json)
 *
 * Key resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var (JSON string) — CI/GitHub Actions
 *   2. SA_KEY_PATH env var (explicit file path)
 *   3. serviceAccountKey-prod.json  (production)
 *   4. serviceAccountKey.json       (dev/local — zzc-finance project)
 */

const fs    = require("fs");
const admin = require("firebase-admin");

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); }
    catch { console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON."); process.exit(1); }
  }

  const keyPath = process.env.SA_KEY_PATH
    || (fs.existsSync("serviceAccountKey-prod.json") ? "serviceAccountKey-prod.json" : null)
    || (fs.existsSync("serviceAccountKey.json")      ? "serviceAccountKey.json"      : null);

  if (!keyPath) {
    console.error("❌  No service account key found.");
    console.error("   Place serviceAccountKey.json (dev) or serviceAccountKey-prod.json (prod) in project root.");
    process.exit(1);
  }

  try {
    const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    console.log(`  Firebase project: ${sa.project_id}  (key: ${keyPath})`);
    return sa;
  } catch {
    console.error(`❌  Could not read ${keyPath}`); process.exit(1);
  }
}

function initFirebase() {
  if (admin.apps.length > 0) return admin;
  const sa = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return admin;
}

module.exports = { initFirebase };
