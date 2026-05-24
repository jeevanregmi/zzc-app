/**
 * Civic Atom Engine
 *
 * The bridge between raw document intelligence and the Civic Intelligence OS.
 * Every atom is a self-contained, explainable unit of civic knowledge.
 *
 * Harvesting pipeline:
 *   IntelligenceDocument → [harvest] → CivicAtom[] → vault_civic_atoms collection
 *
 * Each atom carries:
 *   - the fact itself
 *   - AI reasoning for every classification decision
 *   - constitutional mapping with explanation
 *   - confidence factors (why X%)
 *   - intelligence flow (where this atom goes next in the OS)
 */

import {
  collection, addDoc, deleteDoc, getDocs, query, where,
  onSnapshot, Timestamp, type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { IntelligenceDocument } from "../types/documents";
import type { CivicAtom, AtomType, BranchId } from "../types/atoms";
import { CONSTITUTION_BRANCHES } from "../types/atoms";

const COL_ATOMS = "vault_civic_atoms";

// ── Constitutional part mapping (Constitution of Nepal 2072) ─────────────────
// Maps sector keywords to Part numbers (1–35)

const SECTOR_TO_PARTS: Record<string, number[]> = {
  education:     [3, 4],   // Part 3: Fundamental Rights, Part 4: Directive Principles
  school:        [3, 4],
  university:    [3, 4],
  health:        [3, 4],
  hospital:      [3, 4],
  medicine:      [3, 4],
  employment:    [3, 4],
  labor:         [3, 4],
  ssf:           [3, 4],
  epf:           [3, 4],
  pension:       [3, 4],
  housing:       [3, 4],
  shelter:       [3, 4],
  food:          [3, 4],
  agriculture:   [4],
  farming:       [4],
  environment:   [3, 4],
  water:         [3, 4],
  energy:        [4],
  electricity:   [4],
  finance:       [10, 23], // Part 10: Economic Procedures, Part 23: Finance
  budget:        [10, 23],
  banking:       [10, 23],
  nrb:           [23],
  tax:           [10, 23],
  revenue:       [10, 23],
  information:   [3],      // Part 3: Right to Information
  press:         [3],
  media:         [3],
  governance:    [5, 7],   // Part 5: State Structure, Part 7: Federal Executive
  parliament:    [8, 9],   // Part 8: Federal Legislature, Part 9: Federal Laws
  judiciary:     [11],     // Part 11: Judiciary
  rights:        [3],
  social:        [3, 4],
  dalit:         [3, 28],  // Part 28: National Human Rights Commission
  women:         [3, 29],  // Part 29: National Women Commission
  indigenous:    [3, 32],  // Part 32: National Indigenous Commission
  infrastructure:[4, 20],  // Part 4 + Part 20: Local Governance
  local:         [18, 19, 20],
};

function mapSectorsToParts(sectors: string[], topics: string[]): number[] {
  const all  = [...sectors, ...topics].map(s => s.toLowerCase());
  const parts = new Set<number>();
  for (const kw of all) {
    for (const [sector, partNums] of Object.entries(SECTOR_TO_PARTS)) {
      if (kw.includes(sector)) partNums.forEach(p => parts.add(p));
    }
  }
  return parts.size > 0 ? Array.from(parts).sort((a, b) => a - b) : [4]; // default: Directive Principles
}

// ── Atom type detection ───────────────────────────────────────────────────────

const PROMISE_RE   = /गरिनेछ|गर्नेछ|will be|shall|प्रतिबद्ध|commitment|योजना छ|proposed|लक्ष्य राखिएको/i;
const FINANCIAL_RE = /रु\.|npr|nrs|करोड|अर्ब|%|rate|ब्याज|दर|budget|बजेट|million|billion|lakh|लाख/i;
const POLICY_RE    = /नीति|policy|नियम|rule|ऐन|act|अध्यादेश|ordinance|amendment|संशोधन|regulation|विनियम/i;
const RIGHT_RE     = /हक|right|अधिकार|guarantee|ग्यारेन्टी|entitle|entitled/i;
const RISK_RE      = /जोखिम|risk|खतरा|concern|challenge|problem|समस्या|चुनौती|threat/i;
const TARGET_RE    = /लक्ष्य|target|goal|objective|उद्देश्य|\d+%|\d+ percent/i;

export function detectAtomType(text: string): AtomType {
  if (PROMISE_RE.test(text))   return "promise";
  if (FINANCIAL_RE.test(text)) return "financial";
  if (POLICY_RE.test(text))    return "policy_change";
  if (RIGHT_RE.test(text))     return "right";
  if (RISK_RE.test(text))      return "risk";
  if (TARGET_RE.test(text))    return "target";
  return "fact";
}

// ── AI reasoning generators ───────────────────────────────────────────────────

function generateTypeReasoning(text: string, type: AtomType): string {
  const snippet = text.slice(0, 60);
  switch (type) {
    case "promise": {
      const m = text.match(PROMISE_RE);
      return `"${m?.[0] ?? "commitment language"}" keyword detect भयो — यो atom सरकारको भविष्य प्रतिबद्धता हो। Text: "${snippet}…"`;
    }
    case "financial": {
      const m = text.match(FINANCIAL_RE);
      return `आर्थिक indicator "${m?.[0] ?? "financial keyword"}" detect भयो — यो atom monetary impact वा आर्थिक fact describe गर्छ।`;
    }
    case "policy_change":
      return `नीति/नियम सम्बन्धी keywords detect भए — यो atom existing rule वा regulation मा भएको बदलाव हो।`;
    case "right":
      return `"हक" वा "अधिकार" keyword detect भयो — यो atom संवैधानिक right reaffirm वा reference गर्छ।`;
    case "risk":
      return `"जोखिम" वा "challenge" keyword detect भयो — यो atom नागरिकलाई सावधान गर्ने civic risk signal हो।`;
    case "target":
      return `Numerical goal वा लक्ष्य detect भयो — यो atom government target हो जुन time मा track गर्न सकिन्छ।`;
    case "fact":
      return `Specific commitment वा risk language detect भएन — यो atom document बाट निकालिएको verifiable civic fact हो।`;
    default:
      return `Pattern matching: ${type} type inferred from text context.`;
  }
}

function generateConstitutionalLinkReasoning(
  branches:  BranchId[],
  parts:     number[],
  sectors:   string[],
  category:  string,
): string {
  if (branches.length === 0) {
    return `Sectors [${sectors.join(", ") || "none"}] ले कुनै branch keywords match गरेन। Category "${category}" बाट default mapping लागू।`;
  }
  const branchDesc = branches.map(bid => {
    const b = CONSTITUTION_BRANCHES.find(x => x.id === bid);
    return b ? `${b.article} (${b.title})` : bid;
  }).join(", ");
  const matchedSectors = sectors.filter(s =>
    branches.some(bid => {
      const b = CONSTITUTION_BRANCHES.find(x => x.id === bid);
      return b?.sectors.some(kw => s.toLowerCase().includes(kw));
    })
  );
  return `Sectors [${matchedSectors.join(", ") || sectors.join(", ")}] ले ${branchDesc} keywords match गर्यो। Constitutional parts: ${parts.join(", ")} — यी नै Constitution of Nepal 2072 का relevant parts हुन्।`;
}

function generateConfidenceFactors(doc: IntelligenceDocument): string[] {
  const factors: string[] = [];
  const conf = doc.confidence ?? 0.5;
  if (doc.sourceType === "official")
    factors.push(`✅ Official government source — confidence boost`);
  else if (doc.sourceType === "unofficial")
    factors.push(`⚠ Unofficial source — confidence reduced`);
  if (doc.sourceCredibility === "high")
    factors.push(`✅ AI assessed high source credibility`);
  else if (doc.sourceCredibility === "low" || doc.sourceCredibility === "unverified")
    factors.push(`⚠ Source credibility ${doc.sourceCredibility} — verify before acting`);
  if ((doc.aiRetryCount ?? 0) > 0)
    factors.push(`⚠ AI needed ${doc.aiRetryCount} retries — extraction may have been difficult`);
  if (doc.mimeType?.includes("image"))
    factors.push(`⚠ Image document — OCR errors possible, especially Nepali text`);
  if (conf >= 0.8)
    factors.push(`✅ Overall confidence ${Math.round(conf * 100)}% — document was clearly processed`);
  else if (conf < 0.5)
    factors.push(`❌ Low confidence ${Math.round(conf * 100)}% — treat this atom with caution`);
  if (factors.length === 0)
    factors.push(`Confidence ${Math.round(conf * 100)}% — standard extraction from ${doc.category} document`);
  return factors;
}

function generateIntelligenceFlow(type: AtomType, branches: BranchId[]): string[] {
  const branchNames = branches.slice(0, 2).map(bid => {
    const b = CONSTITUTION_BRANCHES.find(x => x.id === bid);
    return b ? b.title : bid;
  });
  const base = branchNames.length > 0
    ? [`🌳 Constitution Tree: ${branchNames.join(" + ")} branch मा atom feed हुन्छ`]
    : ["🌳 Constitution Tree: category बाट branch infer हुन्छ"];

  const typeFlow: Partial<Record<AtomType, string[]>> = {
    promise:       [
      "📊 Civic Gap Engine: promise register हुन्छ — implementation track हुन्छ",
      "⏱ Timeline: promise date देखि track शुरु",
      "🎓 Public Learning: 'सरकारले के भन्यो' teaching card बन्छ",
      "🔮 Future: Policy Tree मा linked हुन्छ",
    ],
    financial:     [
      "💰 Budget Tree: financial figure budget layer मा जान्छ",
      "📊 Civic Gap: budget allocation vs expenditure track",
      "🎓 Learning: 'यसले तपाईंको पैसामा असर' teaching card",
      "🔮 Future: Complaint Tree को financial evidence बन्छ",
    ],
    policy_change: [
      "📜 Policy Tree: rule change tracked",
      "🔗 Cross-tree: related policies across branches linked",
      "🎓 Learning: 'नयाँ नियम के हो' teaching card",
      "🔮 Future: Legal Tree contradiction detector",
    ],
    risk:          [
      "⚠ Risk Registry: branch health मा decay signal",
      "📢 Citizen Alert: high-priority risks → public notification",
      "🎓 Learning: 'सावधान रहनुहोस्' teaching card",
      "🔮 Future: Complaint Tree correlation",
    ],
    fact:          [
      "✅ Implementation Evidence: promise tracking मा evidence",
      "📊 Civic Gap: gap score reduce गर्छ",
      "🎓 Learning: 'के भइरहेको छ' teaching card",
    ],
  };

  return [...base, ...(typeFlow[type] ?? ["🎓 Public Learning मा contribute हुन्छ"])];
}

// ── Constitutional branch mapping ─────────────────────────────────────────────

export function mapSectorsToBranches(sectors: string[], topics: string[]): BranchId[] {
  const all = [...sectors, ...topics].map(s => s.toLowerCase());
  const matched = new Set<BranchId>();
  for (const branch of CONSTITUTION_BRANCHES) {
    if (branch.sectors.some(kw => all.some(s => s.includes(kw)))) {
      matched.add(branch.id);
    }
  }
  return matched.size > 0 ? Array.from(matched) : [];
}

const SECTOR_TO_CITIZENS: Record<string, string> = {
  education:   "विद्यार्थी, शिक्षक, र अभिभावक",
  health:      "बिरामी, गर्भवती महिला, र स्वास्थ्यकर्मी",
  employment:  "कर्मचारी, श्रमिक, र उद्यमी",
  ssf:         "SSF दर्ता निजी क्षेत्र श्रमिक",
  epf:         "EPF सदस्यहरू — सरकारी कर्मचारी",
  housing:     "घर खरीदकर्ता र किरायाकर्ता",
  food:        "किसान र खाद्य असुरक्षित नागरिक",
  agriculture: "कृषक र कृषि मजदूर",
  finance:     "करदाता, बचतकर्ता, र ऋणी",
  banking:     "बैंक खाताधारक र ऋणी",
  social:      "महिला, दलित, र सीमान्तकृत समुदाय",
  information: "पत्रकार, अनुसन्धानकर्ता, र सर्वसाधारण नागरिक",
};

function deriveCitizenGroups(sectors: string[]): string[] {
  const groups: string[] = [];
  for (const sector of sectors) {
    const group = SECTOR_TO_CITIZENS[sector.toLowerCase()];
    if (group && !groups.includes(group)) groups.push(group);
  }
  return groups.slice(0, 4);
}

function constitutionalRefsForCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    education:   ["धारा ३१", "धारा ५१(घ)"],
    health:      ["धारा ३५", "धारा ५१(ङ)"],
    legal:       ["धारा २०", "धारा १०२"],
    finance:     ["धारा ११९", "धारा ५१(छ)"],
    strategy:    ["धारा ५०", "धारा ५१"],
    research:    ["धारा ५१(ज)", "धारा ३३"],
    intelligence:["धारा २७", "धारा १७(२)"],
    content:     ["धारा १७(२)", "धारा २७"],
    other:       ["धारा ५०"],
  };
  return map[category] ?? map.other;
}

// ── Core harvester ────────────────────────────────────────────────────────────

export function harvestAtomsFromDoc(doc: IntelligenceDocument): (Omit<CivicAtom, "id"> & { id: string })[] {
  const atoms: (Omit<CivicAtom, "id"> & { id: string })[] = [];
  const now      = new Date().toISOString();
  const sectors  = doc.affectedSectors ?? [];
  const topics   = doc.detectedTopics  ?? [];
  const branches = mapSectorsToBranches(sectors, topics);
  const parts    = mapSectorsToParts(sectors, topics);
  const refs     = constitutionalRefsForCategory(doc.category);
  const citizens = deriveCitizenGroups(sectors);
  const confFactors = generateConfidenceFactors(doc);

  const base = {
    confidence:             doc.confidence ?? 0.5,
    constitutionalBranches: branches,
    constitutionalRefs:     refs,
    constitutionalParts:    parts,
    affectedSectors:        sectors,
    citizenGroups:          citizens,
    sourceDocId:            doc.id,
    sourceDocTitle:         doc.title,
    sourceCategory:         doc.category,
    sourceAuthority:        doc.sourceAuthority,
    ownerId:                doc.ownerId,
    uploadedAt:             doc.uploadedAt,
    harvestedAt:            now,
    confidenceFactors:      confFactors,
    constitutionalLinkReasoning: generateConstitutionalLinkReasoning(branches, parts, sectors, doc.category),
  };

  function makeAtom(
    id:   string,
    text: string,
    type: AtomType,
    from: CivicAtom["harvestedFrom"],
    overrides: Partial<typeof base> = {},
  ): typeof atoms[number] {
    return {
      ...base,
      ...overrides,
      id,
      text,
      type,
      harvestedFrom:   from,
      typeReasoning:   generateTypeReasoning(text, type),
      intelligenceFlow:generateIntelligenceFlow(type, branches),
    };
  }

  for (const [i, insight] of (doc.aiKeyInsights ?? []).entries()) {
    if (!insight?.trim()) continue;
    const type = detectAtomType(insight);
    atoms.push(makeAtom(`${doc.id}-insight-${i}`, insight, type, "key_insight"));
  }

  for (const [i, change] of (doc.policyChanges ?? []).entries()) {
    if (!change?.trim()) continue;
    atoms.push(makeAtom(`${doc.id}-policy-${i}`, change, "policy_change", "policy_change"));
  }

  for (const [i, fin] of (doc.financialImplications ?? []).entries()) {
    if (!fin?.trim()) continue;
    atoms.push(makeAtom(`${doc.id}-fin-${i}`, fin, "financial", "financial"));
  }

  if (doc.youthImpact?.trim()) {
    atoms.push(makeAtom(
      `${doc.id}-youth`,
      doc.youthImpact,
      detectAtomType(doc.youthImpact),
      "youth_impact",
      { citizenGroups: ["युवा (१८-३५ वर्ष)", ...citizens].slice(0, 4) },
    ));
  }

  if (doc.ssfEpfCitRelevance?.trim()) {
    atoms.push(makeAtom(
      `${doc.id}-ssfepf`,
      doc.ssfEpfCitRelevance,
      detectAtomType(doc.ssfEpfCitRelevance),
      "ssf_epf",
      {
        constitutionalBranches: Array.from(new Set([...branches, "employment" as BranchId])),
        citizenGroups: ["EPF सदस्यहरू", "SSF दर्ता श्रमिक", ...citizens].slice(0, 4),
      },
    ));
  }

  return atoms;
}

// ── Firestore write ───────────────────────────────────────────────────────────

export async function writeAtomsForDoc(doc: IntelligenceDocument): Promise<number> {
  const atoms = harvestAtomsFromDoc(doc);
  if (atoms.length === 0) return 0;
  await deleteAtomsForDoc(doc.id, doc.ownerId);
  await Promise.all(
    atoms.map(atom => addDoc(collection(db, COL_ATOMS), { ...atom, harvestedAt: Timestamp.now() }))
  );
  return atoms.length;
}

export async function deleteAtomsForDoc(docId: string, ownerId: string): Promise<void> {
  const q    = query(collection(db, COL_ATOMS), where("ownerId", "==", ownerId), where("sourceDocId", "==", docId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// ── Firestore read ────────────────────────────────────────────────────────────

export function subscribeAtoms(
  ownerId: string,
  onChange: (atoms: CivicAtom[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, COL_ATOMS), where("ownerId", "==", ownerId));
  return onSnapshot(q, snap => {
    const atoms = snap.docs.map(d => ({ ...d.data(), id: d.id }) as CivicAtom);
    atoms.sort((a, b) => b.confidence - a.confidence);
    onChange(atoms);
  }, err => {
    console.error("subscribeAtoms:", err);
    onError?.(err);
  });
}
