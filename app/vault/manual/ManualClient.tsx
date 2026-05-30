"use client";

import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, query, where, orderBy, limit,
  updateDoc, doc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "@/hooks/vault/useVaultAuth";

// ── Section map ──────────────────────────────────────────────────────────────
// Approximate page numbers in the 30-page PDF
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
  { id: "emergency",      label: "Emergency",         page: 30 },
] as const;

const PDF_PATH = "/vault-manual/FOUNDER_OPERATING_MANUAL.pdf";
const MD_GITHUB = "https://github.com/jeevanregmi/zzc-app/blob/main/docs/FOUNDER_OPERATING_MANUAL.md";

// ── Version types ─────────────────────────────────────────────────────────────
interface ManualVersion {
  id: string;
  version: string;
  status: "draft" | "approved" | "rejected";
  summaryOfChanges: string;
  createdAt: Timestamp | null;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ManualClient() {
  const { user } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [pdfPage, setPdfPage] = useState(1);
  const [tab, setTab]         = useState<"pdf" | "history">("pdf");

  // Version history
  const [versions, setVersions]     = useState<ManualVersion[]>([]);
  const [vLoading, setVLoading]     = useState(false);
  const [latestDraft, setLatestDraft] = useState<ManualVersion | null>(null);
  const [approvedVer, setApprovedVer] = useState<ManualVersion | null>(null);

  // Update panel
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [draftNote, setDraftNote]             = useState("");
  const [draftVersion, setDraftVersion]       = useState("");
  const [saving, setSaving]                   = useState(false);
  const [saveMsg, setSaveMsg]                 = useState("");

  // ── Load versions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setVLoading(true);
    getDocs(
      query(
        collection(db, "manual_versions"),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(20),
      )
    )
      .then(snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ManualVersion, "id">) }));
        setVersions(rows);
        setApprovedVer(rows.find(r => r.status === "approved") ?? null);
        setLatestDraft(rows.find(r => r.status === "draft") ?? null);
      })
      .catch(e => console.warn("[manual] versions load failed:", e?.code ?? e))
      .finally(() => setVLoading(false));
  }, [uid]);

  // ── Register draft ─────────────────────────────────────────────────────────
  async function handleRegisterDraft() {
    if (!uid || !draftVersion.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await addDoc(collection(db, "manual_versions"), {
        ownerId:          uid,
        version:          draftVersion.trim(),
        status:           "draft",
        summaryOfChanges: draftNote.trim() || "Manual update",
        markdownPath:     "docs/FOUNDER_OPERATING_MANUAL.md",
        pdfPath:          "public/vault-manual/FOUNDER_OPERATING_MANUAL.pdf",
        createdAt:        serverTimestamp(),
        approvedAt:       null,
        approvedBy:       null,
      });
      setSaveMsg("✓ Draft दर्ता भयो — अब Approve गर्नुहोस्।");
      setDraftVersion("");
      setDraftNote("");
      // reload
      const snap = await getDocs(
        query(collection(db, "manual_versions"), where("ownerId", "==", uid), orderBy("createdAt", "desc"), limit(20))
      );
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ManualVersion, "id">) }));
      setVersions(rows);
      setLatestDraft(rows.find(r => r.status === "draft") ?? null);
    } catch (e) {
      console.error("[manual] draft save failed:", e);
      setSaveMsg("⚠ Save failed — console हेर्नुहोस्।");
    } finally {
      setSaving(false);
    }
  }

  // ── Approve / Reject draft ─────────────────────────────────────────────────
  async function handleVersionAction(id: string, action: "approved" | "rejected") {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "manual_versions", id), {
        status:     action,
        approvedAt: action === "approved" ? serverTimestamp() : null,
        approvedBy: action === "approved" ? uid : null,
      });
      const snap = await getDocs(
        query(collection(db, "manual_versions"), where("ownerId", "==", uid), orderBy("createdAt", "desc"), limit(20))
      );
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ManualVersion, "id">) }));
      setVersions(rows);
      setApprovedVer(rows.find(r => r.status === "approved") ?? null);
      setLatestDraft(rows.find(r => r.status === "draft") ?? null);
    } catch (e) {
      console.error("[manual] version action failed:", e);
    }
  }

  // ── PDF src ────────────────────────────────────────────────────────────────
  const pdfSrc = `${PDF_PATH}#page=${pdfPage}&toolbar=1&navpanes=0`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 px-1">

      {/* ── Header bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            📘 ZZC Founder Operating Manual
          </h1>
          <div className="text-sm text-slate-400 mt-0.5">
            {approvedVer
              ? `v${approvedVer.version} · Approved`
              : "v1.0 · May 2026"}
            {" · Owner: Jeevan Regmi"}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={PDF_PATH}
            download="FOUNDER_OPERATING_MANUAL.pdf"
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors"
          >
            ⬇ Download PDF
          </a>
          <a
            href={PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors"
          >
            🔗 New Tab मा खोल्नुहोस्
          </a>
          <a
            href={MD_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors"
          >
            📄 Markdown
          </a>
          <button
            onClick={() => setShowUpdatePanel(p => !p)}
            className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-sm text-white transition-colors"
          >
            🔄 Manual Update
          </button>
        </div>
      </div>

      {/* ── Draft banner ── */}
      {latestDraft && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <span className="text-amber-300">
            📋 नयाँ draft तयार छ — v{latestDraft.version}:{" "}
            <span className="text-slate-300">{latestDraft.summaryOfChanges}</span>
          </span>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              onClick={() => handleVersionAction(latestDraft.id, "approved")}
              className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => handleVersionAction(latestDraft.id, "rejected")}
              className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}

      {/* ── Update panel ── */}
      {showUpdatePanel && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-900/20 p-4 space-y-3">
          <div className="font-semibold text-sky-300 text-sm">🔄 Manual Update गर्ने तरिका</div>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal ml-4">
            <li>VS Code terminal मा: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300 text-xs">node scripts/generate-manual-pdf.js</code></li>
            <li>Script ले नयाँ PDF generate गरी <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">public/vault-manual/</code> मा copy गर्छ।</li>
            <li>तलको form मा version number र changes लेखेर Draft दर्ता गर्नुहोस्।</li>
            <li>Approve गर्नुहोस् — official manual update हुन्छ।</li>
          </ol>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Version (e.g. 1.1)"
              value={draftVersion}
              onChange={e => setDraftVersion(e.target.value)}
              className="col-span-1 rounded bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              placeholder="Changes को summary…"
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              className="col-span-2 rounded bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegisterDraft}
              disabled={saving || !draftVersion.trim()}
              className="px-4 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {saving ? "Saving…" : "Draft दर्ता गर्नुहोस्"}
            </button>
            {saveMsg && <span className="text-sm text-slate-300">{saveMsg}</span>}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-700 pb-0">
        {(["pdf", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t transition-colors ${
              tab === t
                ? "bg-slate-800 text-white border-b-2 border-sky-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "pdf" ? "📄 Manual पढ्नुहोस्" : "🕐 Version History"}
          </button>
        ))}
      </div>

      {/* ── PDF Tab ── */}
      {tab === "pdf" && (
        <div className="space-y-3">

          {/* Section quick-nav */}
          <div>
            <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Section मा jump गर्नुहोस्</div>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPdfPage(s.page)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    pdfPage === s.page
                      ? "bg-sky-700 border-sky-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* PDF iframe */}
          <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
            <iframe
              key={pdfPage}
              src={pdfSrc}
              className="w-full"
              style={{ height: "82vh", minHeight: "600px" }}
              title="ZZC Founder Operating Manual"
            />
          </div>

          {/* Page hint */}
          <div className="text-xs text-slate-500 text-center">
            PDF viewer मा scroll गर्नुहोस् — full manual 30 pages छ।
            Section buttons ले approximate page मा jump गर्छ।
          </div>
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {vLoading ? (
            <div className="text-slate-400 text-sm py-6 text-center">Loading…</div>
          ) : versions.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 text-center text-slate-400 text-sm">
              <div className="text-2xl mb-2">📋</div>
              अझैसम्म कुनै version दर्ता भएको छैन।<br />
              <span className="text-slate-500">
                "🔄 Manual Update" button थिचेर पहिलो draft register गर्नुहोस्।
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map(v => (
                <div
                  key={v.id}
                  className={`flex items-start justify-between rounded-lg border px-4 py-3 gap-3 ${
                    v.status === "approved"
                      ? "border-emerald-600/40 bg-emerald-900/10"
                      : v.status === "rejected"
                      ? "border-slate-600/40 bg-slate-800/40 opacity-60"
                      : "border-amber-500/40 bg-amber-900/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-white">v{v.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        v.status === "approved" ? "bg-emerald-700 text-emerald-100"
                        : v.status === "rejected" ? "bg-slate-700 text-slate-300"
                        : "bg-amber-700 text-amber-100"
                      }`}>
                        {v.status === "approved" ? "✓ Approved"
                          : v.status === "rejected" ? "✗ Rejected"
                          : "📋 Draft"}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 mt-0.5">{v.summaryOfChanges}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {v.createdAt
                        ? new Date((v.createdAt as Timestamp).toMillis()).toLocaleDateString("ne-NP")
                        : "—"}
                      {v.status === "approved" && v.approvedAt
                        ? ` · Approved: ${new Date((v.approvedAt as Timestamp).toMillis()).toLocaleDateString("ne-NP")}`
                        : ""}
                    </div>
                  </div>
                  {v.status === "draft" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleVersionAction(v.id, "approved")}
                        className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVersionAction(v.id, "rejected")}
                        className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
