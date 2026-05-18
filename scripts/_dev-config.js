"use strict";
/**
 * ZZC Dev Pipeline Config
 *
 * Hardcoded dev identity for local/CI pipeline testing.
 * Replace DEV_OWNER_ID with real Firebase UID when reconnecting production auth.
 *
 * Dev env = zzc-finance Firebase project (serviceAccountKey.json)
 * Prod env = zeneration-z-chautari (serviceAccountKey-prod.json)
 */

const DEV_OWNER_ID = "dev-zzc-pipeline-2026";

module.exports = { DEV_OWNER_ID };
