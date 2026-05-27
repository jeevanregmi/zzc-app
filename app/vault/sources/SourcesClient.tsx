"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, getDocs, query, where, addDoc, updateDoc, deleteDoc,
  doc as firestoreDoc, orderBy, limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { SOURCE_REGISTRY, type OfficialSource } from "../../../lib/vault/sourceRegistry";
import type { SourceWatcher, SourceUpdate, CheckSourceResult } from "../../../lib/types/source-monitoring";
import { VaultShell } from "../../../components/vault/VaultShell";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[sources] read failed:", e?.code ?? e); return fb; });

function fileTypeBadge(ft: SourceUpdate["fileType"]) {
  const map: Record<string, { color: string; label: string }> = {
    pdf:  { color: "#ef4444", label: "PDF" },
    docx: { color: "#60a5fa", label: "DOCX" },
    doc:  { color: "#60a5fa", label: "DOC" },
    html: { color: "#94a3b8", label: "HTML" },
    other:{ color: "#94a3b8", label: "FILE" },
  };
  const s = map[ft] ?? map.other;
  return (
    <span style={{ fontSize: "9px", fontWeight: 700, color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}28`, borderRadius: "4px", padding: "1px 6px" }}>
      {s.label}
    </span>
  );
}

function statusBadge(status: SourceUpdate["status"]) {
  const map = {
    new:      { color: "#fbbf24", label: "नयाँ" },
    reviewed: { color: "#60a5fa", label: "हेरियो" },
    uploaded: { color: "#4ade80", label: "Upload भयो" },
    ignored:  { color: "#475569", label: "बेवास्ता" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: "9px", fontWeight: 700, color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}28`, borderRadius: "4px", padding: "2px 7px" }}>
      {s.label}
    </span>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(min / 60);
  const day  = Math.floor(hr / 24);
  if (day > 0) return `${day} दिन अगाडि`;
  if (hr  > 0) return `${hr} घण्टा अगाडि`;
  if (min > 0) return `${min} मिनेट अगाडि`;
  return "भर्खरै";
}

// ─── SourceCard ───────────────────────────────────────────────────────────────

interface SourceCardProps {
  source:    OfficialSource;
  watcher:   SourceWatcher | null;
  updates:   SourceUpdate[];
  onToggle:  (src: OfficialSource) => void;
  onCheck:   (src: OfficialSource, watcher: SourceWatcher) => void;
  onReview:  (update: SourceUpdate, status: SourceUpdate["status"]) => void;
  checking:  boolean;
}

function SourceCard({ source, watcher, updates, onToggle, onCheck, onReview, checking }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const newCount = updates.filter(u => u.status === "new").length;

  return (
    <div style={{
      background:   watcher ? "rgba(30,41,59,0.8)" : "rgba(15,23,42,0.6)",
      border:       `1px solid ${watcher ? "rgba(59,130,246,0.25)" : "rgba(51,65,85,0.4)"}`,
      borderRadius: "10px",
      padding:      "12px 14px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{source.nameNp}</span>
            <span style={{
              fontSize: "9px", padding: "1px 5px", borderRadius: "3px",
              background: source.trustLevel === "primary" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.10)",
              color:      source.trustLevel === "primary" ? "#86efac" : "#94a3b8",
              border:     `1px solid ${source.trustLevel === "primary" ? "rgba(34,197,94,0.2)" : "rgba(148,163,184,0.15)"}`,
            }}>
              {source.trustLevel === "primary" ? "आधिकारिक" : source.trustLevel === "secondary" ? "सरकारी" : "सन्दर्भ"}
            </span>
            {newCount > 0 && (
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "4px", padding: "1px 7px" }}>
                {newCount} नयाँ
              </span>
            )}
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{source.domain}</div>
          {source.noteNp && (
            <div style={{ fontSize: "10px", color: "#475569", marginTop: "3px" }}>{source.noteNp}</div>
          )}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "5px" }}>
            {source.relatedParts.slice(0, 5).map(p => (
              <span key={p} style={{ fontSize: "9px", color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "3px", padding: "1px 5px" }}>
                भाग {p}
              </span>
            ))}
            {source.relatedParts.length > 5 && (
              <span style={{ fontSize: "9px", color: "#475569" }}>+{source.relatedParts.length - 5}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", flexShrink: 0, alignItems: "flex-end" }}>
          {/* Watch toggle */}
          <button
            onClick={() => onToggle(source)}
            style={{
              fontSize: "10px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
              background: watcher ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.10)",
              color:      watcher ? "#4ade80" : "#60a5fa",
              border:     `1px solid ${watcher ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.22)"}`,
            }}
          >
            {watcher ? "✓ Watching" : "+ Watch"}
          </button>
          {watcher && (
            <button
              onClick={() => onCheck(source, watcher)}
              disabled={checking}
              style={{
                fontSize: "10px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", cursor: checking ? "not-allowed" : "pointer",
                background: "rgba(168,85,247,0.10)", color: "#c4b5fd",
                border: "1px solid rgba(168,85,247,0.22)", opacity: checking ? 0.5 : 1,
              }}
            >
              {checking ? "⏳ जाँच्दैछ…" : "🔄 Check Now"}
            </button>
          )}
          <a
            href={source.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "9px", color: "#38bdf8", textDecoration: "none" }}
          >
            🌐 {source.domain}
          </a>
        </div>
      </div>

      {/* Watcher status row */}
      {watcher && (
        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "9px", color: "#475569" }}>
            {watcher.lastCheckedAt ? `अन्तिम जाँच: ${relativeTime(watcher.lastCheckedAt)}` : "अझै जाँचिएको छैन"}
          </span>
          <span style={{
            fontSize: "9px", padding: "1px 6px", borderRadius: "4px",
            background: watcher.status === "active" ? "rgba(34,197,94,0.10)" : watcher.status === "error" ? "rgba(239,68,68,0.10)" : "rgba(148,163,184,0.08)",
            color:      watcher.status === "active" ? "#4ade80" : watcher.status === "error" ? "#ef4444" : "#64748b",
            border:     "1px solid transparent",
          }}>
            {watcher.status === "active" ? "सक्रिय" : watcher.status === "error" ? "त्रुटि" : "रोकिएको"}
          </span>
          {updates.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ marginLeft: "auto", fontSize: "9px", color: "#60a5fa", background: "none", border: "none", cursor: "pointer" }}
            >
              {updates.length} items {expanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      )}

      {/* Updates list */}
      {expanded && updates.length > 0 && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {updates.map(u => (
            <div key={u.id} style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "7px", padding: "8px 10px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                  {fileTypeBadge(u.fileType)}
                  {statusBadge(u.status)}
                  <span style={{ fontSize: "9px", color: "#475569" }}>{relativeTime(u.detectedAt)}</span>
                </div>
                <div style={{ fontSize: "10.5px", color: "#e2e8f0", marginTop: "3px", lineHeight: 1.4 }}>
                  {u.title.slice(0, 100)}
                </div>
                <a href={u.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "9px", color: "#38bdf8", textDecoration: "none" }}>
                  ↗ खोल्नुहोस्
                </a>
              </div>
              {/* Action buttons */}
              {u.status === "new" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                  <a
                    href={`/vault/documents?upload=1&govFolder=${encodeURIComponent(u.likelyGovFolder)}&tags=${encodeURIComponent(u.tags.join(","))}`}
                    style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: "5px", padding: "3px 7px", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    📤 Upload
                  </a>
                  <button
                    onClick={() => onReview(u, "reviewed")}
                    style={{ fontSize: "9px", color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: "5px", padding: "3px 7px", cursor: "pointer" }}
                  >
                    ✓ Review
                  </button>
                  <button
                    onClick={() => onReview(u, "ignored")}
                    style={{ fontSize: "9px", color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "3px 7px", cursor: "pointer" }}
                  >
                    × Ignore
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SourcesClient() {
  const { user } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [watchers,  setWatchers]  = useState<SourceWatcher[]>([]);
  const [updates,   setUpdates]   = useState<SourceUpdate[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [log,       setLog]       = useState<string[]>([]);
  const [filter,    setFilter]    = useState<"all" | "watched" | "new">("all");

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 20));

  // ─── Load from Firestore ───────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!uid) return;
    const [wSnap, uSnap] = await Promise.all([
      safe(getDocs(query(collection(db, "monitored_sources"), where("ownerId", "==", uid), limit(100))), null),
      safe(getDocs(query(collection(db, "source_updates"),   where("ownerId", "==", uid), orderBy("detectedAt", "desc"), limit(200))), null),
    ]);
    if (wSnap) setWatchers(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as SourceWatcher)));
    if (uSnap) setUpdates(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as SourceUpdate)));
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // ─── Toggle watch ──────────────────────────────────────────────────────────

  const toggleWatch = useCallback(async (src: OfficialSource) => {
    if (!uid) return;
    const existing = watchers.find(w => w.sourceId === src.sourceId);
    if (existing) {
      await safe(deleteDoc(firestoreDoc(db, "monitored_sources", existing.id)), undefined);
      setWatchers(prev => prev.filter(w => w.id !== existing.id));
      addLog(`${src.nameNp} — watching बन्द गरियो`);
    } else {
      const now = new Date().toISOString();
      const watcher: Omit<SourceWatcher, "id"> = {
        ownerId:        uid,
        sourceId:       src.sourceId,
        url:            src.officialUrl,
        status:         "active",
        checkFrequency: "manual",
        lastCheckedAt:  null,
        lastKnownUrls:  [],
        createdAt:      now,
      };
      const ref = await addDoc(collection(db, "monitored_sources"), watcher);
      setWatchers(prev => [...prev, { id: ref.id, ...watcher }]);
      addLog(`${src.nameNp} — watch थपियो`);
    }
  }, [uid, watchers]);

  // ─── Check source ──────────────────────────────────────────────────────────

  const checkSource = useCallback(async (src: OfficialSource, watcher: SourceWatcher) => {
    if (!uid || checkingId) return;
    setCheckingId(src.sourceId);
    addLog(`${src.nameNp} जाँच्दैछ…`);

    try {
      const res = await fetch("/api/check-source", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: watcher.url, sourceId: src.sourceId, lastKnownUrls: watcher.lastKnownUrls }),
      });
      const data: CheckSourceResult = await res.json();

      // Update watcher in Firestore
      const allFoundUrls = data.foundUrls.map(l => l.url);
      await safe(updateDoc(firestoreDoc(db, "monitored_sources", watcher.id), {
        lastCheckedAt:  data.checkedAt,
        lastKnownUrls:  allFoundUrls,
        status:         data.error ? "error" : "active",
        errorMessage:   data.error ?? null,
      }), undefined);

      // Save new source_update records
      const newUpdates: SourceUpdate[] = [];
      for (const link of data.newUrls) {
        const update: Omit<SourceUpdate, "id"> = {
          ownerId:         uid,
          sourceId:        src.sourceId,
          watcherId:       watcher.id,
          url:             link.url,
          title:           link.title,
          fileType:        link.fileType,
          detectedAt:      data.checkedAt,
          status:          "new",
          likelyGovFolder: src.relatedGovFolders[0] ?? "policy-planning",
          likelyParts:     src.relatedParts.slice(0, 3),
          tags:            src.tags.slice(0, 5),
          confidence:      link.fileType === "pdf" ? 0.85 : 0.5,
        };
        const ref = await addDoc(collection(db, "source_updates"), update);
        newUpdates.push({ id: ref.id, ...update });
      }

      setWatchers(prev => prev.map(w => w.id === watcher.id ? {
        ...w,
        lastCheckedAt:  data.checkedAt,
        lastKnownUrls:  allFoundUrls,
        status:         data.error ? "error" : "active",
      } : w));
      setUpdates(prev => [...newUpdates, ...prev]);

      if (data.error) {
        addLog(`⚠ ${src.nameNp}: ${data.error}`);
      } else {
        addLog(`${src.nameNp}: ${data.foundUrls.length} items, ${data.newUrls.length} नयाँ`);
      }
    } catch (err) {
      addLog(`✗ ${src.nameNp}: ${String(err).slice(0, 80)}`);
    } finally {
      setCheckingId(null);
    }
  }, [uid, checkingId]);

  // ─── Update status ─────────────────────────────────────────────────────────

  const setUpdateStatus = useCallback(async (update: SourceUpdate, status: SourceUpdate["status"]) => {
    await safe(updateDoc(firestoreDoc(db, "source_updates", update.id), { status }), undefined);
    setUpdates(prev => prev.map(u => u.id === update.id ? { ...u, status } : u));
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────────────

  if (!uid) return null;

  const watcherMap: Record<string, SourceWatcher> = {};
  for (const w of watchers) watcherMap[w.sourceId] = w;

  const updatesForSource = (sourceId: string) => updates.filter(u => u.sourceId === sourceId);

  const newUpdateCount = updates.filter(u => u.status === "new").length;

  const filteredSources = SOURCE_REGISTRY.filter(src => {
    if (filter === "watched") return !!watcherMap[src.sourceId];
    if (filter === "new")     return updatesForSource(src.sourceId).some(u => u.status === "new");
    return true;
  });

  return (
    <VaultShell>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#e2e8f0", margin: 0 }}>
            📡 स्रोत अनुगमन
          </h1>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            आधिकारिक सरकारी स्रोतहरूमा नयाँ PDF, प्रतिवेदन, र सूचना पत्ता लगाउनुहोस्।
            Watch थप्नुहोस् → Check Now गर्नुहोस् → नयाँ documents Upload गर्नुहोस्।
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {watchers.length} watching · {newUpdateCount > 0 ? <span style={{ color: "#fbbf24", fontWeight: 700 }}>{newUpdateCount} नयाँ updates</span> : "नयाँ updates छैन"}
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {(["all", "watched", "new"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: "10px", fontWeight: 700, padding: "5px 12px", borderRadius: "6px", cursor: "pointer",
                background: filter === f ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                color:      filter === f ? "#60a5fa" : "#64748b",
                border:     `1px solid ${filter === f ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {f === "all" ? `सबै (${SOURCE_REGISTRY.length})` : f === "watched" ? `Watch गरिएका (${watchers.length})` : `नयाँ (${newUpdateCount})`}
            </button>
          ))}
        </div>

        {/* Source grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredSources.map(src => (
            <SourceCard
              key={src.sourceId}
              source={src}
              watcher={watcherMap[src.sourceId] ?? null}
              updates={updatesForSource(src.sourceId)}
              onToggle={toggleWatch}
              onCheck={checkSource}
              onReview={setUpdateStatus}
              checking={checkingId === src.sourceId}
            />
          ))}
          {filteredSources.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#475569", fontSize: "13px" }}>
              {filter === "watched" ? "अझै कुनै स्रोत watch गरिएको छैन। माथिका स्रोतहरूमा + Watch थप्नुहोस्।"
                : filter === "new"   ? "अहिले कुनै नयाँ update छैन।"
                : "स्रोतहरू भेटिएनन्।"}
            </div>
          )}
        </div>

        {/* Activity log */}
        {log.length > 0 && (
          <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", marginBottom: "6px", letterSpacing: "0.06em" }}>
              गतिविधि लग
            </div>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: "10px", color: "#64748b", padding: "1px 0" }}>{l}</div>
            ))}
          </div>
        )}
      </div>
    </VaultShell>
  );
}
