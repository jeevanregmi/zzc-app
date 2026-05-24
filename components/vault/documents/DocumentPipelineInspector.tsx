"use client";

import { useState } from "react";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import { trustFromDoc } from "../../../lib/intelligence/trust-score";
import { ActionLearnCard, type ActionLearnData } from "../../vault/LearnTip";

// ── Color palette (safe complete strings for Tailwind) ────────────────────────

const C = {
  cyan:    { border: "border-cyan-900",    text: "text-cyan-400",    bg: "bg-cyan-950/50",    pill: "bg-cyan-950 border-cyan-800 text-cyan-300"    },
  violet:  { border: "border-violet-900",  text: "text-violet-400",  bg: "bg-violet-950/50",  pill: "bg-violet-950 border-violet-800 text-violet-300"  },
  amber:   { border: "border-amber-900",   text: "text-amber-400",   bg: "bg-amber-950/50",   pill: "bg-amber-950 border-amber-800 text-amber-300"   },
  green:   { border: "border-green-900",   text: "text-green-400",   bg: "bg-green-950/50",   pill: "bg-green-950 border-green-800 text-green-300"   },
  blue:    { border: "border-blue-900",    text: "text-blue-400",    bg: "bg-blue-950/50",    pill: "bg-blue-950 border-blue-800 text-blue-300"    },
  emerald: { border: "border-emerald-900", text: "text-emerald-400", bg: "bg-emerald-950/50", pill: "bg-emerald-950 border-emerald-800 text-emerald-300" },
  pink:    { border: "border-pink-900",    text: "text-pink-400",    bg: "bg-pink-950/50",    pill: "bg-pink-950 border-pink-800 text-pink-300"    },
  orange:  { border: "border-orange-900",  text: "text-orange-400",  bg: "bg-orange-950/50",  pill: "bg-orange-950 border-orange-800 text-orange-300"  },
} as const;
type ColorKey = keyof typeof C;

// ── Founder Glossary — every backend concept in simple Nepali ─────────────────

const GLOSSARY: { term: string; np: string; explain: string; example: string }[] = [
  {
    term: "Intelligence Atom",
    np: "Intelligence टुक्रा",
    explain: "एउटा document बाट निकालिएको एक atomic fact — अरू कुनै context नचाहिने independent तथ्य।",
    example: "\"EPF ब्याजदर ८.५% बाट ७% मा घट्यो\" — यो एउटा atom हो। एक्लैले complete meaning दिन्छ।",
  },
  {
    term: "Trust Score",
    np: "विश्वसनीयता स्कोर",
    explain: "AI ले document को विश्वसनीयता ० देखि १०० मा score गर्छ। ४ factors: official source, source quality, AI confidence, freshness।",
    example: "NRB को official PDF = ९०+। Facebook post = १५। Difference = जनतालाई गलत information नदिन।",
  },
  {
    term: "Branch Health",
    np: "शाखा स्वास्थ्य",
    explain: "Constitution Tree मा हरेक अधिकार एउटा 'branch' हो। Real documents ले ती branches लाई 'जीवित' राख्छन् — fulfilled गरिएको भए healthy, unfulfilled भए decaying।",
    example: "शिक्षाको हक (धारा ३१) को branch health = कति schools बने + कति बजेट आयो + कति dropout rate छ।",
  },
  {
    term: "Cross-tree Signal",
    np: "अन्तर-वृक्ष संकेत",
    explain: "एउटा document ले एकभन्दा बढी Constitution Tree affect गर्छ। यो 'signal' हो — AI ले trees बीचको pattern detect गर्छ।",
    example: "बजेट document ले शिक्षा tree + स्वास्थ्य tree + रोजगार tree — तिनैलाई एकसाथ affect गर्छ।",
  },
  {
    term: "Entity Extraction",
    np: "संस्था पहिचान",
    explain: "AI ले document बाट automatically संस्था, व्यक्ति, स्थान, र नीति पहिचान गर्छ — manually label नगरिकन।",
    example: "\"NRB ले ब्याजदर घटाउने निर्णय गर्यो\" → AI ले 'NRB' = institution, 'ब्याजदर' = financial instrument detect गर्छ।",
  },
  {
    term: "Constitutional Mapping",
    np: "संविधान जडान",
    explain: "हरेक government document behind कुनै न कुनै संविधानको धारामा आधारित हुन्छ। AI ले ती धाराहरू automatically link गर्छ।",
    example: "शिक्षा नीति → धारा ३१ (शिक्षाको हक) + धारा ५१(घ) (राज्यको शिक्षा नीति)।",
  },
  {
    term: "Policy Promise",
    np: "नीतिगत प्रतिबद्धता",
    explain: "Government document मा भेटिएका specific commitment हरू — 'X गरिनेछ', 'Y बजेट छुट्याइनेछ' जस्ता। AI ले ती extract गर्छ र track गर्छ।",
    example: "\"२०८२ सम्म सबै विद्यालयमा internet पुर्याइनेछ\" — यो एउटा policy promise जुन AI ले track गर्छ।",
  },
  {
    term: "Implementation Signal",
    np: "कार्यान्वयन संकेत",
    explain: "Policy promise भएको छ — तर implement भयो कि भएन? यो जाँच्ने signals। Budget allocation, tender notice, completion report।",
    example: "School internet promise → Budget line item छ? → Tender award भयो? → Completion report आयो? यिनै signals हुन्।",
  },
  {
    term: "Civic Gap",
    np: "नागरिक अन्तर",
    explain: "संविधानले guarantee गरेको अधिकार र नागरिकले actually पाएको सेवाबीचको फरक। AI ले यो gap measure गर्छ।",
    example: "धारा ३५: सबैले निःशुल्क स्वास्थ्य सेवा पाउनुपर्छ। Reality: ७०% Nepali ले OOP payment गर्छन्। Gap = ७०%।",
  },
  {
    term: "AI Confidence",
    np: "AI को निश्चितता",
    explain: "AI ले आफ्नो analysis कति confident छ भन्ने ०-१ मा score गर्छ। High = AI धेरै sure। Low = document unclear वा AI confused।",
    example: "सरकारी PDF clear भए confidence = ०.९०। Scanned handwritten document भए = ०.४०।",
  },
];

// ── Entity extraction — derive from doc fields ────────────────────────────────

interface DocEntities {
  constitutionalRefs:     { article: string; title: string; relevance: string }[];
  institutions:           string[];
  citizenGroups:          string[];
  ministries:             string[];
  policyPromises:         string[];
  implementationSignals:  string[];
  atoms:                  string[];
  financialFigures:       string[];
}

const SECTOR_INSTITUTIONS: Record<string, string> = {
  banking:       "Nepal Rastra Bank (NRB)",
  epf:           "कर्मचारी सञ्चय कोष (EPF)",
  ssf:           "सामाजिक सुरक्षा कोष (SSF)",
  sebon:         "Securities Board of Nepal (SEBON)",
  parliament:    "संघीय संसद",
  education:     "शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय",
  health:        "स्वास्थ्य तथा जनसंख्या मन्त्रालय",
  finance:       "अर्थ मन्त्रालय",
  revenue:       "आन्तरिक राजस्व विभाग (IRD)",
  agriculture:   "कृषि तथा पशुपंक्षी विकास मन्त्रालय",
  employment:    "श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय",
  infrastructure:"भौतिक पूर्वाधार तथा यातायात मन्त्रालय",
  housing:       "नगर विकास मन्त्रालय",
  energy:        "ऊर्जा, जलस्रोत तथा सिँचाई मन्त्रालय",
  judiciary:     "सर्वोच्च अदालत",
  ciaa:          "अख्तियार दुरुपयोग अनुसन्धान आयोग (CIAA)",
};

const SECTOR_CITIZENS: Record<string, string> = {
  banking:       "बचतकर्ता र ऋणी नागरिक",
  epf:           "EPF सदस्यहरू (सरकारी कर्मचारी)",
  ssf:           "SSF दर्ता निजी क्षेत्र श्रमिक",
  housing:       "घर खरीदकर्ता र किरायाकर्ता",
  education:     "विद्यार्थी, शिक्षक, र अभिभावक",
  health:        "बिरामी, गर्भवती महिला, र स्वास्थ्यकर्मी",
  employment:    "जागिरे, उद्यमी, र वैदेशिक श्रमिक",
  agriculture:   "किसान र कृषि मजदूर",
  remittance:    "विदेशमा काम गर्ने नेपाली र उनका परिवार",
  youth:         "युवा (१८-३५ वर्ष)",
  women:         "महिला नागरिक",
  indigenous:    "आदिवासी र जनजाति समुदाय",
  disabled:      "अपाङ्गता भएका व्यक्ति",
};

const CAT_CONSTITUTIONAL_REFS: Record<string, { article: string; title: string; relevance: string }[]> = {
  education:     [
    { article: "धारा ३१",     title: "शिक्षाको हक",                    relevance: "निःशुल्क र अनिवार्य आधारभूत शिक्षाको संवैधानिक ग्यारेन्टी" },
    { article: "धारा ५१(घ)", title: "राज्यको शिक्षा नीति",               relevance: "उच्च शिक्षा र प्राविधिक शिक्षा विकासको राज्य दायित्व" },
  ],
  health:        [
    { article: "धारा ३५",     title: "स्वास्थ्यको हक",                  relevance: "आधारभूत स्वास्थ्य सेवा निःशुल्क पाउने संवैधानिक हक" },
    { article: "धारा ५१(ङ)", title: "राज्यको स्वास्थ्य नीति",           relevance: "स्वास्थ्य बीमा र नागरिक स्वास्थ्यको राज्य दायित्व" },
  ],
  legal:         [
    { article: "धारा २०",     title: "न्यायसम्बन्धी हक",                 relevance: "निष्पक्ष सुनुवाइ र कानूनी प्रतिनिधित्वको हक" },
    { article: "धारा १०२",   title: "सर्वोच्च अदालतको अधिकारक्षेत्र",  relevance: "मौलिक हक उल्लंघनमा सर्वोच्चमा जाने अधिकार" },
  ],
  finance:       [
    { article: "धारा ११९",   title: "संघीय संचित कोष",                   relevance: "सार्वजनिक बजेट र सरकारी खर्चको संवैधानिक व्यवस्था" },
    { article: "धारा ५१(छ)", title: "आर्थिक विकास नीति",                 relevance: "समृद्धि र रोजगारीका लागि राज्यको आर्थिक नीति दायित्व" },
  ],
  strategy:      [
    { article: "धारा ५०",    title: "राज्यको निर्देशक सिद्धान्त",        relevance: "राष्ट्रिय नीतिहरू यसै सिद्धान्तमा आधारित हुनुपर्छ" },
    { article: "धारा ५१",    title: "राज्यको नीति",                       relevance: "विभिन्न क्षेत्रमा राज्यको दीर्घकालीन नीतिगत दायित्व" },
  ],
  research:      [
    { article: "धारा ५१(ज)", title: "सूचना र प्रविधि नीति",              relevance: "ज्ञान र अनुसन्धानमा राज्यको लगानी दायित्व" },
    { article: "धारा ३३",    title: "रोजगारीको हक",                       relevance: "अनुसन्धान जनशक्ति विकासको संवैधानिक आधार" },
  ],
  intelligence:  [
    { article: "धारा २७",    title: "सूचनाको हक",                         relevance: "नागरिकलाई सरकारी सूचना पाउने संवैधानिक हक" },
    { article: "धारा १७(२)", title: "प्रेस स्वतन्त्रता",                   relevance: "सूचना प्रवाहको संवैधानिक ग्यारेन्टी" },
  ],
  content:       [
    { article: "धारा १७(२)", title: "विचार र अभिव्यक्तिको स्वतन्त्रता", relevance: "नागरिक सामग्री प्रकाशनको संवैधानिक आधार" },
    { article: "धारा २७",    title: "सूचनाको हक",                         relevance: "सार्वजनिक हित सूचनाको संवैधानिक आधार" },
  ],
  other:         [
    { article: "धारा ५०",    title: "राज्यको निर्देशक सिद्धान्त",        relevance: "सबै सरकारी कार्य यसै सिद्धान्तले guide हुन्छ" },
  ],
};

function extractEntities(doc: IntelligenceDocument): DocEntities {
  const topicsLower = (doc.detectedTopics ?? []).map(t => t.toLowerCase());
  const sectorsLower = (doc.affectedSectors ?? []).map(s => s.toLowerCase());
  const allKeywords = [...topicsLower, ...sectorsLower];

  const institutions: string[] = [];
  if (doc.sourceAuthority) institutions.push(doc.sourceAuthority);
  for (const [key, inst] of Object.entries(SECTOR_INSTITUTIONS)) {
    if (allKeywords.some(k => k.includes(key)) && !institutions.includes(inst)) {
      institutions.push(inst);
    }
  }

  const citizenGroups: string[] = [];
  if (doc.youthImpact) citizenGroups.push("युवा (१८-३५ वर्ष)");
  for (const [key, group] of Object.entries(SECTOR_CITIZENS)) {
    if (allKeywords.some(k => k.includes(key)) && !citizenGroups.includes(group)) {
      citizenGroups.push(group);
    }
  }

  const ministries: string[] = [];
  const ministryKeys = ["education", "health", "finance", "agriculture", "employment", "infrastructure", "energy", "housing"];
  for (const key of ministryKeys) {
    if (allKeywords.some(k => k.includes(key))) {
      const inst = SECTOR_INSTITUTIONS[key];
      if (inst && !ministries.includes(inst)) ministries.push(inst);
    }
  }

  const constitutionalRefs = CAT_CONSTITUTIONAL_REFS[doc.category] ?? CAT_CONSTITUTIONAL_REFS.other;

  return {
    constitutionalRefs,
    institutions:          institutions.slice(0, 6),
    citizenGroups:         citizenGroups.slice(0, 6),
    ministries:            ministries.slice(0, 4),
    policyPromises:        (doc.policyChanges ?? []).slice(0, 8),
    implementationSignals: (doc.contentIdeas ?? []).slice(0, 5),
    atoms:                 (doc.aiKeyInsights ?? []),
    financialFigures:      (doc.financialImplications ?? []),
  };
}

// ── Epistemic config per stage ────────────────────────────────────────────────

interface StageEpistemics {
  color:        ColorKey;
  icon:         string;
  label:        string;
  np:           string;
  saw:          (doc: IntelligenceDocument) => string;
  inferred:     (doc: IntelligenceDocument) => string;
  mightBeWrong: (doc: IntelligenceDocument) => string;
  future:       string;
  whyNepal:     string;
}

const STAGE_EPISTEMICS: StageEpistemics[] = [
  {
    color:   "cyan",
    icon:    "📦",
    label:   "Storage",
    np:      "भण्डारण",
    saw: (doc) => `File नाम: "${doc.fileName}" · Type: ${doc.mimeType} · Size: ${doc.fileSize ? (doc.fileSize / 1024).toFixed(1) + " KB" : "unknown"} · R2 path: ${doc.storagePath || "pending"} · Upload time: ${doc.uploadedAt}`,
    inferred: () => "File type बाट AI ले processing approach decide गर्छ — PDF भए OCR + text extract, image भए vision model, DOCX भए structured parse।",
    mightBeWrong: (doc) => doc.fileSize === 0
      ? "File size ० देखियो — upload incomplete हुन सक्छ वा URL-ingested document हो। Actual content missing हुन सक्छ।"
      : "Storage path valid छ भनेर assume गरिएको छ — CDN expiry वा R2 permission change भए download fail हुन सक्छ।",
    future:   "Document versioning (v1, v2 diffs), cross-owner document sharing, immutable audit trail, automatic backup to secondary storage",
    whyNepal: "नेपालमा सरकारी documents often informal channels बाट हराउँछन् — PDF disappears, website down हुन्छ। ZZC मा एकपटक upload भएको document permanently preserved रहन्छ।",
  },
  {
    color:   "violet",
    icon:    "🤖",
    label:   "AI Extraction",
    np:      "AI निष्कर्षण",
    saw: (doc) => doc.ocrText
      ? `Raw text (first 500 chars): "${doc.ocrText.slice(0, 500)}…"`
      : doc.aiSummary
      ? `OCR text stored separately। AI ले summary generate गर्यो — meaning extraction complete।`
      : "OCR text अझै extract भएको छैन। processingStatus = " + doc.processingStatus,
    inferred: (doc) => `Summary: "${doc.aiSummary?.slice(0, 200) ?? "pending"}" · Provider: ${doc.aiProvider ?? "unknown"} · Retry count: ${doc.aiRetryCount ?? 0}`,
    mightBeWrong: (doc) => {
      const issues = [];
      if (doc.language && doc.language !== "Nepali" && doc.language !== "English")
        issues.push(`Document language "${doc.language}" मा AI कम trained हुन सक्छ`);
      if ((doc.aiRetryCount ?? 0) > 0)
        issues.push(`${doc.aiRetryCount} retry भयो — AI ले पहिलो पटक सही extract गर्न सकेन`);
      if (doc.mimeType?.includes("image"))
        issues.push("Image document — OCR errors हुन सक्छ, especially handwritten text मा");
      if (!doc.ocrText && !doc.aiSummary)
        issues.push("Extraction अझै complete भएको छैन");
      return issues.length > 0 ? issues.join(" · ") : "Extraction quality satisfactory देखिन्छ। confidence ले verify गर्नुहोस्।";
    },
    future:   "Multilingual OCR (Nepali Devanagari), table/chart extraction, formula detection, footnote parsing, cross-page context linking",
    whyNepal: "नेपालका धेरै government documents Nepali मा छन्, handwritten छन्, वा poor-quality scan हुन्। AI extraction = ती documents digital civic intelligence मा convert हुन्छन् — पहिलो पटक।",
  },
  {
    color:   "amber",
    icon:    "🌳",
    label:   "Constitution Map",
    np:      "संविधान जडान",
    saw: (doc) => `Detected topics: [${(doc.detectedTopics ?? []).join(", ") || "none"}] · Affected sectors: [${(doc.affectedSectors ?? []).join(", ") || "none"}] · Category: ${doc.category}`,
    inferred: (doc) => {
      const refs = CAT_CONSTITUTIONAL_REFS[doc.category] ?? CAT_CONSTITUTIONAL_REFS.other;
      return `Constitutional refs inferred from category+topics: ${refs.map(r => r.article + " " + r.title).join(" · ")}`;
    },
    mightBeWrong: (doc) => {
      const issues = [];
      if (!doc.detectedTopics || doc.detectedTopics.length === 0)
        issues.push("कुनै topic detect भएन — constitutional mapping category मात्रैबाट infer गरिएको छ, accurate नहुन सक्छ");
      if (doc.category === "other")
        issues.push("'Other' category = AI ले specific branch map गर्न सकेन — manually review गर्नुहोस्");
      issues.push("Article-level mapping अझै manual हो — AI ले category+topics बाट infer गर्छ, exact धारा human verification चाहिन्छ");
      return issues.join(" · ");
    },
    future:   "Article-level exact constitutional references, Directive Principles (धारा ५१) sub-clause mapping, Fundamental Rights cross-check engine, branch auto-update on approval",
    whyNepal: "नेपालको संविधान २०७२ ले ३१ मौलिक हकहरू दिएको छ — तर कति fulfilled छ? AI ले हरेक document लाई ती हकहरूसँग जोडेर 'promise vs reality' measure गर्छ।",
  },
  {
    color:   "green",
    icon:    "⚡",
    label:   "Intelligence Atoms",
    np:      "Intelligence टुक्राहरू",
    saw: (doc) => `Raw key insights (${(doc.aiKeyInsights ?? []).length}): [${(doc.aiKeyInsights ?? []).slice(0, 2).join(" | ")}${(doc.aiKeyInsights ?? []).length > 2 ? "…" : ""}] · Financial implications (${(doc.financialImplications ?? []).length}) · Policy changes (${(doc.policyChanges ?? []).length})`,
    inferred: (doc) => `Content ideas generated: ${(doc.contentIdeas ?? []).length} · Nepali explainer: ${doc.nepaliExplainer ? "generated ✅" : "pending ⏳"} · Youth impact: ${doc.youthImpact ? "extracted ✅" : "none"}`,
    mightBeWrong: (doc) => {
      const issues = [];
      if ((doc.aiKeyInsights ?? []).length === 0)
        issues.push("कुनै insight निकालिएन — document too short, image-only, वा AI ले content relevant ठानेन");
      if ((doc.policyChanges ?? []).length === 0)
        issues.push("Policy changes detect भएन — document मा specific commitments नभएको हुन सक्छ, वा AI ले miss गर्यो");
      if ((doc.contentIdeas ?? []).length === 0)
        issues.push("Content ideas generate भएन — document को civic relevance कम भएको indication हुन सक्छ");
      return issues.length > 0 ? issues.join(" · ") : "Atom generation complete देखिन्छ। Volume र quality हेर्नुहोस्।";
    },
    future:   "Atom graph database (atoms across documents linked), cross-document atom deduplication, atom confidence scoring, atom versioning when policy changes",
    whyNepal: "एउटा ४०० page बजेट document बाट ५० atomic facts निकाल्न सकिन्छ — 'EPF मा X करोड', 'शिक्षामा Y% वृद्धि'। ती atoms नै ZZC को civic intelligence को raw material हुन्।",
  },
  {
    color:   "blue",
    icon:    "📊",
    label:   "Trust Scoring",
    np:      "विश्वसनीयता मूल्याङ्कन",
    saw: (doc) => `Source URL: ${doc.sourceUrl ?? doc.downloadUrl ?? "none"} · Source authority: ${doc.sourceAuthority ?? "unknown"} · Source type: ${doc.sourceType ?? "unknown"} · Upload date: ${doc.uploadedAt}`,
    inferred: (doc) => {
      const trust = trustFromDoc(doc);
      return `Trust score: ${trust.score}/100 (${trust.level}) · Official source: ${trust.officialSource}pts · Source quality: ${trust.sourceQuality}pts · AI confidence: ${trust.aiConfidence}pts · Freshness: ${trust.freshness}pts · Reasons: ${trust.reasons.slice(0, 2).join(" | ")}`;
    },
    mightBeWrong: (doc) => {
      const trust = trustFromDoc(doc);
      const issues = [];
      if (trust.officialSource === 0)
        issues.push("Official government domain detect भएन — source authority manually verify गर्नुहोस्");
      if ((doc.confidence ?? 0) < 0.5)
        issues.push(`AI confidence ${Math.round((doc.confidence ?? 0) * 100)}% — document content unclear वा off-topic हुन सक्छ`);
      if (doc.sourceCredibility === "unverified" || !doc.sourceCredibility)
        issues.push("Source credibility unverified — manually check गर्नुहोस्");
      if (trust.score < 60)
        issues.push(`Overall score ${trust.score}/100 — low trust document जनतालाई directly publish गर्न risk छ`);
      return issues.length > 0 ? issues.join(" · ") : `Trust score ${trust.score}/100 — acceptable threshold भित्र छ।`;
    },
    future:   "Multi-factor trust model (community verification + historical accuracy), source reputation graph, cross-document fact verification, AI hallucination detection",
    whyNepal: "नेपालमा fake news र misinformation civic harm गर्छ। ZZC ले publish गर्नु अघि हरेक document को trust verify गर्छ — जनताले wrong EPF rate वा wrong tax rule पाउन हुँदैन।",
  },
  {
    color:   "emerald",
    icon:    "🩺",
    label:   "Branch Health",
    np:      "शाखा स्वास्थ्य प्रभाव",
    saw: (doc) => `Affected sectors: [${(doc.affectedSectors ?? []).join(", ") || "none"}] · SSF/EPF relevance: ${doc.ssfEpfCitRelevance ? "found" : "none"} · Youth impact field: ${doc.youthImpact ? "present" : "absent"}`,
    inferred: (doc) => {
      const branches = (doc.affectedSectors ?? []).map(s => `🌿 ${s} branch`).join(", ") || "No specific branches detected";
      return `${branches} · ${doc.youthImpact ? "Youth impact: " + doc.youthImpact.slice(0, 150) : "No youth-specific impact extracted"}`;
    },
    mightBeWrong: (doc) => {
      const issues = [];
      if ((doc.affectedSectors ?? []).length === 0)
        issues.push("कुनै sector detect भएन — document को branch health impact map गर्न सकिएन। AI ले general category बाट infer गर्नेछ।");
      if (!doc.youthImpact)
        issues.push("Youth impact field empty — document ले युवालाई affect गर्छ भने manually note गर्नुहोस्");
      issues.push("Branch health impact = current approximation। Real branch health scoring system Phase 2 मा build हुनेछ।");
      return issues.join(" · ");
    },
    future:   "Real-time branch health dashboard, decay signals (unfulfilled promises), growth signals (new policy + budget), cross-branch correlation, citizen complaint integration",
    whyNepal: "नेपालको Constitution ले ३१ rights guarantee गर्छ। तर कति actually deliver भयो? Branch health = हरेक right को 'delivery score'। जनतालाई यो देखाउनु ZZC को core mission हो।",
  },
  {
    color:   "pink",
    icon:    "📖",
    label:   "Learning Mode",
    np:      "सिक्ने मोड",
    saw: (doc) => `Nepali explainer: "${doc.nepaliExplainer?.slice(0, 200) ?? "not generated"}" · Nepali translation (first 200): "${doc.translationNe?.slice(0, 200) ?? "none"}" · Key insights (for LearnBlocks): ${(doc.aiKeyInsights ?? []).length} items`,
    inferred: (doc) => `Learning blocks available: ${(doc.aiKeyInsights ?? []).length} · Nepali context: ${doc.nepaliExplainer ? "generated" : "missing"} · SSF/EPF explainer: ${doc.ssfEpfCitRelevance ? "yes" : "no"}`,
    mightBeWrong: (doc) => {
      const issues = [];
      if (!doc.nepaliExplainer)
        issues.push("Nepali explainer generate भएन — Learning Mode मा यो document explain हुँदैन। AI analysis retry गर्नुहोस्।");
      if (!doc.translationNe && doc.language !== "Nepali")
        issues.push("Nepali translation छैन — Nepali-only users ले document context नपाउन सक्छन्");
      issues.push("'Unpad' citizen का लागि explanation quality manually verify गर्नुहोस् — AI ले still technical language use गर्न सक्छ");
      return issues.join(" · ");
    },
    future:   "Per-reading-level explanation (class 5, SLC, university), audio generation in Nepali, visual explainer cards, SMS-length summary for feature phones",
    whyNepal: "नेपालमा ६०%+ नागरिकले government documents पढ्न सक्दैनन् — language barrier, literacy, technical jargon। Learning Mode = हरेक document 'everyone can understand' format मा।",
  },
  {
    color:   "orange",
    icon:    "🌐",
    label:   "Cross-tree Signals",
    np:      "अन्तर-वृक्ष सम्बन्ध",
    saw: (doc) => `Tags: [${(doc.tags ?? []).join(", ") || "none"}] · Detected topics: [${(doc.detectedTopics ?? []).join(", ") || "none"}] · Category: ${doc.category} · Source type: ${doc.sourceType ?? "unknown"}`,
    inferred: (doc) => `Relationship seeds ready: ${((doc.tags ?? []).length + (doc.detectedTopics ?? []).length)} keywords · These will link to ${(doc.affectedSectors ?? []).length} sector trees when graph is built · Content pipeline seeds: ${(doc.contentIdeas ?? []).length}`,
    mightBeWrong: (doc) => {
      const issues = [];
      if ((doc.tags ?? []).length === 0)
        issues.push("Tags empty — cross-tree relationship signal weak। Upload मा tags थप्नुहोस्।");
      if ((doc.detectedTopics ?? []).length < 2)
        issues.push("Topics कम detect भए — document ले कम topics cover गर्यो वा AI ले miss गर्यो");
      issues.push("Cross-tree relationship graph अझै build भएको छैन — यी seeds Phase 3 मा graph engine मा feed हुनेछन्");
      return issues.join(" · ");
    },
    future:   "Knowledge graph engine, document similarity network, civic gap detector across trees, multi-tree AI alignment, cross-sector policy contradiction detection",
    whyNepal: "नेपालको education policy ले labor market affect गर्छ, जसले SSF ले affect गर्छ, जसले housing ले affect गर्छ। AI ले यो cross-sector pattern detect गरेर नागरिकलाई 'complete picture' देखाउँछ।",
  },
];

// ── Relationship Graph ────────────────────────────────────────────────────────

const REL_NODES = [
  { icon: "📄", label: "Document",        np: "कागजात",         color: "text-cyan-400",    key: "doc" },
  { icon: "🌳", label: "Const. Branch",   np: "संवैधानिक शाखा", color: "text-amber-400",   key: "branch" },
  { icon: "👥", label: "Citizens",         np: "नागरिक",         color: "text-green-400",   key: "citizens" },
  { icon: "💰", label: "Budget",           np: "बजेट",           color: "text-blue-400",    key: "budget" },
  { icon: "📢", label: "Civic Gap",       np: "नागरिक अन्तर",   color: "text-orange-400",  key: "gap" },
  { icon: "🔮", label: "Future Outcome",  np: "भविष्य परिणाम",  color: "text-violet-400",  key: "future" },
];

function RelGraph({ doc, entities }: { doc: IntelligenceDocument; entities: DocEntities }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodeData: Record<string, { title: string; points: string[] }> = {
    doc: {
      title: "यो document",
      points: [
        `"${doc.title}"`,
        `Category: ${doc.category} · ${doc.sourceType ?? "unknown"} source`,
        `Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}`,
        doc.sourceAuthority ? `Authority: ${doc.sourceAuthority}` : "Authority: unspecified",
      ],
    },
    branch: {
      title: "संवैधानिक शाखाहरू",
      points: entities.constitutionalRefs.length > 0
        ? entities.constitutionalRefs.map(r => `${r.article}: ${r.title}`)
        : ["Category बाट infer गरिएको — exact articles pending"],
    },
    citizens: {
      title: "प्रभावित नागरिक समूह",
      points: entities.citizenGroups.length > 0
        ? entities.citizenGroups
        : ["Citizen groups detect भएन — sectors बाट infer गर्नुहोस्"],
    },
    budget: {
      title: "आर्थिक प्रभाव",
      points: entities.financialFigures.length > 0
        ? entities.financialFigures.slice(0, 4)
        : [
          "Financial figures explicitly extract भएन",
          "Budget link: category + affected sectors बाट infer",
          "Phase 2: auto budget allocation tracking",
        ],
    },
    gap: {
      title: "नागरिक अन्तर (Civic Gap)",
      points: entities.policyPromises.length > 0
        ? entities.policyPromises.slice(0, 4).map(p => `Promise: ${p}`)
        : [
          "Policy promises detect भएन",
          "Gap analysis: future मा track हुनेछ",
          "यो document ले कुन promises गर्यो — implementation verify गर्नुपर्छ",
        ],
    },
    future: {
      title: "भविष्यका परिणाम (Phase 2+)",
      points: entities.implementationSignals.length > 0
        ? entities.implementationSignals.slice(0, 4)
        : [
          "Cross-tree relationship graph build हुनेछ",
          "Policy promise vs implementation tracking",
          "Branch health real-time scoring",
          "Citizen complaint correlation",
        ],
    },
  };

  return (
    <div className="space-y-3">
      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Document → Nepal → जनता: सम्बन्ध graph</p>

      {/* Graph nodes row */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {REL_NODES.map((node, i) => (
          <div key={node.key} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveNode(activeNode === node.key ? null : node.key)}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all ${
                activeNode === node.key
                  ? "border-zinc-600 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <span className="text-xl leading-none">{node.icon}</span>
              <span className={`text-[10px] font-bold ${node.color}`}>{node.label}</span>
              <span className="text-zinc-700 text-[9px]">{node.np}</span>
            </button>
            {i < REL_NODES.length - 1 && (
              <div className="flex flex-col items-center px-1">
                <div className="h-px w-5 bg-zinc-700" />
                <span className="text-zinc-700 text-[9px] mt-0.5">→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Active node detail */}
      {activeNode && nodeData[activeNode] && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-3">
          <p className="text-zinc-300 text-xs font-bold mb-2">{nodeData[activeNode].title}</p>
          <ul className="space-y-1">
            {nodeData[activeNode].points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-400">
                <span className="text-zinc-700 shrink-0 mt-0.5">›</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Entity Explorer ───────────────────────────────────────────────────────────

interface EntitySectionProps {
  icon:    string;
  title:   string;
  np:      string;
  items:   string[];
  empty:   string;
  color:   string;
}

function EntitySection({ icon, title, np, items, empty, color }: EntitySectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors text-left"
      >
        <span>{icon}</span>
        <span className={`text-xs font-bold ${color}`}>{title}</span>
        <span className="text-zinc-600 text-xs">· {np}</span>
        <span className={`text-xs ml-auto px-1.5 py-0.5 rounded-full font-bold ${
          items.length > 0 ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-600"
        }`}>{items.length}</span>
        <span className="text-zinc-600 text-xs">{open ? "↑" : "↓"}</span>
      </button>
      {open && (
        <div className="px-3 py-2.5 space-y-1 border-t border-zinc-800">
          {items.length === 0 ? (
            <p className="text-zinc-600 text-xs italic">{empty}</p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="flex gap-2 text-xs text-zinc-300 py-0.5">
                <span className="text-zinc-600 shrink-0 mt-0.5">·</span>
                <span>{item}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Founder Glossary ──────────────────────────────────────────────────────────

function FounderGlossary() {
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎓</span>
        <div>
          <p className="text-white text-xs font-black">Founder Learning Mode</p>
          <p className="text-zinc-500 text-xs">हरेक backend concept सरल Nepali मा</p>
        </div>
      </div>
      {GLOSSARY.map(entry => (
        <div key={entry.term} className="border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenTerm(openTerm === entry.term ? null : entry.term)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
          >
            <span className="text-xs font-bold text-cyan-400 flex-1">{entry.term}</span>
            <span className="text-zinc-500 text-xs">{entry.np}</span>
            <span className="text-zinc-600 text-xs ml-2">{openTerm === entry.term ? "↑" : "↓"}</span>
          </button>
          {openTerm === entry.term && (
            <div className="px-3 py-3 border-t border-zinc-800 space-y-2">
              <p className="text-zinc-300 text-xs leading-relaxed">{entry.explain}</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2">
                <p className="text-zinc-600 text-[10px] font-bold uppercase mb-1">Nepal उदाहरण</p>
                <p className="text-zinc-400 text-xs leading-relaxed">{entry.example}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stage epistemic panel ─────────────────────────────────────────────────────

function StageEpistemicPanel({ stage, doc }: { stage: StageEpistemics; doc: IntelligenceDocument }) {
  const [layer, setLayer] = useState<"saw" | "inferred" | "wrong" | "future" | "nepal">("saw");
  const col = C[stage.color];

  const layers: { key: typeof layer; label: string; icon: string }[] = [
    { key: "saw",     label: "Actually Saw",   icon: "👁" },
    { key: "inferred", label: "Inferred",      icon: "🧠" },
    { key: "wrong",   label: "Might Be Wrong", icon: "⚠" },
    { key: "future",  label: "Future Systems", icon: "🔮" },
    { key: "nepal",   label: "Why Nepal",      icon: "🇳🇵" },
  ];

  const content = {
    saw:     stage.saw(doc),
    inferred: stage.inferred(doc),
    wrong:   stage.mightBeWrong(doc),
    future:  stage.future,
    nepal:   stage.whyNepal,
  };

  const layerColors: Record<typeof layer, string> = {
    saw:     "bg-zinc-800 text-zinc-200",
    inferred:"bg-violet-950 text-violet-300",
    wrong:   "bg-red-950 text-red-300",
    future:  "bg-orange-950 text-orange-300",
    nepal:   "bg-emerald-950 text-emerald-300",
  };

  return (
    <div className={`rounded-2xl border ${col.border} ${col.bg} p-4 space-y-3`}>
      {/* Stage header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{stage.icon}</span>
        <span className={`font-black text-sm ${col.text}`}>{stage.label}</span>
        <span className="text-zinc-600 text-xs">·</span>
        <span className="text-zinc-400 text-xs">{stage.np}</span>
      </div>

      {/* Layer selector */}
      <div className="flex gap-1 flex-wrap">
        {layers.map(l => (
          <button
            key={l.key}
            onClick={() => setLayer(l.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
              layer === l.key
                ? layerColors[l.key] + " border-transparent"
                : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* Layer content */}
      <div className={`rounded-xl px-3 py-2.5 ${layerColors[layer]} text-xs leading-relaxed border border-zinc-800/50`}>
        {content[layer]}
      </div>
    </div>
  );
}

// ── Stage status ──────────────────────────────────────────────────────────────

function getStageStatus(stageId: string, doc: IntelligenceDocument): "done" | "pending" | "error" | "future" {
  const stageChecks: Record<string, () => "done" | "pending" | "error" | "future"> = {
    storage:      () => doc.storagePath ? "done" : "error",
    extraction:   () => doc.aiProcessingError ? "error" : doc.aiSummary ? "done" : doc.processingStatus === "processing_ai" ? "pending" : "pending",
    constitution: () => (doc.detectedTopics?.length ?? 0) > 0 ? "done" : "pending",
    atoms:        () => (doc.aiKeyInsights?.length ?? 0) > 0 ? "done" : "pending",
    scoring:      () => doc.confidence !== undefined ? "done" : "pending",
    branchhealth: () => (doc.affectedSectors?.length ?? 0) > 0 ? "done" : "pending",
    learning:     () => doc.nepaliExplainer ? "done" : "pending",
    crosstree:    () => (doc.tags?.length ?? 0) > 0 ? "done" : "future",
  };
  const stageIdMap: Record<string, string> = {
    "📦 Storage":           "storage",
    "🤖 AI Extraction":     "extraction",
    "🌳 Constitution Map":  "constitution",
    "⚡ Intelligence Atoms": "atoms",
    "📊 Trust Scoring":     "scoring",
    "🩺 Branch Health":     "branchhealth",
    "📖 Learning Mode":     "learning",
    "🌐 Cross-tree Signals":"crosstree",
  };
  const key = stageIdMap[stageId] ?? stageId;
  return (stageChecks[key] ?? (() => "future"))();
}

const STATUS_BADGE: Record<string, string> = {
  done:    "✅",
  pending: "⏳",
  error:   "❌",
  future:  "🔮",
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  doc:       IntelligenceDocument;
  onApprove: (id: string) => Promise<void>;
  onFlag:    (id: string, notes: string) => Promise<void>;
}

export function DocumentPipelineInspector({ doc, onApprove, onFlag }: Props) {
  const [view,        setView]        = useState<"stages" | "entities" | "graph" | "glossary">("stages");
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [acting,      setActing]      = useState(false);
  const [flagging,    setFlagging]    = useState(false);
  const [flagNotes,   setFlagNotes]   = useState("");
  const [expanded,    setExpanded]    = useState(false);

  const entities = extractEntities(doc);
  const trust    = trustFromDoc(doc);

  const completedStages = STAGE_EPISTEMICS.filter((s, i) => {
    const keys = ["storage", "extraction", "constitution", "atoms", "scoring", "branchhealth", "learning", "crosstree"];
    return getStageStatus(keys[i], doc) === "done";
  }).length;

  const actApprove = async () => {
    setActing(true);
    try { await onApprove(doc.id); } finally { setActing(false); }
  };
  const actFlag = async () => {
    setActing(true);
    try { await onFlag(doc.id, flagNotes); setFlagging(false); } finally { setActing(false); }
  };

  const stageKeys = ["storage", "extraction", "constitution", "atoms", "scoring", "branchhealth", "learning", "crosstree"];

  const NAV_TABS = [
    { key: "stages",   label: "Pipeline",  icon: "⚡" },
    { key: "entities", label: "Entities",  icon: "🗂" },
    { key: "graph",    label: "Graph",     icon: "🌐" },
    { key: "glossary", label: "Glossary",  icon: "🎓" },
  ] as const;

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/50">

      {/* ── Document header ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{doc.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-zinc-600">
              <span className="uppercase font-semibold text-zinc-500">{doc.category}</span>
              <span>·</span>
              <span>{doc.fileName}</span>
              {doc.sourceAuthority && <><span>·</span><span className="text-zinc-500">{doc.sourceAuthority}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              trust.level === "high"   ? "bg-green-950 text-green-400 border border-green-900" :
              trust.level === "medium" ? "bg-amber-950 text-amber-400 border border-amber-900" :
              trust.level === "low"    ? "bg-orange-950 text-orange-400 border border-orange-900" :
                                         "bg-red-950 text-red-400 border border-red-900"
            }`}>
              {trust.score}/100
            </span>
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors"
            >
              {expanded ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {doc.aiSummary && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{doc.aiSummary}</p>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
            <span>Pipeline: {completedStages}/8 stages complete</span>
            <span>{doc.processingStatus}</span>
          </div>
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
            {stageKeys.map((key, i) => {
              const status = getStageStatus(key, doc);
              const colors = ["bg-cyan-500", "bg-violet-500", "bg-amber-500", "bg-green-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-orange-500"];
              return (
                <div
                  key={key}
                  className={`flex-1 ${status === "done" ? colors[i] : status === "error" ? "bg-red-600" : status === "future" ? "bg-zinc-800" : "bg-zinc-700"}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Expanded content ────────────────────────────────────────────────── */}
      {expanded && (
        <>
          {/* Sub-nav */}
          <div className="flex gap-0 border-t border-b border-zinc-900 overflow-x-auto">
            {NAV_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  view === t.key
                    ? "border-cyan-500 text-white bg-zinc-900/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">

            {/* ── Pipeline Stages ────────────────────────────────────────── */}
            {view === "stages" && (
              <div className="space-y-3">
                {/* Stage pill selector */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {STAGE_EPISTEMICS.map((s, i) => {
                    const status = getStageStatus(stageKeys[i], doc);
                    const col = C[s.color];
                    const isActive = activeStage === i;
                    return (
                      <button
                        key={s.label}
                        onClick={() => setActiveStage(isActive ? null : i)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          isActive ? col.pill : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="text-[10px] opacity-60">{STATUS_BADGE[status]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active stage detail */}
                {activeStage !== null ? (
                  <StageEpistemicPanel stage={STAGE_EPISTEMICS[activeStage]} doc={doc} />
                ) : (
                  /* Overview grid */
                  <div className="grid grid-cols-1 gap-2">
                    {STAGE_EPISTEMICS.map((s, i) => {
                      const status = getStageStatus(stageKeys[i], doc);
                      const col = C[s.color];
                      return (
                        <button
                          key={s.label}
                          onClick={() => setActiveStage(i)}
                          className="w-full flex items-center gap-3 px-3 py-3 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors text-left"
                        >
                          <span className="text-lg shrink-0">{s.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${col.text}`}>{s.label}</span>
                              <span className="text-zinc-700 text-xs hidden sm:inline">·</span>
                              <span className="text-zinc-600 text-xs hidden sm:inline">{s.np}</span>
                            </div>
                            <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">{s.whyNepal.slice(0, 80)}…</p>
                          </div>
                          <span className="text-base shrink-0">{STATUS_BADGE[status]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeStage !== null && (
                  <button
                    onClick={() => setActiveStage(null)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    ← सबै stages
                  </button>
                )}
              </div>
            )}

            {/* ── Entity Explorer ─────────────────────────────────────────── */}
            {view === "entities" && (
              <div className="space-y-2">
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-3">AI ले detect गरेका entities — click गरेर हेर्नुहोस्</p>

                <EntitySection
                  icon="⚡" title="Intelligence Atoms" np="AI निकालेका तथ्यहरू"
                  items={entities.atoms}
                  empty="Atoms generate भएन — AI processing complete भएको छैन"
                  color="text-green-400"
                />
                <EntitySection
                  icon="🌳" title="Constitutional References" np="संवैधानिक सन्दर्भ"
                  items={entities.constitutionalRefs.map(r => `${r.article}: ${r.title} — ${r.relevance}`)}
                  empty="Constitutional refs: category बाट infer गरिएको"
                  color="text-amber-400"
                />
                <EntitySection
                  icon="🏛" title="Institutions" np="संस्थाहरू"
                  items={entities.institutions}
                  empty="कुनै institution detect भएन"
                  color="text-cyan-400"
                />
                <EntitySection
                  icon="👥" title="Citizen Groups" np="प्रभावित नागरिक समूह"
                  items={entities.citizenGroups}
                  empty="Citizen groups detect भएन — sectors बाट infer गर्नुहोस्"
                  color="text-violet-400"
                />
                <EntitySection
                  icon="🏢" title="Ministries" np="मन्त्रालयहरू"
                  items={entities.ministries}
                  empty="Ministry explicit detect भएन"
                  color="text-blue-400"
                />
                <EntitySection
                  icon="📋" title="Policy Promises" np="नीतिगत प्रतिबद्धताहरू"
                  items={entities.policyPromises}
                  empty="Policy promises document मा detect भएन — यदि छन् भने manual review गर्नुहोस्"
                  color="text-pink-400"
                />
                <EntitySection
                  icon="📡" title="Implementation Signals" np="कार्यान्वयन संकेत"
                  items={entities.implementationSignals}
                  empty="Implementation signals pending — content ideas बाट derive हुन्छन्"
                  color="text-orange-400"
                />
                {entities.financialFigures.length > 0 && (
                  <EntitySection
                    icon="💰" title="Financial Figures" np="आर्थिक तथ्याङ्क"
                    items={entities.financialFigures}
                    empty=""
                    color="text-emerald-400"
                  />
                )}
              </div>
            )}

            {/* ── Relationship Graph ──────────────────────────────────────── */}
            {view === "graph" && (
              <RelGraph doc={doc} entities={entities} />
            )}

            {/* ── Founder Glossary ────────────────────────────────────────── */}
            {view === "glossary" && (
              <FounderGlossary />
            )}
          </div>
        </>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-900 px-4 py-3 space-y-3">

        {flagging ? (
          <div className="space-y-2">
            <textarea
              value={flagNotes}
              onChange={e => setFlagNotes(e.target.value)}
              placeholder="AI ले के गलत बुझ्यो? कुन stage मा problem छ? (optional)"
              rows={2}
              className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
            />
            <div className="flex gap-2">
              <button
                disabled={acting}
                onClick={actFlag}
                className="flex-1 text-xs py-2 bg-amber-950 border border-amber-800 text-amber-300 rounded-xl disabled:opacity-50 font-semibold"
              >
                {acting ? "…" : "⚠ Revision आवश्यक confirm"}
              </button>
              <button onClick={() => setFlagging(false)} className="text-xs px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl">
                रद्द
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={actApprove}
              className="flex-1 text-xs py-2 bg-green-950 hover:bg-green-900 border border-green-900 text-green-300 rounded-xl transition-colors disabled:opacity-50 font-bold"
            >
              {acting ? "…" : "✅ Civic Intelligence Approve गर्नुहोस्"}
            </button>
            <button
              disabled={acting}
              onClick={() => setFlagging(true)}
              className="text-xs px-3 py-2 bg-amber-950 hover:bg-amber-900 border border-amber-900 text-amber-400 rounded-xl font-semibold"
            >
              ⚠ Revision
            </button>
          </div>
        )}

        {/* ── Action Intelligence — teaches the founder what each button does ── */}
        <PipelineActionIntel doc={doc} trust={trust} />

      </div>
    </div>
  );
}

// ── Pipeline Action Intelligence Panel ───────────────────────────────────────
// Teaches the founder exactly what Approve and Flag do at the backend level,
// including real atom counts derived from this specific document.

function PipelineActionIntel({
  doc,
  trust,
}: {
  doc:   IntelligenceDocument;
  trust: ReturnType<typeof trustFromDoc>;
}) {
  const insightCount  = doc.aiKeyInsights?.length ?? 0;
  const policyCount   = doc.policyChanges?.length ?? 0;
  const finCount      = doc.financialImplications?.length ?? 0;
  const youthCount    = doc.youthImpact ? 1 : 0;
  const ssfCount      = doc.ssfEpfCitRelevance ? 1 : 0;
  const totalAtoms    = insightCount + policyCount + finCount + youthCount + ssfCount;
  const branchHint    = (doc.affectedSectors ?? []).slice(0, 2).join(", ") || doc.category;

  const approveAction: ActionLearnData = {
    icon:  "✅",
    title: "Approve",
    color: "green",
    does:  `यो document लाई Civic Intelligence OS मा officially accept गर्छ। Admin approval नै एकमात्र gate हो जसपछि atoms harvest हुन्छन् — बिना approve, कुनै public intelligence generate हुँदैन। Trust score ${trust.score}/100 (${trust.level}) को basis मा atoms को quality decide हुन्छ।`,
    creates: [
      `vault_intelligence_docs → adminApprovalStatus: "approved", adminApprovedAt: now()`,
      `vault_civic_atoms → ${totalAtoms} नयाँ atoms create हुन्छन्:`,
      `  • ${insightCount} Key Insights → fact/promise/risk atoms`,
      `  • ${policyCount} Policy Changes → policy_change atoms`,
      `  • ${finCount} Financial Implications → financial atoms`,
      ...(youthCount ? [`  • Youth Impact → atom (citizenGroups: युवा)`] : []),
      ...(ssfCount   ? [`  • SSF/EPF Relevance → atom (employment branch)`] : []),
    ],
    flows: [
      `useAtoms(ownerId) hook → Firestore onSnapshot fires → AtomOSClient real-time update`,
      `BranchHealthView: ${branchHint} branches को health score recalculate`,
      `CivicGapView: promise vs implementation gap नयाँ atoms बाट recompute`,
      `TimelineView: atoms आजको date मा monthly bar मा appear`,
      `LearningView (सिक्नुहोस्): नयाँ teaching cards automatically available`,
    ],
    future: [
      "Public Constitution Tree: atoms branches मा visually appear (🌿 healthy / 🍂 decay)",
      "Citizen Alert System: risk atoms → high-priority public notification",
      "Policy Promise Tracker: promise atoms timeline मा track — fulfilled वा unfulfilled",
      "Cross-tree Engine: यो document का atoms, अरू documents का atoms सँग auto-link हुन्छन्",
      "AI Training: approved atoms → future AI model को civic reasoning improve गर्छ",
    ],
    example: totalAtoms > 0
      ? `यो document approve गर्दा ${totalAtoms} atoms harvest हुन्छन् — "${doc.title}" बाट। ${branchHint} branch(es) मा feed हुन्छ। AI confidence: ${Math.round((doc.confidence ?? 0.5) * 100)}%.`
      : `यो document approve गर्दा AI ले key insights नभेटेकाले atoms कम हुन सक्छन् — processing status: ${doc.processingStatus ?? "pending"}.`,
  };

  const flagAction: ActionLearnData = {
    icon:  "⚠",
    title: "Revision",
    color: "amber",
    does:  `Document लाई "needs_revision" status दिन्छ — AI extraction कुनै कुरामा गलत छ भन्ने signal। यो document बाट अहिले कुनै atoms harvest हुँदैनन् (intentional — civic misinformation रोक्नको लागि)। Notes save हुन्छ जसले AI लाई future मा improve गर्न मद्दत गर्छ।`,
    creates: [
      `vault_intelligence_docs → adminApprovalStatus: "needs_revision"`,
      `vault_intelligence_docs → adminApprovalNotes: [तपाईंले लेखेको feedback]`,
      `vault_civic_atoms → कुनै atoms CREATE हुँदैनन् (safety gate — correct data only)`,
    ],
    flows: [
      "Document Documents tab मा pending state मा वापस जान्छ",
      "Admin queue मा visible रहन्छ — re-review को लागि",
      "Re-upload वा Reprocess गरेपछि फेरि approve गर्न मिल्छ",
      "Notes field → future AI feedback loop मा feed हुन्छ (planned)",
    ],
    future: [
      "AI Feedback Loop: तपाईंको revision notes ले AI extraction improve गर्छ",
      "Document Version Control: v1 → revision → v2 → approved chain track हुन्छ",
      "Auto-flag System: low confidence documents automatically needs_revision flag",
      "Quality Scoring: कति documents revised गर्नुपर्यो — AI accuracy metric",
    ],
    example: doc.adminApprovalStatus === "needs_revision"
      ? `Already flagged — Notes: "${doc.adminApprovalNotes ?? "कुनै note छैन"}"`
      : `"${doc.title}" — अहिलेसम्म flag भएको छैन। Trust score ${trust.score}/100 — ${trust.level === "low" || trust.level === "risky" ? "low trust, revision consider गर्नुहोस्" : "approve गर्न उपयुक्त देखिन्छ"}.`,
  };

  return (
    <ActionLearnCard actions={[approveAction, flagAction]} />
  );
}
