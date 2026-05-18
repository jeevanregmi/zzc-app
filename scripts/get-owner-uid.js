"use strict";
/**
 * ZZC Owner UID Helper
 *
 * Finds your Firebase Auth UID without needing the admin SDK.
 * Uses the Firebase Identity Toolkit REST API with an email/password sign-in.
 *
 * Usage (SAFE — password goes via env var, not command line):
 *   FIREBASE_PASSWORD=yourpassword node scripts/get-owner-uid.js
 *
 * Or pass --prompt to be prompted interactively (password not in shell history).
 *
 * ALTERNATIVE:
 *   Firebase Console → Authentication → Users → find jeevanregmi15@gmail.com
 *   Copy the UID from the first column. That's it.
 */

const readline = require("readline");

const API_KEY = "AIzaSyC2Y_0EIhETGxnH1GxMRYSBO1vCX4LK-BA";
const EMAIL   = "jeevanregmi15@gmail.com";

async function getUid(password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: EMAIL, password, returnSecureToken: true }),
    }
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? "Unknown error";
    console.error(`\n❌  Sign-in failed: ${msg}`);
    if (msg.includes("WRONG_PASSWORD") || msg.includes("INVALID_LOGIN_CREDENTIALS")) {
      console.error("   Wrong password. Try again or use the Firebase Console URL below.");
    }
    console.error("\n   Firebase Console (no password needed):");
    console.error("   https://console.firebase.google.com/project/zzc-finance/authentication/users");
    process.exit(1);
  }

  return { uid: data.localId, email: data.email };
}

async function main() {
  let password = process.env.FIREBASE_PASSWORD;

  if (!password && process.argv.includes("--prompt")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    password = await new Promise(resolve => {
      process.stdout.write("Password for jeevanregmi15@gmail.com: ");
      rl.question("", ans => { rl.close(); resolve(ans); });
    });
  }

  if (!password) {
    console.log("Usage:");
    console.log("  FIREBASE_PASSWORD=yourpassword node scripts/get-owner-uid.js");
    console.log("  node scripts/get-owner-uid.js --prompt");
    console.log("\nAlternative (no script needed):");
    console.log("  https://console.firebase.google.com/project/zzc-finance/authentication/users");
    process.exit(0);
  }

  console.log(`\nLooking up UID for ${EMAIL}…`);
  const { uid, email } = await getUid(password);

  console.log(`\n✓  Found:`);
  console.log(`   UID:   ${uid}`);
  console.log(`   Email: ${email}`);
  console.log(`\nRun pipeline seed with:`);
  console.log(`   FIREBASE_SERVICE_ACCOUNT=$(cat serviceAccountKey.json) OWNER_ID=${uid} node scripts/seed-policy-signals.js`);
  console.log(`   FIREBASE_SERVICE_ACCOUNT=$(cat serviceAccountKey.json) OWNER_ID=${uid} node scripts/run-pipeline-test.js`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
