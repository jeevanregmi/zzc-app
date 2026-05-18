"use strict";
/**
 * ZZC Signal Routes Seeder
 *
 * Seeds the "signal_routes" Firestore collection with the initial routing
 * taxonomy for the Nepal fintech intelligence pipeline.
 *
 * Routes are system-level config — they do NOT require an ownerId.
 * Safe to run in production: all route actions create draft items only.
 *
 * Coverage:
 *   - NRB monetary policy signals → rate update suggestions + content queue
 *   - EPF/CIT/SSF pension signals → scheme suggestions + explainer content
 *   - NEPSE/capital market signals → content queue (investor explainers)
 *   - Cooperative regulation → content queue (risk explainer)
 *   - Fintech/eKYC/cashless → content queue (Gen Z digital finance)
 *   - Startup/IT policy → content queue (creator/startup ecosystem)
 *   - Remittance/NRN investment → content queue (diaspora finance)
 *   - AML/FATF compliance → intelligence_flag (admin review only)
 *   - Government budget → content queue + scheme suggestions
 *
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of service account key
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT=$(cat serviceAccountKey.json) node scripts/seed-signal-routes.js
 */

const { initFirebase } = require("./_firebase-init");
const admin = initFirebase();
const db    = admin.firestore();

// Signal routes have no ownerId — they are system-level config.

// ─── Route definitions ─────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const ROUTES = [

  // ── NRB Policy & Interest Rates ────────────────────────────────────────
  {
    name:        "NRB Policy → Interest Rate Suggestion",
    description: "NRB monetary policy signals suggest updates to market rate records (EPF rate, bank rate, repo rate, etc.)",
    keywords:    ["nrb", "interest rate", "monetary policy", "repo rate", "bank rate", "byaj dar", "नेपाल राष्ट्र बैंक", "ब्याज दर"],
    sectorIds:   ["government-finance"],
    topicIds:    ["nrb-policy", "interest-rate"],
    matchMode:   "any",
    minRelevanceScore: 0.6,
    destination: "market_rate_suggest",
    action:      "suggest_update",
    priority:    "high",
    autoTags:    ["nrb", "rate-change", "monetary-policy"],
    autoTopics:  ["interest-rate", "nrb-policy"],
    active:      true,
    requiresAdminApproval: true,
  },

  {
    name:        "NRB Policy → Finance Explainer Content",
    description: "NRB policy changes generate YouTube/social content explaining impact on young investors",
    keywords:    ["nrb", "monetary policy", "interest rate", "policy rate", "repo rate"],
    sectorIds:   ["government-finance", "fintech"],
    topicIds:    ["nrb-policy", "interest-rate"],
    matchMode:   "any",
    minRelevanceScore: 0.65,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["nrb", "policy", "finance-explainer"],
    autoTopics:  ["interest-rate", "nrb-policy"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── EPF / CIT / SSF Pension ───────────────────────────────────────────
  {
    name:        "EPF/CIT/SSF Signal → Pension Scheme Suggestion",
    description: "Pension fund signals suggest updates to EPF/CIT/SSF scheme records",
    keywords:    ["epf", "cit", "ssf", "provident fund", "contributory fund", "sanchit kosh", "कर्मचारी सञ्चय", "pension", "retirement"],
    sectorIds:   ["nbfi"],
    topicIds:    ["epf-cit", "ssf", "pension-reform", "social-security"],
    matchMode:   "any",
    minRelevanceScore: 0.55,
    destination: "scheme_suggest",
    action:      "suggest_update",
    priority:    "high",
    autoTags:    ["epf", "cit", "ssf", "pension"],
    autoTopics:  ["epf-cit", "ssf"],
    active:      true,
    requiresAdminApproval: true,
  },

  {
    name:        "EPF/SSF → Explainer Content (Gen Z Pension)",
    description: "Pension policy signals generate explainer content for young workers (first job, EPF contribution rules)",
    keywords:    ["epf", "ssf", "cit", "provident fund", "pension", "retirement", "contribution"],
    sectorIds:   ["nbfi"],
    topicIds:    ["epf-cit", "ssf", "pension-reform"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    contentType: "explainer",
    platform:    "youtube",
    autoTags:    ["epf", "ssf", "pension", "young-workers"],
    autoTopics:  ["epf-cit", "ssf"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── NEPSE / Capital Markets ───────────────────────────────────────────
  {
    name:        "NEPSE/SEBON → Investor Content",
    description: "Capital market signals generate content for retail NEPSE investors",
    keywords:    ["nepse", "sebon", "ipo", "share", "stock", "mutual fund", "etf", "dividend", "capital market", "शेयर"],
    sectorIds:   ["capital-markets"],
    topicIds:    ["nepse", "sebon-policy", "etf", "mutual-fund"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["nepse", "investor", "capital-market"],
    autoTopics:  ["nepse", "sebon-policy"],
    active:      true,
    requiresAdminApproval: true,
  },

  {
    name:        "IPO Alert → Short Video",
    description: "IPO announcements generate short-form content for rapid NEPSE updates",
    keywords:    ["ipo", "initial public offering", "share allotment", "premium", "oversubscribed"],
    sectorIds:   ["capital-markets"],
    topicIds:    ["nepse"],
    matchMode:   "any",
    minRelevanceScore: 0.65,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "critical",
    contentType: "shorts",
    platform:    "youtube",
    autoTags:    ["ipo", "nepse", "alert"],
    autoTopics:  ["nepse"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Cooperative Regulation ────────────────────────────────────────────
  {
    name:        "Cooperative Regulation → Risk Explainer",
    description: "Cooperative sector signals generate safety/risk explainer content for depositors",
    keywords:    ["cooperative", "sahakari", "depositor", "cooperative crisis", "nrb regulation", "सहकारी"],
    sectorIds:   ["nbfi"],
    topicIds:    ["cooperative-regulation", "depositor-protection"],
    matchMode:   "any",
    minRelevanceScore: 0.55,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    contentType: "carousel",
    platform:    "facebook",
    autoTags:    ["cooperative", "depositor-protection", "risk"],
    autoTopics:  ["cooperative-regulation"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Fintech / eKYC / Cashless ─────────────────────────────────────────
  {
    name:        "Fintech/eKYC → Digital Finance Short",
    description: "eKYC, cashless, digital identity signals generate Gen Z digital finance content",
    keywords:    ["ekyc", "cashless", "digital payment", "qr payment", "mobile banking", "wallet", "citizen app", "digital identity"],
    sectorIds:   ["fintech"],
    topicIds:    ["ekyc", "cashless-payment", "mobile-banking", "digital-identity"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "medium",
    contentType: "shorts",
    platform:    "youtube",
    autoTags:    ["fintech", "digital-finance", "gen-z"],
    autoTopics:  ["ekyc", "cashless-payment"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Startup / IT / AI Policy ─────────────────────────────────────────
  {
    name:        "IT/AI Policy → Startup/Creator Content",
    description: "Tech policy signals generate creator economy and startup content",
    keywords:    ["startup", "it policy", "ai", "cloud", "tech", "software", "tax holiday", "remote work", "digital economy"],
    sectorIds:   ["economic-intelligence"],
    topicIds:    ["startup-policy", "ai-nepal", "remote-work", "tax-incentive"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "medium",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["tech", "startup", "creator-economy"],
    autoTopics:  ["startup-policy", "ai-nepal"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Remittance / NRN Investment ───────────────────────────────────────
  {
    name:        "Remittance/NRN → Diaspora Finance Content",
    description: "Remittance and NRN investment signals generate diaspora-focused finance content",
    keywords:    ["remittance", "nrn", "non-resident nepali", "diaspora", "bidesh", "foreign investment", "remittance fund", "प्रवासी"],
    sectorIds:   ["government-finance"],
    topicIds:    ["remittance", "diaspora-policy"],
    matchMode:   "any",
    minRelevanceScore: 0.55,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "medium",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["remittance", "nrn", "diaspora"],
    autoTopics:  ["remittance", "diaspora-policy"],
    active:      true,
    requiresAdminApproval: true,
  },

  {
    name:        "Remittance Rate Alert → Short",
    description: "Remittance exchange rate changes generate quick short-form alerts",
    keywords:    ["remittance rate", "exchange rate", "dollar rate", "विनिमय दर", "remittance charge"],
    sectorIds:   ["government-finance"],
    topicIds:    ["remittance"],
    matchMode:   "any",
    minRelevanceScore: 0.65,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    contentType: "shorts",
    platform:    "youtube",
    autoTags:    ["remittance", "exchange-rate", "alert"],
    autoTopics:  ["remittance"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── AML / FATF / Financial Crime ──────────────────────────────────────
  {
    name:        "AML/FATF → Intelligence Flag",
    description: "AML/CFT and FATF signals flag for deep admin analysis — complex compliance topics",
    keywords:    ["aml", "cft", "fatf", "financial crime", "money laundering", "suspicious transaction", "fiu", "beneficial ownership"],
    sectorIds:   ["government-finance"],
    topicIds:    ["aml-cft", "fatf"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "intelligence_flag",
    action:      "flag_review",
    priority:    "high",
    autoTags:    ["aml", "compliance", "fatf"],
    autoTopics:  ["aml-cft", "fatf"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Government Budget / Policy ────────────────────────────────────────
  {
    name:        "Government Budget → Finance Impact Explainer",
    description: "Annual budget and government policy signals generate comprehensive finance impact content",
    keywords:    ["budget", "sarkar niti", "government policy", "niti", "100 point", "fiscal", "bjetko", "बजेट", "नीति"],
    sectorIds:   ["government-finance", "economic-intelligence"],
    topicIds:    ["nrb-policy", "tax-incentive", "fdi-policy"],
    matchMode:   "any",
    minRelevanceScore: 0.65,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "critical",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["government-policy", "budget", "finance-impact"],
    autoTopics:  ["nrb-policy"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Housing Loans ─────────────────────────────────────────────────────
  {
    name:        "Housing Loan Policy → Scheme Suggestion",
    description: "Housing loan rate/limit changes suggest updates to EPF housing loan scheme records",
    keywords:    ["housing loan", "home loan", "grha rin", "ghar rin", "epf housing", "घर कर्जा", "आवास ऋण"],
    sectorIds:   ["nbfi", "government-finance"],
    topicIds:    ["epf-cit"],
    matchMode:   "any",
    minRelevanceScore: 0.55,
    destination: "scheme_suggest",
    action:      "suggest_update",
    priority:    "high",
    autoTags:    ["housing-loan", "epf", "home"],
    autoTopics:  ["epf-cit"],
    active:      true,
    requiresAdminApproval: true,
  },

  // ── Hydropower / Energy ───────────────────────────────────────────────
  {
    name:        "Hydropower/Energy → Investor Opportunity Content",
    description: "Energy sector signals generate content about hydropower investment opportunities",
    keywords:    ["hydropower", "electricity", "energy", "nea", "ppa", "power purchase", "mw", "bijuli", "water resources"],
    sectorIds:   ["economic-intelligence"],
    topicIds:    ["hydropower", "energy-policy"],
    matchMode:   "any",
    minRelevanceScore: 0.60,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "medium",
    contentType: "youtube-long",
    platform:    "youtube",
    autoTags:    ["hydropower", "energy", "investment"],
    autoTopics:  ["hydropower"],
    active:      true,
    requiresAdminApproval: true,
  },

];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ZZC Signal Routes Seeder");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Check for existing routes
  const existing = await db.collection("signal_routes").get();
  if (!existing.empty) {
    console.log(`⚠  ${existing.size} route(s) already exist in Firestore.`);
    const forceFlag = process.argv.includes("--force");
    if (!forceFlag) {
      console.log("   Pass --force to overwrite. Exiting without changes.\n");
      process.exit(0);
    }
    console.log("   --force flag set — overwriting all routes.\n");
    const batch = db.batch();
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log("   ✓ Deleted existing routes.\n");
  }

  console.log(`Writing ${ROUTES.length} signal routes…\n`);
  const batch = db.batch();
  const ids   = [];

  for (const route of ROUTES) {
    const ref = db.collection("signal_routes").doc();
    batch.set(ref, {
      id:        ref.id,
      ...route,
      matchCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    ids.push(ref.id);
    console.log(`  [${ids.length.toString().padStart(2)}] ${route.name}`);
    console.log(`       → ${route.destination} | priority: ${route.priority} | sectors: [${route.sectorIds.join(",")}]`);
  }

  await batch.commit();

  console.log(`\n✓ ${ids.length} routes written to Firestore "signal_routes" collection.`);
  console.log("\nRoute ID mapping:");
  ids.forEach((id, i) => console.log(`  [${i + 1}] ${id}  —  ${ROUTES[i].name}`));
  console.log("\nNext: Run scripts/seed-policy-signals.js with your OWNER_ID to test routing.");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
