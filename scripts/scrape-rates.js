/**
 * ZZC Rate Scraper
 * Scrapes current interest/NAV rates from EPF, SSF, and CIT official websites
 * and writes results to Firebase Firestore market_rates collection.
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT  — JSON string of the service account key
 *   FIREBASE_PROJECT_ID       — Firebase project ID (optional fallback)
 */

"use strict";

const cheerio = require("cheerio");
const admin = require("firebase-admin");

// ─── Firebase init ────────────────────────────────────────────────────────────

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT env var is not set.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; ZZC-RateBot/1.0; +https://github.com/jeevanregmi/zzc-app)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en,ne;q=0.9",
};

async function fetchHtml(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract the first percentage value (e.g. 8.5) from text that contains
 * one of the given keywords (case-insensitive, English + Nepali).
 */
function extractRateFromText(text, keywords) {
  const lines = text.split(/\n|<br\s*\/?>/i);
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasKeyword = keywords.some((k) => lower.includes(k.toLowerCase()));
    if (!hasKeyword) continue;
    const match = line.match(/(\d{1,2}(?:\.\d{1,3})?)\s*%/);
    if (match) return parseFloat(match[1]);
  }
  // Broader: scan entire text for percentage near any keyword
  for (const keyword of keywords) {
    const re = new RegExp(
      keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^%]{0,80}(\\d{1,2}(?:\\.\\d{1,3})?)\\s*%",
      "i"
    );
    const m = text.match(re);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function extractRateFromHtml($, selectors, keywords) {
  for (const sel of selectors) {
    const el = $(sel);
    if (!el.length) continue;
    const text = el.text();
    const rate = extractRateFromText(text, keywords);
    if (rate !== null) return rate;
  }
  return null;
}

function now() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function logSection(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ─── EPF Scraper ──────────────────────────────────────────────────────────────
// URL: https://www.epf.org.np
// We look for the annual provident fund interest rate (currently 8.50%).

async function scrapeEPF() {
  logSection("EPF — epf.org.np");

  const FALLBACK_RATE = 8.5; // known rate as of FY 2081/82
  const result = {
    providentFundRate: FALLBACK_RATE,
    source: "https://www.epf.org.np",
    scrapedAt: now(),
    success: false,
    note: "",
  };

  try {
    const html = await fetchHtml("https://www.epf.org.np");
    const $ = cheerio.load(html);

    const SELECTORS = [
      "table",
      ".interest-rate",
      ".rate",
      "#interest",
      "td",
      "p",
      ".content",
      "article",
      ".entry-content",
      "main",
    ];

    const KEYWORDS = [
      "interest rate",
      "ब्याज दर",
      "provident fund rate",
      "सञ्चय कोष",
      "interest",
      "annual rate",
      "PF rate",
    ];

    const scraped = extractRateFromHtml($, SELECTORS, KEYWORDS);
    if (scraped !== null && scraped >= 5 && scraped <= 20) {
      console.log(`✅  EPF interest rate scraped: ${scraped}%`);
      result.providentFundRate = scraped;
      result.success = true;
      result.note = "Live scraped";
    } else {
      console.log(`⚠️   Could not extract EPF rate — using fallback ${FALLBACK_RATE}%`);
      result.success = false;
      result.note = `Scrape returned ${scraped}; using fallback`;
    }
  } catch (err) {
    console.error(`❌  EPF fetch error: ${err.message}`);
    result.note = `Fetch error: ${err.message}; using fallback`;
  }

  return result;
}

// ─── SSF Scraper ──────────────────────────────────────────────────────────────
// URL: https://ssf.gov.np
// SSF has statutory contribution rates (11% employee + 20% employer = 31%)
// and old-age pension rate (~8.5%). Contribution rates rarely change (require Act amendment).

async function scrapeSSF() {
  logSection("SSF — ssf.gov.np");

  const FALLBACK = {
    employeeContribution: 11,
    employerContribution: 20,
    totalContribution: 31,
    pensionRate: 8.5,
    accidentCoverNPR: 1400000,
    maternityNPR: 30000,
  };

  const result = {
    ...FALLBACK,
    source: "https://ssf.gov.np",
    scrapedAt: now(),
    success: false,
    note: "",
  };

  try {
    const html = await fetchHtml("https://ssf.gov.np");
    const $ = cheerio.load(html);

    const SELECTORS = ["table", ".contribution", "td", "p", ".content", "article", "main"];
    const KEYWORDS_EMP = ["employee contribution", "कर्मचारी अंशदान", "employee rate", "11%"];
    const KEYWORDS_EMP_RATE = ["employer contribution", "नियोक्ता अंशदान", "employer rate", "20%"];

    const empRate = extractRateFromHtml($, SELECTORS, KEYWORDS_EMP);
    const empRateAlt = extractRateFromHtml($, SELECTORS, KEYWORDS_EMP_RATE);

    // The statutory rates are 11+20. If we find them, great; otherwise keep fallback.
    if (empRate !== null && empRate >= 5 && empRate <= 30) {
      result.employeeContribution = empRate;
      result.success = true;
      console.log(`✅  SSF employee contribution rate scraped: ${empRate}%`);
    } else {
      console.log(`⚠️   SSF employee rate not found — keeping fallback 11%`);
    }
    if (empRateAlt !== null && empRateAlt >= 10 && empRateAlt <= 40) {
      result.employerContribution = empRateAlt;
      result.success = true;
      console.log(`✅  SSF employer contribution rate scraped: ${empRateAlt}%`);
    } else {
      console.log(`⚠️   SSF employer rate not found — keeping fallback 20%`);
    }

    result.totalContribution = result.employeeContribution + result.employerContribution;
    result.note = result.success ? "Partially live scraped" : "Fetch ok but rates not found; using fallbacks";
  } catch (err) {
    console.error(`❌  SSF fetch error: ${err.message}`);
    result.note = `Fetch error: ${err.message}; using fallbacks`;
  }

  return result;
}

// ─── CIT / NLK Scraper ────────────────────────────────────────────────────────
// URL: https://nlk.org.np (Citizens Investment Trust)
// CIT publishes NAV (Net Asset Value) for their unit schemes.
// We try the main site and the nav/price page.

async function scrapeCIT() {
  logSection("CIT — nlk.org.np");

  const FALLBACK = {
    citizensUnitNav: null,
    esgrsRate: 9.0,
    annualDividend: 9.0,
  };

  const result = {
    ...FALLBACK,
    source: "https://nlk.org.np",
    scrapedAt: now(),
    success: false,
    note: "",
  };

  const urls = [
    "https://nlk.org.np",
    "https://nlk.org.np/nav",
    "https://nlk.org.np/unit-price",
    "https://www.nlk.org.np",
    "https://www.nlk.org.np/nav",
  ];

  for (const url of urls) {
    try {
      const html = await fetchHtml(url, 12000);
      const $ = cheerio.load(html);

      const NAV_SELECTORS = [
        "table",
        ".nav",
        ".nav-price",
        ".unit-price",
        "td",
        ".price",
        "span",
        "p",
      ];
      const NAV_KEYWORDS = [
        "NAV",
        "net asset value",
        "एनएभी",
        "unit price",
        "एकाइ मूल्य",
        "citizens unit",
        "नागरिक एकांक",
      ];

      const RATE_SELECTORS = ["table", ".dividend", "p", "td", "article", ".content"];
      const RATE_KEYWORDS = [
        "dividend",
        "लाभांश",
        "interest",
        "ब्याज",
        "return",
        "प्रतिफल",
        "annual",
        "वार्षिक",
      ];

      const nav = extractRateFromHtml($, NAV_SELECTORS, NAV_KEYWORDS);
      if (nav !== null && nav >= 5 && nav <= 500) {
        result.citizensUnitNav = nav;
        result.success = true;
        console.log(`✅  CIT NAV scraped from ${url}: ${nav}`);
      }

      const dividendRate = extractRateFromHtml($, RATE_SELECTORS, RATE_KEYWORDS);
      if (dividendRate !== null && dividendRate >= 1 && dividendRate <= 30) {
        result.annualDividend = dividendRate;
        result.esgrsRate = dividendRate;
        result.success = true;
        console.log(`✅  CIT dividend/return rate scraped from ${url}: ${dividendRate}%`);
      }

      if (result.success) break;
    } catch (err) {
      console.log(`  ↳ ${url} — ${err.message}`);
    }
  }

  if (!result.success) {
    console.log(`⚠️   CIT scrape unsuccessful — using fallback ESGRS rate ${FALLBACK.esgrsRate}%`);
    result.note = "All URLs failed or rates not found; using fallbacks";
  } else {
    result.note = "Partially or fully live scraped";
  }

  return result;
}

// ─── Write to Firestore ───────────────────────────────────────────────────────

async function writeToFirestore(epf, ssf, cit) {
  logSection("Writing to Firestore → market_rates");

  const batch = db.batch();

  batch.set(db.collection("market_rates").doc("epf"), epf, { merge: true });
  batch.set(db.collection("market_rates").doc("ssf"), ssf, { merge: true });
  batch.set(db.collection("market_rates").doc("cit"), cit, { merge: true });

  batch.set(
    db.collection("market_rates").doc("meta"),
    {
      lastRunAt: now(),
      overallSuccess: epf.success || ssf.success || cit.success,
      epfSuccess: epf.success,
      ssfSuccess: ssf.success,
      citSuccess: cit.success,
      epfRate: epf.providentFundRate,
      ssfTotal: ssf.totalContribution,
      citEsgrsRate: cit.esgrsRate,
      citNav: cit.citizensUnitNav,
    },
    { merge: true }
  );

  await batch.commit();
  console.log("✅  Firestore batch write complete.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  ZZC Rate Scraper — " + new Date().toISOString());
  console.log("=".repeat(60));

  const [epf, ssf, cit] = await Promise.allSettled([
    scrapeEPF(),
    scrapeSSF(),
    scrapeCIT(),
  ]);

  const epfResult = epf.status === "fulfilled" ? epf.value : { providentFundRate: 8.5, success: false, source: "https://www.epf.org.np", scrapedAt: now(), note: String(epf.reason) };
  const ssfResult = ssf.status === "fulfilled" ? ssf.value : { employeeContribution: 11, employerContribution: 20, totalContribution: 31, pensionRate: 8.5, accidentCoverNPR: 1400000, maternityNPR: 30000, success: false, source: "https://ssf.gov.np", scrapedAt: now(), note: String(ssf.reason) };
  const citResult = cit.status === "fulfilled" ? cit.value : { citizensUnitNav: null, esgrsRate: 9.0, annualDividend: 9.0, success: false, source: "https://nlk.org.np", scrapedAt: now(), note: String(cit.reason) };

  await writeToFirestore(epfResult, ssfResult, citResult);

  logSection("Summary");
  console.log(`  EPF rate:     ${epfResult.providentFundRate}%  (scraped: ${epfResult.success})`);
  console.log(`  SSF total:    ${ssfResult.totalContribution}%  (scraped: ${ssfResult.success})`);
  console.log(`  CIT ESGRS:    ${citResult.esgrsRate}%  (scraped: ${citResult.success})`);
  console.log(`  CIT NAV:      ${citResult.citizensUnitNav ?? "n/a"}`);
  console.log("");

  await admin.app().delete();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
