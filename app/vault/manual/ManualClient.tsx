"use client";

import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, query, where, orderBy, limit,
  updateDoc, doc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "@/hooks/vault/useVaultAuth";
import {
  WORKFLOWS, DATA_FLOW_NODES, DICTIONARY, TROUBLESHOOTING, TESTING_STAGES,
  TRUTH_LEVELS, CONSOLIDATION_RULES, CONSOLIDATION_PHASES,
  type WorkflowDef, type DictTerm, type TroubleshootItem,
} from "@/lib/vault/manualContent";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "pdf" | "workflows" | "dataflow" | "testing" | "troubleshoot" | "dictionary" | "future";

interface ManualVersion {
  id:               string;
  version:          string;
  status:           "draft" | "approved" | "rejected";
  summaryOfChanges: string;
  createdAt:        Timestamp | null;
  approvedAt:       Timestamp | null;
  approvedBy:       string | null;
}

interface LiveStatus {
  totalDocs:         number;
  activeJobs:        number;
  failedJobs:        number;
  economyAtoms:      number;
  pendingClass:      number;
  publicRecords:     number;
  approvedVersion:   string;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "pdf",          label: "📘 Manual PDF" },
  { id: "workflows",    label: "🧭 Workflow Map" },
  { id: "dataflow",     label: "🧠 Data Flow" },
  { id: "testing",      label: "🧪 Testing SOP" },
  { id: "troubleshoot", label: "🛠 Troubleshooting" },
  { id: "dictionary",   label: "🧾 Dictionary" },
  { id: "future",       label: "🔭 Future Rules" },
];

const PDF_PATH    = "/vault-manual/FOUNDER_OPERATING_MANUAL.pdf";
const SECTIONS = [
  { id: "big-picture",    label: "ठूलो चित्र",       page: 2  },
  { id: "one-brain",      label: "One Brain",         page: 3  },
  { id: "data-flow",      label: "Data Flow",         page: 4  },
  { id: "backend-pages",  label: "Backend Pages",     page: 5  },
  { id: "workflows",      label: "Workflows",         page: 16 },
  { id: "button-dict",    label: "Button Dictionary", page: 20 },
  { id: "quality-rules",  label: "Quality Rules",     page: 23 },
  { id: "testing-sop",    label: "Testing SOP",       page: 25 },
  { id: "troubleshoot",   label: "Troubleshooting",   page: 27 },
  { id: "golden-dataset", label: "Golden Dataset",    page: 29 },
];

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[manual]", e?.code ?? e); return fb; });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ManualClient() {
  const { user } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [tab, setTab]       = useState<Tab>("workflows");
  const [pdfPage, setPdfPage] = useState(1);

  // Live status
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Version history
  const [versions, setVersions]       = useState<ManualVersion[]>([]);
  const [latestDraft, setLatestDraft] = useState<ManualVersion | null>(null);
  const [approvedVer, setApprovedVer] = useState<ManualVersion | null>(null);

  // Update panel
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [draftVersion, setDraftVersion]       = useState("");
  const [draftNote, setDraftNote]             = useState("");
  const [saving, setSaving]                   = useState(false);
  const [saveMsg, setSaveMsg]                 = useState("");

  // Workflow / dictionary expand
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [expandedStep, setExpandedStep]         = useState<number | null>(null);
  const [expandedTerm, setExpandedTerm]         = useState<string | null>(null);
  const [expandedNode, setExpandedNode]         = useState<string | null>(null);
  const [dictSearch, setDictSearch]             = useState("");

  // ── Load live status ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;
    setStatusLoading(true);
    Promise.all([
      safe(getDocs(query(collection(db, "vault_intelligence_docs"), where("ownerId", "==", uid), limit(200))), null),
      safe(getDocs(query(collection(db, "economy_extraction_jobs"), where("ownerId", "==", uid), limit(100))), null),
      safe(getDocs(query(collection(db, "economy_atoms"), where("ownerId", "==", uid), limit(500))), null),
      safe(getDocs(query(collection(db, "classification_suggestions"), where("ownerId", "==", uid), limit(200))), null),
      safe(getDocs(query(collection(db, "janta_intelligence"), where("ownerId", "==", uid), where("publishToJanta", "==", true), limit(500))), null),
      safe(getDocs(query(collection(db, "manual_versions"), where("ownerId", "==", uid), orderBy("createdAt", "desc"), limit(10))), null),
    ]).then(([docsSnap, jobsSnap, atomsSnap, classSnap, publicSnap, versionsSnap]) => {
      const jobs       = jobsSnap?.docs.map(d => d.data() as Record<string, unknown>) ?? [];
      const activeJobs = jobs.filter(j => j.status !== "completed" && j.status !== "failed").length;
      const failedJobs = jobs.filter(j => j.status === "failed").length;
      const classRows  = classSnap?.docs.map(d => d.data() as Record<string, unknown>) ?? [];
      const pending    = classRows.filter(r => r.status === "pending" || !r.status).length;
      const verRows    = versionsSnap?.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ManualVersion, "id">) })) ?? [];
      const approved   = verRows.find(v => v.status === "approved");

      setStatus({
        totalDocs:       docsSnap?.size ?? 0,
        activeJobs,
        failedJobs,
        economyAtoms:    atomsSnap?.size ?? 0,
        pendingClass:    pending,
        publicRecords:   publicSnap?.size ?? 0,
        approvedVersion: approved?.version ?? "1.0",
      });
      setVersions(verRows);
      setApprovedVer(approved ?? null);
      setLatestDraft(verRows.find(v => v.status === "draft") ?? null);
    }).finally(() => setStatusLoading(false));
  }, [uid]);

  // ── Version actions ─────────────────────────────────────────────────────────

  async function handleRegisterDraft() {
    if (!uid || !draftVersion.trim()) return;
    setSaving(true); setSaveMsg("");
    try {
      await addDoc(collection(db, "manual_versions"), {
        ownerId: uid, version: draftVersion.trim(), status: "draft",
        summaryOfChanges: draftNote.trim() || "Manual update",
        markdownPath: "docs/FOUNDER_OPERATING_MANUAL.md",
        pdfPath: "public/vault-manual/FOUNDER_OPERATING_MANUAL.pdf",
        createdAt: serverTimestamp(), approvedAt: null, approvedBy: null,
      });
      setSaveMsg("✓ Draft दर्ता भयो"); setDraftVersion(""); setDraftNote("");
    } catch { setSaveMsg("⚠ Save failed"); }
    finally { setSaving(false); }
  }

  async function handleVersionAction(id: string, action: "approved" | "rejected") {
    if (!uid) return;
    await updateDoc(doc(db, "manual_versions", id), {
      status: action,
      approvedAt: action === "approved" ? serverTimestamp() : null,
      approvedBy: action === "approved" ? uid : null,
    });
    setVersions(prev => prev.map(v => v.id === id ? { ...v, status: action } : v));
    if (action === "approved") {
      const v = versions.find(x => x.id === id);
      setApprovedVer(v ? { ...v, status: "approved" } : null);
      setLatestDraft(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 px-1 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            📘 ZZC Founder Help Center
          </h1>
          <div className="text-sm text-slate-400 mt-0.5">
            v{approvedVer?.version ?? "1.0"} · Jeevan Regmi · Founder Operating System
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={PDF_PATH} download className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors">⬇ PDF</a>
          <a href={PDF_PATH} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors">🔗 Open</a>
          <button onClick={() => setShowUpdatePanel(p => !p)} className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-sm text-white transition-colors">🔄 Update</button>
        </div>
      </div>

      {/* ── Draft banner ── */}
      {latestDraft && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <span className="text-amber-300">📋 New draft — v{latestDraft.version}: <span className="text-slate-300">{latestDraft.summaryOfChanges}</span></span>
          <div className="flex gap-2 ml-4 shrink-0">
            <button onClick={() => handleVersionAction(latestDraft.id, "approved")} className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs">✓ Approve</button>
            <button onClick={() => handleVersionAction(latestDraft.id, "rejected")} className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs">✗ Reject</button>
          </div>
        </div>
      )}

      {/* ── Live status strip ── */}
      <LiveStatusStrip status={status} loading={statusLoading} />

      {/* ── Update panel ── */}
      {showUpdatePanel && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-900/20 p-4 space-y-3">
          <div className="font-semibold text-sky-300 text-sm">🔄 Manual Update गर्ने तरिका</div>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal ml-4">
            <li>Terminal: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300 text-xs">node scripts/generate-manual-pdf.js</code></li>
            <li>Script ले PDF generate गरी <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">public/vault-manual/</code> मा copy गर्छ।</li>
            <li>Version register गर्नुहोस् → Approve।</li>
          </ol>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" placeholder="Version (e.g. 1.1)" value={draftVersion} onChange={e => setDraftVersion(e.target.value)}
              className="col-span-1 rounded bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
            <input type="text" placeholder="Changes को summary…" value={draftNote} onChange={e => setDraftNote(e.target.value)}
              className="col-span-2 rounded bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRegisterDraft} disabled={saving || !draftVersion.trim()}
              className="px-4 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-sm text-white transition-colors">
              {saving ? "Saving…" : "Draft दर्ता गर्नुहोस्"}
            </button>
            {saveMsg && <span className="text-sm text-slate-300">{saveMsg}</span>}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap border-b border-slate-700 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs rounded-t transition-colors whitespace-nowrap ${
              tab === t.id ? "bg-slate-800 text-white border-b-2 border-sky-500" : "text-slate-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="min-h-[60vh]">

        {/* PDF Tab */}
        {tab === "pdf" && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Section मा jump गर्नुहोस्</div>
              <div className="flex flex-wrap gap-1.5">
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => setPdfPage(s.page)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      pdfPage === s.page ? "bg-sky-700 border-sky-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500 hover:text-white"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
              <iframe key={pdfPage} src={`${PDF_PATH}#page=${pdfPage}&toolbar=1&navpanes=0`}
                className="w-full" style={{ height: "82vh", minHeight: "600px" }} title="ZZC Founder Operating Manual" />
            </div>
            <div className="text-xs text-slate-500 text-center">Full manual 30 pages। Section buttons ले approximate page मा jump गर्छ।</div>
          </div>
        )}

        {/* Workflow Map Tab */}
        {tab === "workflows" && (
          <WorkflowMapTab
            workflows={WORKFLOWS}
            expandedWorkflow={expandedWorkflow}
            setExpandedWorkflow={setExpandedWorkflow}
            expandedStep={expandedStep}
            setExpandedStep={setExpandedStep}
          />
        )}

        {/* Data Flow Tab */}
        {tab === "dataflow" && (
          <DataFlowTab expandedNode={expandedNode} setExpandedNode={setExpandedNode} />
        )}

        {/* Testing Guide Tab */}
        {tab === "testing" && <TestingGuideTab />}

        {/* Troubleshooting Tab */}
        {tab === "troubleshoot" && <TroubleshootingTab />}

        {/* Dictionary Tab */}
        {tab === "dictionary" && (
          <DictionaryTab
            search={dictSearch}
            setSearch={setDictSearch}
            expandedTerm={expandedTerm}
            setExpandedTerm={setExpandedTerm}
          />
        )}

        {/* Future Rules Tab */}
        {tab === "future" && <FutureRulesTab />}
      </div>

      {/* Version history (footer, collapsed) */}
      {versions.length > 0 && (
        <details className="border border-slate-700 rounded-lg">
          <summary className="px-4 py-2.5 cursor-pointer text-sm text-slate-400 hover:text-white">
            🕐 Version History ({versions.length})
          </summary>
          <div className="px-4 pb-3 space-y-2">
            {versions.map(v => (
              <div key={v.id} className={`flex items-start justify-between rounded-lg border px-3 py-2 gap-3 text-sm ${
                v.status === "approved" ? "border-emerald-600/40 bg-emerald-900/10"
                : v.status === "rejected" ? "border-slate-600/40 opacity-50"
                : "border-amber-500/40 bg-amber-900/10"
              }`}>
                <div>
                  <span className="font-mono font-bold text-white">v{v.version}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    v.status === "approved" ? "bg-emerald-700 text-emerald-100"
                    : v.status === "rejected" ? "bg-slate-700 text-slate-300"
                    : "bg-amber-700 text-amber-100"
                  }`}>{v.status}</span>
                  <p className="text-slate-400 text-xs mt-0.5">{v.summaryOfChanges}</p>
                </div>
                {v.status === "draft" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleVersionAction(v.id, "approved")} className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs">Approve</button>
                    <button onClick={() => handleVersionAction(v.id, "rejected")} className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white text-xs">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Live Status Strip ─────────────────────────────────────────────────────────

function LiveStatusStrip({ status, loading }: { status: LiveStatus | null; loading: boolean }) {
  const cards = [
    { label: "Documents",         value: status?.totalDocs,       color: "text-sky-400",    note: "vault मा" },
    { label: "Active Jobs",       value: status?.activeJobs,      color: status?.activeJobs ? "text-cyan-300 animate-pulse" : "text-slate-500", note: "चलिरहेका" },
    { label: "Failed Jobs",       value: status?.failedJobs,      color: status?.failedJobs ? "text-red-400" : "text-slate-500", note: "error" },
    { label: "Economy Atoms",     value: status?.economyAtoms,    color: "text-yellow-400", note: "extracted" },
    { label: "Classification",    value: status?.pendingClass,    color: status?.pendingClass ? "text-amber-400" : "text-slate-500", note: "pending" },
    { label: "Public Records",    value: status?.publicRecords,   color: "text-green-400",  note: "/janta मा" },
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Live System Status</div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {cards.map(c => (
          <div key={c.label}>
            <div className={`text-lg font-bold ${loading ? "text-slate-600" : c.color}`}>
              {loading ? "—" : (c.value ?? 0)}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">{c.label}</div>
            <div className="text-[9px] text-slate-600">{c.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workflow Map Tab ───────────────────────────────────────────────────────────

function WorkflowMapTab({ workflows, expandedWorkflow, setExpandedWorkflow, expandedStep, setExpandedStep }:
  { workflows: WorkflowDef[]; expandedWorkflow: string | null; setExpandedWorkflow: (id: string | null) => void;
    expandedStep: number | null; setExpandedStep: (n: number | null) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        ZZC का सबै major workflows — एउटा click मा पूरा process, backend mechanism, र verification steps।
      </p>
      {workflows.map(wf => {
        const isOpen = expandedWorkflow === wf.id;
        return (
          <div key={wf.id} className="rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden">
            <button
              onClick={() => { setExpandedWorkflow(isOpen ? null : wf.id); setExpandedStep(null); }}
              className="w-full flex items-start justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{wf.icon}</span>
                <div>
                  <div className="font-semibold text-white text-sm">{wf.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{wf.purpose}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <a href={wf.startHref}
                  onClick={e => e.stopPropagation()}
                  className="text-xs px-2.5 py-1 rounded bg-sky-800 hover:bg-sky-700 text-sky-200 transition-colors whitespace-nowrap">
                  → {wf.startPage}
                </a>
                <span className="text-slate-500 text-sm">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-700/60 p-4 space-y-5">

                {/* Steps */}
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Step-by-step Workflow</div>
                  <div className="space-y-2">
                    {wf.steps.map(s => {
                      const stepOpen = expandedStep === s.step;
                      return (
                        <div key={s.step} className="rounded-lg border border-slate-700/60 overflow-hidden">
                          <button
                            onClick={() => setExpandedStep(stepOpen ? null : s.step)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/40 transition-colors text-left"
                          >
                            <span className="w-6 h-6 rounded-full bg-sky-800 text-sky-200 text-xs font-bold flex items-center justify-center shrink-0">
                              {s.step}
                            </span>
                            <span className="text-sm text-white flex-1">{s.action}</span>
                            <span className="text-slate-600 text-xs">{stepOpen ? "▲" : "▼"}</span>
                          </button>
                          {stepOpen && (
                            <div className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700/40">
                              <FieldBox label="तपाईंले के देख्नुहुन्छ" value={s.founderSees} color="text-green-300" />
                              <FieldBox label="Backend ले के गर्छ" value={s.backendDoes} color="text-sky-300" />
                              <FieldBox label="Data created" value={s.dataCreated} color="text-yellow-300" />
                              <FieldBox label="Verify गर्ने ठाउँ" value={s.verifyAt} color="text-slate-300" />
                              <div className="sm:col-span-2">
                                <FieldBox label="अर्को काम" value={s.nextAction} color="text-cyan-300" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Quality Gate</div>
                    <div className="text-xs text-slate-300">{wf.qualityGate}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Public Output</div>
                    <div className="text-xs text-green-300">{wf.publicOutput}</div>
                  </div>
                  <div className="sm:col-span-2 bg-slate-800/50 rounded-lg p-3 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Firestore Collections</div>
                    <div className="flex flex-wrap gap-1.5">
                      {wf.collectionsUsed.map(c => (
                        <span key={c} className="text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Problems */}
                {wf.problems.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Common Problems</div>
                    <div className="space-y-1.5">
                      {wf.problems.map((p, i) => (
                        <div key={i} className="flex gap-3 text-xs bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2">
                          <span className="text-amber-400 shrink-0">⚠</span>
                          <div>
                            <span className="text-amber-200 font-medium">{p.problem}</span>
                            <span className="text-slate-400 ml-2">→ {p.fix}</span>
                            {p.hint && <span className="text-slate-500 ml-1">({p.hint})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-xs leading-snug ${color}`}>{value}</div>
    </div>
  );
}

// ── Data Flow Tab ─────────────────────────────────────────────────────────────

function DataFlowTab({ expandedNode, setExpandedNode }: { expandedNode: string | null; setExpandedNode: (id: string | null) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Data कसरी PDF बाट public intelligence बन्छ — हरेक node मा click गर्नुहोस्।
      </p>

      <div className="flex flex-col items-center gap-0">
        {DATA_FLOW_NODES.map((node, idx) => {
          const isLast   = idx === DATA_FLOW_NODES.length - 1;
          const isOpen   = expandedNode === node.id;
          const needsApproval = node.requiresApproval;
          const isPublic = node.isPublic;

          return (
            <div key={node.id} className="flex flex-col items-center w-full max-w-lg">
              <button
                onClick={() => setExpandedNode(isOpen ? null : node.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                  isPublic        ? "border-green-600/60 bg-green-950/30 hover:bg-green-950/50"
                  : needsApproval ? "border-amber-600/40 bg-amber-950/20 hover:bg-amber-950/30"
                  : "border-slate-700 bg-slate-900/60 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold text-sm ${isPublic ? "text-green-300" : "text-white"}`}>
                      {node.label}
                      {needsApproval && <span className="ml-2 text-[10px] text-amber-400 font-normal">Founder approval चाहिन्छ</span>}
                      {isPublic      && <span className="ml-2 text-[10px] text-green-400 font-normal">Public</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{node.sub}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {node.href && (
                      <a href={node.href} onClick={e => e.stopPropagation()}
                        className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">→</a>
                    )}
                    <span className="text-slate-500 text-xs">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5">
                    <p className="text-xs text-slate-300 leading-relaxed">{node.description}</p>
                    {node.collection && (
                      <div className="text-[10px] text-slate-500">
                        Firestore: <span className="font-mono text-slate-400">{node.collection}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>

              {!isLast && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-0.5 h-4 bg-slate-600" />
                  <div className="text-slate-600 text-xs">↓</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 mt-4 text-xs text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 mb-2">Legend</div>
        <div className="flex gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-900 border border-amber-700 inline-block" /> Founder approval required</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-900 border border-green-700 inline-block" /> Public output</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-600 inline-block" /> Internal / private</span>
        </div>
      </div>
    </div>
  );
}

// ── Testing Guide Tab ─────────────────────────────────────────────────────────

function TestingGuideTab() {
  const [openStage, setOpenStage] = useState<number | null>(null);
  const [checked, setChecked]     = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Stabilization Sprint — 10 real government documents pipeline मा pass गर्नुपर्छ।
          </p>
          <p className="text-xs text-slate-500 mt-1">
            सबै stage sequentially run गर्नुहोस् — एउटा fail भए अर्को नगर्नुहोस्।
          </p>
        </div>
        <div className="text-xs text-slate-500 shrink-0">
          {Object.values(checked).filter(Boolean).length} / {TESTING_STAGES.reduce((sum, s) => sum + s.checks.length, 0)} checks
        </div>
      </div>

      {TESTING_STAGES.map(stage => {
        const isOpen    = openStage === stage.stage;
        const doneCount = stage.checks.filter((_, i) => checked[`${stage.stage}-${i}`]).length;
        const allDone   = doneCount === stage.checks.length;

        return (
          <div key={stage.stage} className={`rounded-lg border overflow-hidden ${allDone ? "border-green-700/50" : "border-slate-700"}`}>
            <button
              onClick={() => setOpenStage(isOpen ? null : stage.stage)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors text-left"
            >
              <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                allDone ? "bg-green-700 text-green-100" : "bg-slate-700 text-slate-300"
              }`}>
                {allDone ? "✓" : stage.stage}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{stage.title}</div>
                <div className="text-xs text-slate-500">{stage.where}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs ${allDone ? "text-green-400" : "text-slate-500"}`}>
                  {doneCount}/{stage.checks.length}
                </span>
                <a href={stage.href} onClick={e => e.stopPropagation()}
                  className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">→</a>
                <span className="text-slate-500 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-700/60 px-4 pb-3 pt-2 space-y-3">
                <div className="space-y-2">
                  {stage.checks.map((check, i) => {
                    const key = `${stage.stage}-${i}`;
                    return (
                      <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                        <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)}
                          className="mt-0.5 rounded accent-sky-500 w-4 h-4 shrink-0" />
                        <span className={`text-sm leading-snug transition-colors ${checked[key] ? "text-slate-500 line-through" : "text-slate-200 group-hover:text-white"}`}>
                          {check}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                  ⚠ Fail भए: {stage.ifFails}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 10-doc sprint table */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <div className="bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">
          10 Golden Documents Sprint
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                {["#", "Document", "Upload", "AI", "Approved", "Intel", "Public"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-400 italic min-w-[160px]">—</td>
                  {["Upload", "AI", "Approved", "Intel", "Public"].map(col => (
                    <td key={col} className="px-3 py-2">
                      <input type="checkbox" className="rounded accent-green-500 w-4 h-4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 text-xs text-slate-500 border-t border-slate-700">
          Sprint complete when: सबै 10 rows मा Intel ✓ छ।
        </div>
      </div>
    </div>
  );
}

// ── Troubleshooting Tab ───────────────────────────────────────────────────────

function TroubleshootingTab() {
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [filter, setFilter]     = useState<"all" | "critical" | "warning" | "info">("all");

  const items = TROUBLESHOOTING.filter(t => filter === "all" || t.severity === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "critical", "warning", "info"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? f === "critical" ? "bg-red-800 border-red-700 text-white"
                  : f === "warning" ? "bg-amber-800 border-amber-700 text-white"
                  : f === "info"    ? "bg-sky-800 border-sky-700 text-white"
                  : "bg-slate-700 border-slate-600 text-white"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
            }`}>
            {f === "all" ? "सबै" : f === "critical" ? "🔴 Critical" : f === "warning" ? "🟡 Warning" : "🔵 Info"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const isOpen = openItem === idx;
          const sevColor = item.severity === "critical" ? "border-red-700/50 bg-red-950/20"
            : item.severity === "warning" ? "border-amber-700/40 bg-amber-950/15"
            : "border-slate-700 bg-slate-900/40";

          return (
            <div key={idx} className={`rounded-lg border overflow-hidden ${sevColor}`}>
              <button
                onClick={() => setOpenItem(isOpen ? null : idx)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors text-left"
              >
                <span className="shrink-0 mt-0.5">
                  {item.severity === "critical" ? "🔴" : item.severity === "warning" ? "🟡" : "🔵"}
                </span>
                <span className="text-sm text-white flex-1">{item.problem}</span>
                <span className="text-slate-500 text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-700/40 px-4 pb-3 pt-2 space-y-2">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Cause</div>
                    <div className="text-xs text-slate-300">{item.cause}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Fix</div>
                    <div className="text-xs text-sky-300">{item.fix}</div>
                  </div>
                  {item.goTo && item.goHref && (
                    <a href={item.goHref}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors mt-1">
                      → {item.goTo} मा जानुहोस्
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dictionary Tab ─────────────────────────────────────────────────────────────

function DictionaryTab({ search, setSearch, expandedTerm, setExpandedTerm }:
  { search: string; setSearch: (s: string) => void; expandedTerm: string | null; setExpandedTerm: (t: string | null) => void }) {
  const filtered = DICTIONARY.filter(d =>
    !search || d.term.toLowerCase().includes(search.toLowerCase()) || d.meaning.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Term खोज्नुहोस्… (e.g. Atom, AI Analyze, Quality)"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
      />

      <div className="flex flex-wrap gap-1.5">
        {DICTIONARY.map(d => (
          <button key={d.term}
            onClick={() => setExpandedTerm(expandedTerm === d.term ? null : d.term)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              expandedTerm === d.term
                ? "bg-sky-700 border-sky-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-600 hover:text-white"
            }`}>
            {d.term}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(term => {
          const isOpen = expandedTerm === term.term;
          return (
            <div key={term.term} className={`rounded-lg border overflow-hidden transition-colors ${isOpen ? "border-sky-600/50 bg-sky-950/20" : "border-slate-700 bg-slate-900/40"}`}>
              <button
                onClick={() => setExpandedTerm(isOpen ? null : term.term)}
                className="w-full flex items-start justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{term.term}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-snug">{term.meaning}</div>
                </div>
                <span className="text-slate-500 text-xs shrink-0 ml-3 mt-0.5">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-700/40 px-4 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldBox label="कहिले use गर्ने" value={term.whenToUse} color="text-sky-300" />
                  <FieldBox label="कहाँ देखिन्छ" value={term.whereSeen} color="text-slate-300" />
                  {term.commonConfusion && (
                    <div className="sm:col-span-2">
                      <FieldBox label="Common Confusion" value={term.commonConfusion} color="text-amber-300" />
                    </div>
                  )}
                  {term.businessAnalogy && (
                    <div className="sm:col-span-2">
                      <FieldBox label="Business भाषामा" value={term.businessAnalogy} color="text-green-300" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Future Rules Tab ──────────────────────────────────────────────────────────

function FutureRulesTab() {
  const [openRule, setOpenRule] = useState<number | null>(null);

  return (
    <div className="space-y-6">

      {/* Core principle */}
      <div className="rounded-xl border border-sky-700/40 bg-sky-950/20 p-5">
        <div className="text-lg font-bold text-sky-200 mb-2">ZZC = एउटा Brain, अनेक Windows</div>
        <p className="text-sm text-slate-300 leading-relaxed">
          ZZC अनेक apps होइन। ZZC <strong className="text-white">एउटा intelligence brain</strong> हो जसका
          अनेक public windows छन् — Civic, Economy, Promise, Constitution, Bhakti, Discussion।
          Brain एउटै हुनु पर्छ। Windows धेरै हुन सक्छन्।
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
          {["Documents", "Atoms", "Evidence", "Classifications", "Relationships", "Quality Scores", "Approvals", "Routes", "Manual"].map(b => (
            <span key={b} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">🧠 {b}</span>
          ))}
        </div>
      </div>

      {/* ZZC Truth Standard */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">ZZC Truth Standard — Data Quality Levels</div>
        <div className="space-y-2">
          {TRUTH_LEVELS.map(l => (
            <div key={l.level} className="flex items-start gap-3 rounded-lg bg-slate-900/60 border border-slate-700 p-3">
              <div className={`text-lg font-bold ${l.color} shrink-0 w-6 text-center`}>{l.level}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${l.color}`}>{l.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l.desc}</div>
              </div>
              <div className="w-24 h-2 bg-slate-800 rounded-full shrink-0 mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${l.bar}`} style={{ width: `${(l.level / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Public pages → Level 3+ prefer गर्नुहोस्। Accountability pages → Level 4+ चाहिन्छ।
        </div>
      </div>

      {/* 10 Consolidation Rules */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">10 Consolidation Rules — Future Development को लागि</div>
        <div className="space-y-2">
          {CONSOLIDATION_RULES.map(r => {
            const isOpen = openRule === r.no;
            return (
              <div key={r.no} className="rounded-lg border border-slate-700 bg-slate-900/40 overflow-hidden">
                <button
                  onClick={() => setOpenRule(isOpen ? null : r.no)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors text-left"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">{r.no}</span>
                  <span className="text-sm text-white flex-1">{r.rule}</span>
                  <span className="text-slate-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-700/40 px-4 pb-2.5 pt-2">
                    <p className="text-xs text-slate-400 leading-snug">{r.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Consolidation Phases Roadmap */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">Consolidation Roadmap — Phase A → E</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONSOLIDATION_PHASES.map(p => (
            <div key={p.phase} className={`rounded-lg border p-3 space-y-2 ${p.color}`}>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Phase {p.phase}</span>
                <span className="text-xs text-slate-400">{p.label}</span>
              </div>
              <ul className="space-y-1">
                {p.items.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="text-slate-600 shrink-0 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Feature test checklist */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="text-sm font-semibold text-white mb-3">New Feature Test — Build गर्नु अघि यी 8 questions</div>
        <div className="space-y-2">
          {[
            "के यो existing atoms / UKO use गर्छ?",
            "के यसमा source evidence छ?",
            "के यसलाई founder approval चाहिन्छ?",
            "के यो Civic, Economy, Promise, Bhakti, Media, Discussion मध्ये एउटामा fit हुन्छ?",
            "के यसले duplicate data create गर्छ?",
            "के public users ले simply बुझ्न सक्छन्?",
            "के founder ले code बिना operate गर्न सक्छ?",
            "के अहिले नै चाहिन्छ, वा stabilization पहिले?",
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
              <span className="text-slate-600 shrink-0 font-mono">{i + 1}.</span>
              {q}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/30 rounded px-3 py-2">
          कुनै पनि answer weak भए — अहिले नबनाउनुहोस्।
        </div>
      </div>

      {/* Business language summary */}
      <div className="rounded-xl border border-slate-600 bg-slate-900/40 p-4">
        <div className="text-sm font-semibold text-white mb-3">ZZC = एउटा Smart Factory</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { term: "Documents",       analogy: "Raw Material" },
            { term: "AI Extractors",   analogy: "Processing Machines" },
            { term: "Atoms",           analogy: "Finished Goods" },
            { term: "Quality Gate",    analogy: "QC Department" },
            { term: "Knowledge Queue", analogy: "Distribution Center" },
            { term: "Public Chautari", analogy: "Showroom" },
            { term: "Manual",          analogy: "Factory Map" },
            { term: "Founder",         analogy: "Quality Approver" },
          ].map(item => (
            <div key={item.term} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              <div className="font-semibold text-white">{item.term}</div>
              <div className="text-slate-500 mt-0.5">= {item.analogy}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
