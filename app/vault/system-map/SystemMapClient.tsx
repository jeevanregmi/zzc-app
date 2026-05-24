"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useLearningMode } from "../../../contexts/LearningModeContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NodeStatus = "working" | "needs_data" | "broken" | "future" | "testing";

interface SystemNode {
  id: string;
  icon: string;
  label: string;
  labelNepali: string;
  color: string;       // hex
  borderClass: string;
  bgClass: string;
  textClass: string;
  href: string | null;
  reads: string[];
  writes: string[];
  status: NodeStatus;
  statusNote?: string;
  what: string;
  whatNepali: string;
  feedsFrom: string[];
  feedsTo: string[];
  canBreak: string;
  adminNext: string;
  nepaliLearn: string;
}

// ─── Node definitions ──────────────────────────────────────────────────────────

const NODES: SystemNode[] = [
  {
    id: "documents",
    icon: "📄",
    label: "Documents",
    labelNepali: "कागजात",
    color: "#60a5fa",
    borderClass: "border-blue-700",
    bgClass: "bg-blue-950/40",
    textClass: "text-blue-300",
    href: "/vault/documents",
    reads: ["vault_intelligence_docs"],
    writes: ["vault_intelligence_docs"],
    status: "working",
    what: "Upload & store government documents. PDFs, policy files, budget papers. Each document gets a Firestore record with metadata, processing status, and source info.",
    whatNepali: "सरकारी कागजातहरू अपलोड गर्ने ठाउँ। PDF, नीति कागजात, बजेट कागज — सबै यहाँ राखिन्छ।",
    feedsFrom: [],
    feedsTo: ["AI Extraction"],
    canBreak: "Storage quota exceeded, duplicate uploads, or missing required fields (title, source).",
    adminNext: "Upload new government documents. Ensure source authority and date are filled correctly.",
    nepaliLearn: "यो प्रणालीको ढोका हो। तपाईंले कागजात हाल्नु भयो भने मात्र AI ले काम गर्न सक्छ। राम्रो कागजात = राम्रो ज्ञान।",
  },
  {
    id: "ai_extraction",
    icon: "🤖",
    label: "AI Extraction",
    labelNepali: "AI विश्लेषण",
    color: "#fb923c",
    borderClass: "border-orange-700",
    bgClass: "bg-orange-950/40",
    textClass: "text-orange-300",
    href: "/vault/documents",
    reads: ["vault_intelligence_docs (PDF content)"],
    writes: ["vault_civic_atoms (atoms)", "vault_intelligence_docs (processingStatus update)"],
    status: "working",
    what: "Claude AI reads each document and extracts atomic facts, promises, risks, policies, and financial targets. Each fact becomes one CivicAtom with constitutional part links and confidence score.",
    whatNepali: "AI ले कागजात पढेर एक-एक तथ्य निकाल्छ। हरेक तथ्यलाई 'Civic Atom' भनिन्छ — संविधानको कुन धारासँग सम्बन्धित छ भनेर पनि जोड्छ।",
    feedsFrom: ["Documents"],
    feedsTo: ["Admin Review"],
    canBreak: "AI API timeout, malformed PDF, or document language not supported. Check processingStatus field.",
    adminNext: "Monitor documents with status 'ready' or 'ai_paused'. Trigger re-analysis if needed.",
    nepaliLearn: "AI एउटा विद्वान शिक्षकजस्तै हो — तर उसले कहिलेकाहीँ गल्ती गर्छ। त्यसैले मानव समीक्षा अनिवार्य छ।",
  },
  {
    id: "admin_review",
    icon: "👁",
    label: "Admin Review",
    labelNepali: "प्रशासक समीक्षा",
    color: "#fbbf24",
    borderClass: "border-amber-700",
    bgClass: "bg-amber-950/40",
    textClass: "text-amber-300",
    href: "/vault/admin",
    reads: ["vault_intelligence_docs (ai_ready docs)", "vault_civic_atoms (pending atoms)"],
    writes: ["vault_intelligence_docs (adminApprovalStatus)", "vault_civic_atoms (approved flag)", "janta_intelligence (published records)"],
    status: "working",
    what: "Human admin reviews AI-extracted atoms. Approve = atoms become live intelligence. Reject = atoms are discarded. Admin can also trigger content queue, hero images, and deep intelligence extraction.",
    whatNepali: "तपाईं (admin) AI को काम जाँच्नुहुन्छ। स्वीकृत गर्नुभयो भने atom सार्वजनिक हुन्छ। अस्वीकार गर्नुभयो भने हटाइन्छ। तपाईं नै प्रमुख शिक्षक हो।",
    feedsFrom: ["AI Extraction"],
    feedsTo: ["Civic Atoms"],
    canBreak: "Missing admin approval step means atoms stay in limbo — visible to no one. Check 'ai_ready' docs with no adminApprovalStatus.",
    adminNext: "Review all docs with processingStatus='ai_ready'. Approve or reject each atom cluster.",
    nepaliLearn: "तपाईंले स्वीकृत नगरेसम्म AI को ज्ञान नागरिकसम्म पुग्दैन। यो जिम्मेवारी ठूलो छ।",
  },
  {
    id: "civic_atoms",
    icon: "⚛",
    label: "Civic Atoms OS",
    labelNepali: "नागरिक परमाणु",
    color: "#67e8f9",
    borderClass: "border-cyan-700",
    bgClass: "bg-cyan-950/40",
    textClass: "text-cyan-300",
    href: "/vault/atoms",
    reads: ["vault_civic_atoms"],
    writes: ["vault_civic_atoms (relationship links)"],
    status: "working",
    what: "The core intelligence layer. Each CivicAtom is one verified fact/promise/risk linked to Nepal's Constitution. Atoms are typed (fact/promise/risk/policy), scored by confidence, and linked to constitutional parts.",
    whatNepali: "यो प्रणालीको मुटु हो। हरेक atom एउटा ज्ञानको कण हो — संविधान, मन्त्रालय, नागरिक समूह सबैसँग जोडिएको।",
    feedsFrom: ["Admin Review"],
    feedsTo: ["Relationships", "Branch Health", "Public Tree"],
    canBreak: "Atoms without constitutionalParts[] set correctly won't appear in branch health. Confidence < 0.5 atoms are unreliable.",
    adminNext: "Review atom types and constitutional part links in the Atoms OS. Fix mislinked atoms.",
    nepaliLearn: "Atom भनेको ज्ञानको सबैभन्दा सानो एकाइ। जति राम्रो atom, त्यति राम्रो संविधान वृक्ष।",
  },
  {
    id: "relationships",
    icon: "🔗",
    label: "Relationships",
    labelNepali: "सम्बन्ध जाल",
    color: "#a78bfa",
    borderClass: "border-violet-700",
    bgClass: "bg-violet-950/40",
    textClass: "text-violet-300",
    href: "/vault/atoms",
    reads: ["vault_civic_atoms", "janta_relationships"],
    writes: ["janta_relationships"],
    status: "future",
    statusNote: "AI relationship detection — Phase 2",
    what: "Detects connections between atoms: promise vs risk tensions, same-branch cross-document patterns, financial-policy links. Creates a knowledge graph of Nepal's governance.",
    whatNepali: "दुई कागजातका वाचाहरू एकअर्काविरुद्ध छन् कि? यो प्रणालीले त्यो पत्ता लगाउँछ।",
    feedsFrom: ["Civic Atoms"],
    feedsTo: ["Branch Health", "Public Content"],
    canBreak: "No relationship detection running yet — this is a future phase.",
    adminNext: "No action needed now. Phase 2 will auto-generate relationships.",
    nepaliLearn: "जुन दिन यो चल्छ, AI ले भन्न सक्नेछ: 'यो वाचा त्यो जोखिमसँग टकराउँछ।'",
  },
  {
    id: "branch_health",
    icon: "🩺",
    label: "Branch Health",
    labelNepali: "शाखा स्वास्थ्य",
    color: "#4ade80",
    borderClass: "border-green-700",
    bgClass: "bg-green-950/40",
    textClass: "text-green-300",
    href: "/vault/constitution/health",
    reads: ["vault_civic_atoms", "janta_intelligence", "constitutional_framework"],
    writes: [],
    status: "working",
    what: "Computes a health score (0-100) for each of Nepal's 35 constitutional Parts based on evidence from civic atoms and intelligence records. States: healthy/fruiting/budding/weak/yellow/dry/damaged.",
    whatNepali: "नेपालको संविधानका ३५ भागमध्ये कुन भाग कति बलियो छ? atoms को आधारमा स्वास्थ्य अंक दिइन्छ।",
    feedsFrom: ["Civic Atoms", "Relationships"],
    feedsTo: ["Constitution Tree"],
    canBreak: "If vault_civic_atoms has no entries with constitutionalParts set, all parts show as 'unknown'. Requires approved atoms.",
    adminNext: "Approve more documents to fill in weak branches. Check which parts score below 30.",
    nepaliLearn: "वृक्षको पातजस्तै — atom धेरै भए शाखा हरियो, कम भए सुक्खा।",
  },
  {
    id: "constitution_tree",
    icon: "🌳",
    label: "Constitution Tree",
    labelNepali: "संविधान वृक्ष",
    color: "#34d399",
    borderClass: "border-emerald-700",
    bgClass: "bg-emerald-950/40",
    textClass: "text-emerald-300",
    href: "/constitution",
    reads: ["constitutional_framework", "vault_civic_atoms", "janta_intelligence"],
    writes: [],
    status: "working",
    what: "Public visual of Nepal's living constitution. Each branch shows health state, atom count, and intelligence evidence. Citizens can explore constitutional parts and their real-world implementation status.",
    whatNepali: "नागरिकहरूले देख्ने सार्वजनिक संविधान वृक्ष। हरेक शाखाले वास्तविक सरकारी काम देखाउँछ।",
    feedsFrom: ["Branch Health", "Civic Atoms"],
    feedsTo: ["Public Intelligence"],
    canBreak: "If constitutional_framework has no parts loaded, tree shows empty. If atoms have wrong constitutionalParts, branches show incorrect intelligence.",
    adminNext: "Verify public tree reflects current atom state. Share with citizens.",
    nepaliLearn: "यो वृक्ष नागरिकको ऐना हो — सरकारले गरेको कामको सत्य यहाँ देखिन्छ।",
  },
  {
    id: "learning_mode",
    icon: "🎓",
    label: "Learning Mode",
    labelNepali: "सिकाइ मोड",
    color: "#f472b6",
    borderClass: "border-pink-700",
    bgClass: "bg-pink-950/40",
    textClass: "text-pink-300",
    href: "/vault/atoms",
    reads: ["vault_civic_atoms (for context)", "constitutional_framework (for Dhara names)"],
    writes: [],
    status: "testing",
    statusNote: "Active — expand coverage to all pages",
    what: "Nepali-first civic education layer. Admin sees explanations in simple Nepali for every AI concept, every button, every flow. Citizens see accessible constitutional explanations. Teaches thinking patterns, not just rules.",
    whatNepali: "AI ले के गर्यो? किन गर्यो? यसले Nepali मा सजिलो भाषामा बुझाउँछ। Admin र नागरिक दुवैका लागि।",
    feedsFrom: ["Civic Atoms", "Admin Review"],
    feedsTo: ["Public Intelligence"],
    canBreak: "Disabled if LearningModeContext is not wrapped at page level. Check VaultShell provider.",
    adminNext: "Toggle Learning Mode on (🎓 button in sidebar) to see Nepali explanations on every screen.",
    nepaliLearn: "ज्ञान बुझेर दिनु भनेको यन्त्रजस्तो थिच्नु भन्दा धेरै राम्रो। यही सोचेर Learning Mode बनाइयो।",
  },
  {
    id: "public_intelligence",
    icon: "📢",
    label: "Public Content",
    labelNepali: "सार्वजनिक सूचना",
    color: "#facc15",
    borderClass: "border-yellow-700",
    bgClass: "bg-yellow-950/40",
    textClass: "text-yellow-300",
    href: "/vault/content/queue",
    reads: ["vault_content_queue", "janta_intelligence (published)", "vault_civic_atoms (approved)"],
    writes: ["vault_content_queue", "janta_intelligence (publishToJanta)"],
    status: "working",
    what: "Approved atoms and intelligence records flow into the content queue for social media, /janta feed, hero image generation, and policy gaming cards. Citizens receive this intelligence through multiple channels.",
    whatNepali: "स्वीकृत ज्ञान नागरिकसम्म पुग्ने ढोका। /janta feed, social media, र policy cards यहींबाट सुरु हुन्छ।",
    feedsFrom: ["Admin Review", "Constitution Tree", "Learning Mode"],
    feedsTo: [],
    canBreak: "Content queue stuck if items stay in 'pending' status too long. Check queue processing worker.",
    adminNext: "Review content queue. Publish approved items. Generate hero images for high-impact atoms.",
    nepaliLearn: "यो प्रणालीको फूल हो — यहाँ नागरिकले ज्ञानको फल पाउँछन्।",
  },
];

const STATUS_CONFIG: Record<NodeStatus, { label: string; icon: string; color: string }> = {
  working:    { label: "Working",     icon: "✅", color: "text-green-400"  },
  needs_data: { label: "Needs data",  icon: "⚠",  color: "text-amber-400"  },
  broken:     { label: "Broken",      icon: "❌", color: "text-red-400"    },
  future:     { label: "Future",      icon: "🔮", color: "text-violet-400" },
  testing:    { label: "Testing",     icon: "🧪", color: "text-pink-400"   },
};

// ─── Live counts from Firestore ────────────────────────────────────────────────

interface LiveCounts {
  docs_total: number;
  docs_ready: number;
  docs_ai_ready: number;
  docs_approved: number;
  atoms_total: number;
  janta_total: number;
  framework_total: number;
  queue_total: number;
  queue_pending: number;
  relationships_total: number;
}

function useLiveCounts() {
  const [counts, setCounts] = useState<LiveCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "vault_intelligence_docs")),
      getDocs(query(collection(db, "vault_intelligence_docs"), where("processingStatus", "in", ["ready", "ai_paused"]))),
      getDocs(query(collection(db, "vault_intelligence_docs"), where("processingStatus", "==", "ai_ready"))),
      getDocs(query(collection(db, "vault_intelligence_docs"), where("adminApprovalStatus", "==", "approved"))),
      getDocs(collection(db, "vault_civic_atoms")),
      getDocs(collection(db, "janta_intelligence")),
      getDocs(collection(db, "constitutional_framework")),
      getDocs(collection(db, "vault_content_queue")),
      getDocs(query(collection(db, "vault_content_queue"), where("status", "==", "pending"))),
      getDocs(collection(db, "janta_relationships")),
    ])
      .then(([docsAll, docsReady, docsAiReady, docsApproved, atoms, janta, framework, queueAll, queuePending, rels]) => {
        setCounts({
          docs_total:       docsAll.size,
          docs_ready:       docsReady.size,
          docs_ai_ready:    docsAiReady.size,
          docs_approved:    docsApproved.size,
          atoms_total:      atoms.size,
          janta_total:      janta.size,
          framework_total:  framework.size,
          queue_total:      queueAll.size,
          queue_pending:    queuePending.size,
          relationships_total: rels.size,
        });
      })
      .catch(err => console.warn("[SystemMap] count fetch failed:", err?.message ?? err))
      .finally(() => setLoading(false));
  }, []);

  return { counts, loading };
}

// ─── Count badge per node ──────────────────────────────────────────────────────

function nodeCount(nodeId: string, counts: LiveCounts): { primary: string; secondary?: string } | null {
  switch (nodeId) {
    case "documents":        return { primary: `${counts.docs_total} docs`, secondary: counts.docs_approved > 0 ? `${counts.docs_approved} approved` : undefined };
    case "ai_extraction":    return { primary: `${counts.docs_ready} queued`, secondary: counts.docs_ai_ready > 0 ? `${counts.docs_ai_ready} ready` : undefined };
    case "admin_review":     return { primary: `${counts.docs_ai_ready} pending`, secondary: counts.docs_approved > 0 ? `${counts.docs_approved} approved` : undefined };
    case "civic_atoms":      return { primary: `${counts.atoms_total} atoms` };
    case "relationships":    return { primary: `${counts.relationships_total} links` };
    case "branch_health":    return { primary: `${counts.atoms_total + counts.janta_total} signals`, secondary: `${counts.framework_total} parts` };
    case "constitution_tree":return { primary: `${counts.framework_total} parts` };
    case "learning_mode":    return null;
    case "public_intelligence": return { primary: `${counts.queue_total} items`, secondary: counts.queue_pending > 0 ? `${counts.queue_pending} pending` : undefined };
    default:                 return null;
  }
}

// ─── Pipeline flow strip ───────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { icon: "📄", label: "Upload",    color: "#60a5fa", nodeId: "documents"          },
  { icon: "🤖", label: "AI",        color: "#fb923c", nodeId: "ai_extraction"      },
  { icon: "👁", label: "Review",    color: "#fbbf24", nodeId: "admin_review"       },
  { icon: "⚛",  label: "Atoms",     color: "#67e8f9", nodeId: "civic_atoms"        },
  { icon: "🩺", label: "Health",    color: "#4ade80", nodeId: "branch_health"      },
  { icon: "🌳", label: "Tree",      color: "#34d399", nodeId: "constitution_tree"  },
  { icon: "🎓", label: "Learn",     color: "#f472b6", nodeId: "learning_mode"      },
  { icon: "📢", label: "Public",    color: "#facc15", nodeId: "public_intelligence"},
];

// ─── Node card ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  selected,
  counts,
  onSelect,
}: {
  node: SystemNode;
  selected: boolean;
  counts: LiveCounts | null;
  onSelect: () => void;
}) {
  const status = STATUS_CONFIG[node.status];
  const liveCount = counts ? nodeCount(node.id, counts) : null;

  return (
    <button
      onClick={onSelect}
      className={
        "w-full text-left rounded-xl border p-4 transition-all duration-150 " +
        node.borderClass + " " +
        (selected
          ? node.bgClass + " ring-2 ring-offset-2 ring-offset-black " + node.borderClass
          : "bg-zinc-900/50 hover:" + node.bgClass)
      }
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{node.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={"font-bold text-sm " + node.textClass}>{node.label}</span>
            <span className={"text-xs " + status.color} title={node.statusNote}>
              {status.icon} {status.label}
              {node.statusNote && <span className="text-zinc-600 ml-1">({node.statusNote})</span>}
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">{node.labelNepali}</p>
          {liveCount && (
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <span className={"text-xs font-mono font-bold px-1.5 py-0.5 rounded " + node.bgClass + " " + node.textClass}>
                {liveCount.primary}
              </span>
              {liveCount.secondary && (
                <span className="text-xs font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900">
                  {liveCount.secondary}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, counts }: { node: SystemNode; counts: LiveCounts | null }) {
  const { on: learningOn } = useLearningMode();
  const liveCount = counts ? nodeCount(node.id, counts) : null;

  return (
    <div className={"rounded-2xl border p-6 space-y-5 " + node.borderClass + " " + node.bgClass}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">{node.icon}</span>
        <div>
          <h2 className={"text-xl font-bold " + node.textClass}>{node.label}</h2>
          <p className="text-zinc-500 text-sm">{node.labelNepali}</p>
        </div>
        {node.href && (
          <Link
            href={node.href}
            className={"ml-auto px-4 py-2 rounded-lg text-sm font-bold border transition-colors hover:brightness-110 " + node.borderClass + " " + node.textClass + " " + node.bgClass}
          >
            Open →
          </Link>
        )}
      </div>

      {/* Live counts */}
      {liveCount && (
        <div className="flex gap-3 flex-wrap">
          <div className={"rounded-lg px-4 py-2 " + node.bgClass + " border " + node.borderClass}>
            <p className={"text-lg font-bold font-mono " + node.textClass}>{liveCount.primary}</p>
            <p className="text-xs text-zinc-600">live count</p>
          </div>
          {liveCount.secondary && (
            <div className="rounded-lg px-4 py-2 bg-zinc-900 border border-zinc-800">
              <p className="text-lg font-bold font-mono text-zinc-300">{liveCount.secondary}</p>
              <p className="text-xs text-zinc-600">secondary</p>
            </div>
          )}
        </div>
      )}

      {/* What it does */}
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">What it does</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{node.what}</p>
      </div>

      {/* Reads / Writes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">📖 Reads from</p>
          <ul className="space-y-1">
            {node.reads.map(r => (
              <li key={r} className="text-xs font-mono text-zinc-400 bg-zinc-900 rounded px-2 py-1">{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">✍ Writes to</p>
          {node.writes.length > 0 ? (
            <ul className="space-y-1">
              {node.writes.map(w => (
                <li key={w} className="text-xs font-mono text-zinc-400 bg-zinc-900 rounded px-2 py-1">{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600 italic">Read-only system</p>
          )}
        </div>
      </div>

      {/* Flow */}
      <div className="grid grid-cols-2 gap-4">
        {node.feedsFrom.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">⬅ Receives from</p>
            <div className="flex gap-1 flex-wrap">
              {node.feedsFrom.map(f => (
                <span key={f} className="text-xs bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5 text-zinc-400">{f}</span>
              ))}
            </div>
          </div>
        )}
        {node.feedsTo.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">➡ Sends to</p>
            <div className="flex gap-1 flex-wrap">
              {node.feedsTo.map(f => (
                <span key={f} className="text-xs bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5 text-zinc-400">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Can break + admin next */}
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3">
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">⚠ What can break</p>
          <p className="text-xs text-red-300/80 leading-relaxed">{node.canBreak}</p>
        </div>
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">✅ Admin next step</p>
          <p className="text-xs text-amber-300/80 leading-relaxed">{node.adminNext}</p>
        </div>
      </div>

      {/* Nepali Learning */}
      {learningOn && (
        <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4">
          <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-1.5">🎓 Nepali मा बुझौं</p>
          <p className="text-sm text-cyan-200 leading-relaxed">{node.nepaliLearn}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main client ───────────────────────────────────────────────────────────────

export function SystemMapClient() {
  const [selectedId, setSelectedId] = useState<string>(NODES[0].id);
  const { counts, loading } = useLiveCounts();
  const { on: learningOn } = useLearningMode();

  const selected = NODES.find(n => n.id === selectedId) ?? NODES[0];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 bg-zinc-950 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">🗺</span>
            <div>
              <h1 className="text-lg font-bold text-white">Tree Intelligence OS — System Map</h1>
              <p className="text-xs text-zinc-500">Founder Control Room · सबै प्रणाली एकै ठाउँमा</p>
            </div>
            {loading && (
              <span className="ml-auto text-xs text-zinc-600 animate-pulse">Loading live counts…</span>
            )}
          </div>

          {/* Pipeline strip */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.nodeId} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSelectedId(step.nodeId)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all " +
                    (selectedId === step.nodeId
                      ? "border-zinc-500 bg-zinc-800 text-white"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700")
                  }
                  style={selectedId === step.nodeId ? { borderColor: step.color, color: step.color } : {}}
                >
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                </button>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span className="text-zinc-700 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Nepali OS intro (learning mode) ───────────────────────────────── */}
      {learningOn && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-4 py-3 text-xs text-cyan-300 leading-relaxed">
            <span className="font-bold">🎓 यो के हो?</span> ZZC को सम्पूर्ण AI प्रणाली एकै ठाउँमा देख्ने ठाउँ।
            कागजात → AI → Admin → Atom → संविधान वृक्ष → नागरिक। बायाँतर्फको सूचीमा जुनसुकै प्रणाली क्लिक गर्नुस् — त्यसको विवरण दायाँतर्फ देखिन्छ।
          </div>
        </div>
      )}

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* Left: node list */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-1 mb-3">
            9 Systems · {NODES.filter(n => n.status === "working").length} working
          </p>
          {NODES.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              counts={counts}
              onSelect={() => setSelectedId(node.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <DetailPanel node={selected} counts={counts} />

          {/* Quick nav shortcuts */}
          <div className="mt-6">
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">Quick access</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {NODES.filter(n => n.href).map(n => (
                <Link
                  key={n.id}
                  href={n.href!}
                  className={
                    "flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all hover:brightness-110 " +
                    n.borderClass + " " + n.bgClass
                  }
                >
                  <span className="text-xl">{n.icon}</span>
                  <span className={"text-xs font-bold leading-tight " + n.textClass}>{n.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Status legend */}
          <div className="mt-4 flex flex-wrap gap-3 px-1">
            {(Object.entries(STATUS_CONFIG) as [NodeStatus, typeof STATUS_CONFIG[NodeStatus]][]).map(([, cfg]) => (
              <span key={cfg.label} className={"text-xs " + cfg.color}>
                {cfg.icon} {cfg.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
