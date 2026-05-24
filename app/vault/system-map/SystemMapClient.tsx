"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NodeStatus = "chalirako" | "data_chahiyo" | "bigriyo" | "pachhi" | "testing";

interface SystemNode {
  id: string;
  icon: string;
  labelNepali: string;
  labelEnglish: string;
  color: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  href: string | null;
  reads: string[];
  writes: string[];
  status: NodeStatus;
  statusNote?: string;
  keGarchha: string;       // what it does — simple Nepali
  kaBaatPaunchha: string;  // receives from
  kahaaJaanchha: string;   // sends to
  keBigrinSakchha: string; // what can break
  adminKoKaam: string;     // admin next step
}

// ─── Node definitions — Nepali-first ──────────────────────────────────────────

const NODES: SystemNode[] = [
  {
    id: "documents",
    icon: "📄",
    labelNepali: "कागजात अपलोड",
    labelEnglish: "Documents",
    color: "#60a5fa",
    borderClass: "border-blue-700",
    bgClass: "bg-blue-950/40",
    textClass: "text-blue-300",
    href: "/vault/documents",
    reads: ["vault_intelligence_docs"],
    writes: ["vault_intelligence_docs"],
    status: "chalirako",
    keGarchha: "सरकारी कागजातहरू (PDF, नीति, बजेट) यहाँ राखिन्छ। हरेक कागजातको नाम, स्रोत, र मिति लेख्नु पर्छ। राम्रो कागजात = राम्रो ज्ञान।",
    kaBaatPaunchha: "तपाईंले (admin) upload गर्नुहुन्छ",
    kahaaJaanchha: "AI विश्लेषणतर्फ जान्छ",
    keBigrinSakchha: "स्रोत authority वा मिति नलेखेमा। Duplicate कागजात हालेमा।",
    adminKoKaam: "नयाँ सरकारी कागजात upload गर्नुस्। स्रोत र मिति सही लेख्नुस्।",
  },
  {
    id: "ai_extraction",
    icon: "🤖",
    labelNepali: "AI ले पढ्छ र तथ्य निकाल्छ",
    labelEnglish: "AI Extraction",
    color: "#fb923c",
    borderClass: "border-orange-700",
    bgClass: "bg-orange-950/40",
    textClass: "text-orange-300",
    href: "/vault/documents",
    reads: ["vault_intelligence_docs (PDF)"],
    writes: ["vault_civic_atoms", "vault_intelligence_docs (status update)"],
    status: "chalirako",
    keGarchha: "Claude AI ले कागजात पढेर एक-एक तथ्य, वाचा, जोखिम, नीति निकाल्छ। हरेक तथ्यलाई 'Civic Atom' भनिन्छ — र त्यो संविधानको कुन भागसँग जोडिन्छ भनेर पनि लेख्छ।",
    kaBaatPaunchha: "कागजात अपलोडबाट",
    kahaaJaanchha: "Admin समीक्षातर्फ",
    keBigrinSakchha: "AI ले गलत बुझ्न सक्छ। PDF राम्ररी scan नभएको भए। कागजात Nepali र English मिश्रित छ भने।",
    adminKoKaam: "'ready' वा 'ai_paused' status भएका कागजातहरू हेर्नुस्। Re-analyze थिच्नुस् यदि गलत देखियो।",
  },
  {
    id: "admin_review",
    icon: "👁",
    labelNepali: "Admin ले जाँच गर्छ",
    labelEnglish: "Admin Review",
    color: "#fbbf24",
    borderClass: "border-amber-700",
    bgClass: "bg-amber-950/40",
    textClass: "text-amber-300",
    href: "/vault/admin",
    reads: ["vault_intelligence_docs (ai_ready)", "vault_civic_atoms (pending)"],
    writes: ["vault_intelligence_docs (approval)", "vault_civic_atoms (approved)", "janta_intelligence"],
    status: "chalirako",
    keGarchha: "तपाईं (admin) AI ले निकालेका तथ्यहरू जाँच्नुहुन्छ। स्वीकृत गर्नुभयो भने ती तथ्य सार्वजनिक हुन्छन्। अस्वीकार गर्नुभयो भने हटाइन्छ। तपाईं नै मुख्य शिक्षक हो — AI कहिलेकाहीँ गल्ती गर्छ।",
    kaBaatPaunchha: "AI विश्लेषणबाट",
    kahaaJaanchha: "Civic Atoms मा जान्छ (स्वीकृत भएपछि)",
    keBigrinSakchha: "Admin ले review नगरेसम्म कुनै पनि तथ्य नागरिकसम्म पुग्दैन। 'ai_ready' status मा अड्किएका कागजात हेर्नुस्।",
    adminKoKaam: "Admin Vault खोल्नुस्। 'ai_ready' कागजातहरू एक-एक जाँच्नुस्। स्वीकृत वा अस्वीकार गर्नुस्।",
  },
  {
    id: "civic_atoms",
    icon: "⚛",
    labelNepali: "नागरिक ज्ञानका कण (Atoms)",
    labelEnglish: "Civic Atoms OS",
    color: "#67e8f9",
    borderClass: "border-cyan-700",
    bgClass: "bg-cyan-950/40",
    textClass: "text-cyan-300",
    href: "/vault/atoms",
    reads: ["vault_civic_atoms"],
    writes: ["vault_civic_atoms"],
    status: "chalirako",
    keGarchha: "हरेक स्वीकृत तथ्य यहाँ 'Atom' बनेर बस्छ। एउटा Atom = एउटा सत्य। जस्तै: 'सरकारले युवालाई ७% रोजगार दिने वाचा गर्‍यो — संविधान भाग ३ अन्तर्गत।' यी atoms मिलेर संविधान वृक्ष बन्छ।",
    kaBaatPaunchha: "Admin स्वीकृतिबाट",
    kahaaJaanchha: "संविधान वृक्ष र शाखा स्वास्थ्यमा जान्छ",
    keBigrinSakchha: "Atom मा संविधानको भाग नम्बर गलत लेखियो भने गलत शाखामा जान्छ। Confidence score कम (०.५ भन्दा कम) भएका atoms अविश्वसनीय हुन्छन्।",
    adminKoKaam: "Atoms OS खोलेर atom types र संविधान भाग links सही छन् कि जाँच्नुस्।",
  },
  {
    id: "relationships",
    icon: "🔗",
    labelNepali: "तथ्यहरूको सम्बन्ध जाल",
    labelEnglish: "Relationships",
    color: "#a78bfa",
    borderClass: "border-violet-700",
    bgClass: "bg-violet-950/40",
    textClass: "text-violet-300",
    href: "/vault/atoms",
    reads: ["vault_civic_atoms", "janta_relationships"],
    writes: ["janta_relationships"],
    status: "pachhi",
    statusNote: "Phase 2 मा आउँछ",
    keGarchha: "दुई कागजातका वाचाहरू एकअर्काविरुद्ध छन् कि? AI ले यो पत्ता लगाउँछ। जस्तै: 'बजेटमा शिक्षामा ५ अर्ब भनिएको छ तर नीतिमा कटौती गरिएको छ' — यस्तो विरोधाभास देखाउँछ।",
    kaBaatPaunchha: "Civic Atoms बाट",
    kahaaJaanchha: "शाखा स्वास्थ्य र सार्वजनिक सूचनामा",
    keBigrinSakchha: "अहिले यो प्रणाली चालु छैन। Phase 2 मा बन्छ।",
    adminKoKaam: "अहिले कुनै काम छैन। Phase 2 मा automatically बन्छ।",
  },
  {
    id: "branch_health",
    icon: "🩺",
    labelNepali: "संविधान शाखाको स्वास्थ्य",
    labelEnglish: "Branch Health",
    color: "#4ade80",
    borderClass: "border-green-700",
    bgClass: "bg-green-950/40",
    textClass: "text-green-300",
    href: "/vault/constitution/health",
    reads: ["vault_civic_atoms", "janta_intelligence", "constitutional_framework"],
    writes: [],
    status: "chalirako",
    keGarchha: "नेपालको संविधानका ३५ भागमध्ये कुन भाग कति बलियो छ? कति atoms (तथ्य) त्यो भागसँग जोडिएका छन् — त्यसको आधारमा ०-१०० स्वास्थ्य अंक दिइन्छ। हरियो = बलियो, सुक्खा = कमजोर।",
    kaBaatPaunchha: "Civic Atoms र Janta Intelligence बाट",
    kahaaJaanchha: "संविधान वृक्षमा देखिन्छ",
    keBigrinSakchha: "Atoms मा 'constitutionalParts' field खाली छ भने सबै भाग 'unknown' देखिन्छ। Admin ले धेरै कागजात approve गर्नु पर्छ।",
    adminKoKaam: "कुन संविधान भाग कमजोर छ हेर्नुस्। त्यस भागसम्बन्धी कागजात upload गर्नुस्।",
  },
  {
    id: "constitution_tree",
    icon: "🌳",
    labelNepali: "सार्वजनिक संविधान वृक्ष",
    labelEnglish: "Constitution Tree",
    color: "#34d399",
    borderClass: "border-emerald-700",
    bgClass: "bg-emerald-950/40",
    textClass: "text-emerald-300",
    href: "/constitution",
    reads: ["constitutional_framework", "vault_civic_atoms", "janta_intelligence"],
    writes: [],
    status: "chalirako",
    keGarchha: "नागरिकहरूले देख्ने सार्वजनिक संविधान वृक्ष। हरेक शाखाले वास्तविक सरकारी काम देखाउँछ — वाचा पूरा भयो कि भएन। नागरिकले बुझ्ने भाषामा।",
    kaBaatPaunchha: "शाखा स्वास्थ्य र Civic Atoms बाट",
    kahaaJaanchha: "नागरिक सूचनातर्फ",
    keBigrinSakchha: "Constitutional Framework मा Parts load नभएको छ भने वृक्ष खाली देखिन्छ। Atoms मा गलत Part number छ भने गलत शाखामा देखिन्छ।",
    adminKoKaam: "सार्वजनिक वृक्ष खोलेर हेर्नुस् — नागरिकले के देख्छन्। गलत देखियो भने atoms ठीक गर्नुस्।",
  },
  {
    id: "learning_mode",
    icon: "🎓",
    labelNepali: "Nepali सिकाइ मोड",
    labelEnglish: "Learning Mode",
    color: "#f472b6",
    borderClass: "border-pink-700",
    bgClass: "bg-pink-950/40",
    textClass: "text-pink-300",
    href: null,
    reads: ["vault_civic_atoms", "constitutional_framework"],
    writes: [],
    status: "testing",
    statusNote: "थपिँदै छ — सबै pages मा",
    keGarchha: "AI ले के गर्यो? किन गर्यो? यसले Nepali मा सजिलो भाषामा बुझाउँछ। Admin र नागरिक दुवैका लागि। हरेक button, हरेक flow — Nepali मा।",
    kaBaatPaunchha: "Civic Atoms र Admin Review बाट context लिन्छ",
    kahaaJaanchha: "सबै vault pages मा देखिन्छ",
    keBigrinSakchha: "LearningModeContext wrap नभएको pages मा काम गर्दैन।",
    adminKoKaam: "Sidebar को 🎓 Civic Learning Mode toggle थिच्नुस् — सबैतिर Nepali explanation देखिन्छ।",
  },
  {
    id: "public_intelligence",
    icon: "📢",
    labelNepali: "नागरिकसम्म पुग्ने सूचना",
    labelEnglish: "Public Content",
    color: "#facc15",
    borderClass: "border-yellow-700",
    bgClass: "bg-yellow-950/40",
    textClass: "text-yellow-300",
    href: "/vault/content/queue",
    reads: ["vault_content_queue", "janta_intelligence", "vault_civic_atoms"],
    writes: ["vault_content_queue", "janta_intelligence"],
    status: "chalirako",
    keGarchha: "स्वीकृत तथ्य र intelligence records नागरिकसम्म पुग्ने ढोका। /janta feed, social media posts, र policy cards यहींबाट सुरु हुन्छ। Admin ले approve नगरेसम्म केही publish हुँदैन।",
    kaBaatPaunchha: "Admin Review र संविधान वृक्षबाट",
    kahaaJaanchha: "नागरिकसम्म (अन्तिम गन्तव्य)",
    keBigrinSakchha: "Content queue मा items 'pending' मा अड्किए। Queue worker काम नगरेको छ भने।",
    adminKoKaam: "Content Queue हेर्नुस्। Approved items publish गर्नुस्। High-impact atoms को hero image बनाउनुस्।",
  },
];

const STATUS_CONFIG: Record<NodeStatus, { label: string; icon: string; color: string }> = {
  chalirako:   { label: "चालु छ",       icon: "✅", color: "text-green-400"  },
  data_chahiyo:{ label: "Data चाहियो",  icon: "⚠",  color: "text-amber-400"  },
  bigriyo:     { label: "बिग्रेको छ",   icon: "❌", color: "text-red-400"    },
  pachhi:      { label: "पछि आउँछ",    icon: "🔮", color: "text-violet-400" },
  testing:     { label: "Testing मा",   icon: "🧪", color: "text-pink-400"   },
};

// ─── Live counts ───────────────────────────────────────────────────────────────

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
          docs_total:          docsAll.size,
          docs_ready:          docsReady.size,
          docs_ai_ready:       docsAiReady.size,
          docs_approved:       docsApproved.size,
          atoms_total:         atoms.size,
          janta_total:         janta.size,
          framework_total:     framework.size,
          queue_total:         queueAll.size,
          queue_pending:       queuePending.size,
          relationships_total: rels.size,
        });
      })
      .catch(err => console.warn("[SystemMap] count fetch failed:", err?.message ?? err))
      .finally(() => setLoading(false));
  }, []);

  return { counts, loading };
}

function nodeCount(nodeId: string, counts: LiveCounts): { primary: string; secondary?: string } | null {
  switch (nodeId) {
    case "documents":          return { primary: `${counts.docs_total} कागजात`, secondary: counts.docs_approved > 0 ? `${counts.docs_approved} स्वीकृत` : undefined };
    case "ai_extraction":      return { primary: `${counts.docs_ready} पर्खिरहेको`, secondary: counts.docs_ai_ready > 0 ? `${counts.docs_ai_ready} तयार` : undefined };
    case "admin_review":       return { primary: `${counts.docs_ai_ready} जाँच बाँकी`, secondary: counts.docs_approved > 0 ? `${counts.docs_approved} स्वीकृत` : undefined };
    case "civic_atoms":        return { primary: `${counts.atoms_total} atoms` };
    case "relationships":      return { primary: `${counts.relationships_total} सम्बन्ध` };
    case "branch_health":      return { primary: `${counts.atoms_total + counts.janta_total} signals`, secondary: `${counts.framework_total} भाग` };
    case "constitution_tree":  return { primary: `${counts.framework_total} संविधान भाग` };
    case "learning_mode":      return null;
    case "public_intelligence":return { primary: `${counts.queue_total} items`, secondary: counts.queue_pending > 0 ? `${counts.queue_pending} review बाँकी` : undefined };
    default:                   return null;
  }
}

// ─── Pipeline strip ────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { icon: "📄", label: "Upload",       color: "#60a5fa", nodeId: "documents"           },
  { icon: "🤖", label: "AI पढ्छ",     color: "#fb923c", nodeId: "ai_extraction"       },
  { icon: "👁",  label: "जाँच",        color: "#fbbf24", nodeId: "admin_review"        },
  { icon: "⚛",  label: "Atoms",        color: "#67e8f9", nodeId: "civic_atoms"         },
  { icon: "🩺", label: "स्वास्थ्य",   color: "#4ade80", nodeId: "branch_health"       },
  { icon: "🌳", label: "वृक्ष",        color: "#34d399", nodeId: "constitution_tree"   },
  { icon: "🎓", label: "सिकाइ",        color: "#f472b6", nodeId: "learning_mode"       },
  { icon: "📢", label: "नागरिक",       color: "#facc15", nodeId: "public_intelligence" },
];

// ─── Node card ─────────────────────────────────────────────────────────────────

function NodeCard({
  node, selected, counts, onSelect,
}: {
  node: SystemNode; selected: boolean; counts: LiveCounts | null; onSelect: () => void;
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
          ? node.bgClass + " ring-2 ring-offset-1 ring-offset-black " + node.borderClass
          : "bg-zinc-900/50 hover:" + node.bgClass)
      }
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{node.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={"font-bold text-sm " + node.textClass}>{node.labelNepali}</span>
            <span className={"text-xs " + status.color}>
              {status.icon} {status.label}
              {node.statusNote && <span className="text-zinc-600 ml-1">({node.statusNote})</span>}
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">{node.labelEnglish}</p>
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
  const liveCount = counts ? nodeCount(node.id, counts) : null;

  return (
    <div className={"rounded-2xl border p-6 space-y-5 " + node.borderClass + " " + node.bgClass}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">{node.icon}</span>
        <div>
          <h2 className={"text-xl font-bold " + node.textClass}>{node.labelNepali}</h2>
          <p className="text-zinc-500 text-xs">{node.labelEnglish}</p>
        </div>
        {node.href && (
          <Link
            href={node.href}
            className={"ml-auto px-4 py-2 rounded-lg text-sm font-bold border transition-colors hover:brightness-110 " + node.borderClass + " " + node.textClass + " " + node.bgClass}
          >
            खोल्नुस् →
          </Link>
        )}
      </div>

      {/* Live counts */}
      {liveCount && (
        <div className="flex gap-3 flex-wrap">
          <div className={"rounded-lg px-4 py-2 border " + node.bgClass + " " + node.borderClass}>
            <p className={"text-lg font-bold font-mono " + node.textClass}>{liveCount.primary}</p>
            <p className="text-xs text-zinc-600">अहिले</p>
          </div>
          {liveCount.secondary && (
            <div className="rounded-lg px-4 py-2 bg-zinc-900 border border-zinc-800">
              <p className="text-lg font-bold font-mono text-zinc-300">{liveCount.secondary}</p>
              <p className="text-xs text-zinc-600">अहिले</p>
            </div>
          )}
        </div>
      )}

      {/* Ke garchha */}
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">🎯 यसले के गर्छ?</p>
        <p className="text-sm text-zinc-200 leading-relaxed">{node.keGarchha}</p>
      </div>

      {/* Reads / Writes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">📖 कहाँबाट पढ्छ?</p>
          <ul className="space-y-1">
            {node.reads.map(r => (
              <li key={r} className="text-xs font-mono text-zinc-400 bg-zinc-900/80 rounded px-2 py-1 break-all">{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">✍ कहाँ लेख्छ?</p>
          {node.writes.length > 0 ? (
            <ul className="space-y-1">
              {node.writes.map(w => (
                <li key={w} className="text-xs font-mono text-zinc-400 bg-zinc-900/80 rounded px-2 py-1 break-all">{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600 italic">केवल पढ्छ, लेख्दैन</p>
          )}
        </div>
      </div>

      {/* Flow */}
      <div className="flex gap-2 items-center flex-wrap text-sm">
        <span className="text-zinc-600 text-xs font-bold">⬅ आउँछ:</span>
        <span className="text-zinc-300 text-xs">{node.kaBaatPaunchha}</span>
        <span className="text-zinc-700 mx-2">|</span>
        <span className="text-zinc-600 text-xs font-bold">➡ जान्छ:</span>
        <span className="text-zinc-300 text-xs">{node.kahaaJaanchha}</span>
      </div>

      {/* Can break + admin next */}
      <div className="space-y-3">
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-xs font-bold text-red-400 mb-1.5">⚠ के बिग्रन सक्छ?</p>
          <p className="text-sm text-red-200/80 leading-relaxed">{node.keBigrinSakchha}</p>
        </div>
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-xs font-bold text-amber-400 mb-1.5">✅ अब के गर्ने?</p>
          <p className="text-sm text-amber-200/80 leading-relaxed">{node.adminKoKaam}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main client ───────────────────────────────────────────────────────────────

export function SystemMapClient() {
  const [selectedId, setSelectedId] = useState<string>(NODES[0].id);
  const { counts, loading } = useLiveCounts();

  const selected = NODES.find(n => n.id === selectedId) ?? NODES[0];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">🗺</span>
            <div>
              <h1 className="text-lg font-bold text-white">Tree Intelligence OS — प्रणाली नक्सा</h1>
              <p className="text-xs text-zinc-500">Founder Control Room · कागजातदेखि नागरिकसम्मको पूरा यात्रा</p>
            </div>
            {loading && (
              <span className="ml-auto text-xs text-zinc-600 animate-pulse">गणना हुँदैछ…</span>
            )}
          </div>

          {/* Nepali intro */}
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-400 leading-relaxed">
            <span className="font-bold text-zinc-300">यो के हो?</span> ZZC को सम्पूर्ण AI प्रणाली एकै ठाउँमा। कागजात → AI → Admin → Atom → संविधान वृक्ष → नागरिक।
            बायाँतर्फ जुनसुकै प्रणाली थिच्नुस् — त्यसको विवरण दायाँतर्फ देखिन्छ।
          </div>

          {/* Pipeline strip */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
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

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* Left: node list */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-1 mb-3">
            ९ प्रणाली · {NODES.filter(n => n.status === "chalirako").length} चालु छन्
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

        {/* Right: detail + shortcuts */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <DetailPanel node={selected} counts={counts} />

          {/* Quick nav */}
          <div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">छिटो जानुस्</p>
            <div className="grid grid-cols-4 gap-2">
              {NODES.filter(n => n.href).map(n => (
                <Link
                  key={n.id}
                  href={n.href!}
                  className={"flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all hover:brightness-110 " + n.borderClass + " " + n.bgClass}
                >
                  <span className="text-xl">{n.icon}</span>
                  <span className={"text-[10px] font-bold leading-tight " + n.textClass}>{n.labelNepali.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-3 px-1">
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
