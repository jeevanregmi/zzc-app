"use client";

import { useState, useEffect } from "react";
import {
  subscribeSignalRoutes,
  createSignalRoute,
  upsertSignalRoute,
  deleteSignalRoute,
} from "../../../lib/vault/firestore";
import { matchSignalRoutes, DEFAULT_SIGNAL_ROUTES } from "../../../lib/data/routing";
import type { SignalRoute, RouteDestination, RouteAction, RoutePriority, KeywordMatchMode } from "../../../lib/types/routing";

// ─── Constants ────────────────────────────────────────────────────────────────

const DESTINATIONS: { value: RouteDestination; label: string; desc: string }[] = [
  { value: "content_queue",       label: "Content Queue",          desc: "Creates a QueueItem draft for admin review" },
  { value: "market_rate_suggest", label: "Rate Update Suggestion", desc: "Creates a suggestion to update a market rate" },
  { value: "scheme_suggest",      label: "Scheme Suggestion",      desc: "Creates a suggestion to update a scheme" },
  { value: "intelligence_flag",   label: "Intelligence Flag",      desc: "Flags signal for deep analysis in Admin Vault" },
];

const ACTIONS: { value: RouteAction; label: string }[] = [
  { value: "create_draft",   label: "Create Draft" },
  { value: "suggest_update", label: "Suggest Update" },
  { value: "flag_review",    label: "Flag for Review" },
];

const PRIORITIES: RoutePriority[] = ["critical", "high", "medium", "low"];

const PRIORITY_COLORS: Record<RoutePriority, string> = {
  critical: "text-red-400 bg-red-900/30 border-red-900",
  high:     "text-orange-400 bg-orange-900/20 border-orange-900",
  medium:   "text-yellow-400 bg-yellow-900/20 border-yellow-900",
  low:      "text-zinc-400 bg-zinc-800 border-zinc-700",
};

const DEST_COLORS: Record<RouteDestination, string> = {
  content_queue:       "text-blue-400",
  market_rate_suggest: "text-green-400",
  scheme_suggest:      "text-purple-400",
  intelligence_flag:   "text-amber-400",
};

// ─── Route form blank ─────────────────────────────────────────────────────────

const BLANK: Omit<SignalRoute, "id" | "createdAt" | "updatedAt" | "matchCount" | "lastMatchAt"> = {
  name:                 "",
  description:          "",
  keywords:             [],
  sectorIds:            [],
  topicIds:             [],
  matchMode:            "any",
  minRelevanceScore:    0.4,
  destination:          "content_queue",
  action:               "create_draft",
  priority:             "medium",
  autoTags:             [],
  autoTopics:           [],
  contentType:          "",
  platform:             "",
  active:               true,
  requiresAdminApproval: true,
};

// ─── Route card ───────────────────────────────────────────────────────────────

function RouteCard({
  route,
  onEdit,
  onToggle,
  onDelete,
  busy,
}: {
  route:    SignalRoute;
  onEdit:   () => void;
  onToggle: () => void;
  onDelete: () => void;
  busy:     boolean;
}) {
  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 space-y-2.5 ${
      route.active ? "border-zinc-700" : "border-zinc-800 opacity-60"
    }`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{route.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[route.priority as RoutePriority] ?? ""}`}>
              {route.priority}
            </span>
            {!route.active && (
              <span className="text-[10px] text-zinc-600 font-mono">PAUSED</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{route.description}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onEdit} className="text-xs px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            Edit
          </button>
          <button
            onClick={onToggle}
            disabled={busy}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
              route.active
                ? "border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-800"
                : "border-green-900 text-green-500 hover:bg-green-900/20"
            }`}
          >
            {route.active ? "रोक्नुस्" : "चालु गर्नुस्"}
          </button>
          <button onClick={onDelete} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg border border-red-900 text-red-500 hover:bg-red-900/20 transition-colors disabled:opacity-50">
            ✕
          </button>
        </div>
      </div>

      {/* Match criteria summary */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-zinc-600">Destination </span>
          <span className={`font-semibold ${DEST_COLORS[route.destination as RouteDestination] ?? "text-zinc-400"}`}>
            {DESTINATIONS.find(d => d.value === route.destination)?.label ?? route.destination}
          </span>
        </div>
        <div>
          <span className="text-zinc-600">Action </span>
          <span className="text-zinc-300">{ACTIONS.find(a => a.value === route.action)?.label ?? route.action}</span>
        </div>
        <div>
          <span className="text-zinc-600">Match mode </span>
          <span className="text-zinc-300 font-mono">{route.matchMode.toUpperCase()}</span>
          <span className="text-zinc-600"> · min score </span>
          <span className="text-zinc-300 font-mono">{route.minRelevanceScore}</span>
        </div>
        <div>
          <span className="text-zinc-600">Fired </span>
          <span className="text-zinc-300 font-mono">{route.matchCount ?? 0}×</span>
          {route.lastMatchAt && (
            <span className="text-zinc-700"> · {route.lastMatchAt.slice(0, 10)}</span>
          )}
        </div>
      </div>

      {/* Keywords */}
      {route.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {route.keywords.map((kw: string) => (
            <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded font-mono">{kw}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Route editor form ────────────────────────────────────────────────────────

function RouteEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Partial<SignalRoute> & { id?: string };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isNew = !initial.id;
  const [form,    setForm]    = useState({ ...BLANK, ...initial });
  const [kwText,  setKwText]  = useState((initial.keywords  ?? []).join(", "));
  const [secText, setSecText] = useState((initial.sectorIds ?? []).join(", "));
  const [topText, setTopText] = useState((initial.topicIds  ?? []).join(", "));
  const [tagText, setTagText] = useState((initial.autoTags  ?? []).join(", "));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  function field<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f: typeof form) => ({ ...f, [k]: v }));
  }

  function splitCsv(s: string): string[] {
    return s.split(",").map(x => x.trim()).filter(Boolean);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        keywords:  splitCsv(kwText),
        sectorIds: splitCsv(secText),
        topicIds:  splitCsv(topText),
        autoTags:  splitCsv(tagText),
      };
      if (isNew) {
        await createSignalRoute(payload);
      } else {
        await upsertSignalRoute(initial.id!, payload);
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600";
  const lbl = "text-[10px] text-zinc-500 block mb-1";
  const sel = inp + " cursor-pointer";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">{isNew ? "New Route" : `Edit: ${initial.name}`}</h2>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white text-xs">✕ Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={lbl}>Route name</label>
          <input className={inp} value={form.name} onChange={e => field("name", e.target.value)} placeholder="NRB Policy → Rate Suggestion" />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Description</label>
          <input className={inp} value={form.description} onChange={e => field("description", e.target.value)} placeholder="When this fires and what it creates..." />
        </div>
      </div>

      {/* Match criteria */}
      <div className="bg-zinc-950 rounded-xl p-3 space-y-3 border border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Match criteria</p>
        <div>
          <label className={lbl}>Keywords (comma-separated, case-insensitive)</label>
          <input className={inp} value={kwText} onChange={e => setKwText(e.target.value)} placeholder="nrb, monetary policy, repo rate, interest rate" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Sector IDs (comma-separated)</label>
            <input className={inp} value={secText} onChange={e => setSecText(e.target.value)} placeholder="banking, government-finance" />
          </div>
          <div>
            <label className={lbl}>Topic IDs (comma-separated)</label>
            <input className={inp} value={topText} onChange={e => setTopText(e.target.value)} placeholder="nrb-policy, interest-rates" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Match mode</label>
            <select className={sel} value={form.matchMode} onChange={e => field("matchMode", e.target.value as KeywordMatchMode)}>
              <option value="any">ANY keyword matches</option>
              <option value="all">ALL keywords must match</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Min relevance score (0–1)</label>
            <input type="number" min="0" max="1" step="0.05" className={inp} value={form.minRelevanceScore} onChange={e => field("minRelevanceScore", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="bg-zinc-950 rounded-xl p-3 space-y-3 border border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Action</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Destination</label>
            <select className={sel} value={form.destination} onChange={e => field("destination", e.target.value as RouteDestination)}>
              {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <p className="text-[10px] text-zinc-700 mt-0.5">{DESTINATIONS.find(d => d.value === form.destination)?.desc}</p>
          </div>
          <div>
            <label className={lbl}>Action</label>
            <select className={sel} value={form.action} onChange={e => field("action", e.target.value as RouteAction)}>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Priority</label>
            <select className={sel} value={form.priority} onChange={e => field("priority", e.target.value as RoutePriority)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Auto-tags (comma-separated)</label>
            <input className={inp} value={tagText} onChange={e => setTagText(e.target.value)} placeholder="nrb, rates" />
          </div>
        </div>
        {form.destination === "content_queue" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Content type</label>
              <input className={inp} value={form.contentType ?? ""} onChange={e => field("contentType", e.target.value)} placeholder="explainer, shorts, carousel..." />
            </div>
            <div>
              <label className={lbl}>Platform</label>
              <input className={inp} value={form.platform ?? ""} onChange={e => field("platform", e.target.value)} placeholder="youtube, facebook, all..." />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={e => field("active", e.target.checked)} className="accent-green-500" />
        Active (route fires on new signals)
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-green-700 hover:bg-green-600 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : isNew ? "Create Route" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Signal test panel ────────────────────────────────────────────────────────

function TestPanel({ routes }: { routes: SignalRoute[] }) {
  const [title,   setTitle]   = useState("");
  const [summary, setSummary] = useState("");
  const [sector,  setSector]  = useState("");
  const [score,   setScore]   = useState("0.7");

  const testSignal = { title, summary, sectorId: sector || null, relevanceScore: parseFloat(score) || 0.7 };
  const matches = (title || summary) ? matchSignalRoutes(testSignal, routes) : [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Route Tester</p>
      <p className="text-[11px] text-zinc-600">Paste a signal title + summary to see which routes would fire.</p>
      <input
        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Signal title..."
      />
      <textarea
        rows={2}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="Signal summary..."
      />
      <div className="grid grid-cols-2 gap-2">
        <input className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none" value={sector} onChange={e => setSector(e.target.value)} placeholder="Sector ID (optional)" />
        <input type="number" min="0" max="1" step="0.05" className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" value={score} onChange={e => setScore(e.target.value)} placeholder="Relevance 0–1" />
      </div>
      {(title || summary) && (
        <div className="space-y-1.5 pt-1">
          {matches.length === 0 ? (
            <p className="text-xs text-zinc-600">No routes match this signal.</p>
          ) : (
            matches.map(m => (
              <div key={m.route.id} className="flex items-center justify-between gap-2 text-xs bg-zinc-950 rounded-lg px-3 py-1.5">
                <span className="text-zinc-300 font-semibold">{m.route.name}</span>
                <div className="flex items-center gap-2">
                  {m.matchedKeywords.length > 0 && (
                    <span className="text-zinc-600">kw: {m.matchedKeywords.slice(0,2).join(", ")}</span>
                  )}
                  <span className={`font-mono font-bold ${DEST_COLORS[m.route.destination]}`}>
                    {(m.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RoutingClient() {
  const [routes,  setRoutes]  = useState<SignalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SignalRoute> & { id?: string } | null>(null);
  const [busy,    setBusy]    = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [tab,     setTab]     = useState<"routes" | "test">("routes");

  useEffect(() => {
    const unsub = subscribeSignalRoutes(r => { setRoutes(r); setLoading(false); });
    return unsub;
  }, []);

  async function handleToggle(route: SignalRoute) {
    setBusy(route.id);
    try { await upsertSignalRoute(route.id, { active: !route.active }); }
    finally { setBusy(null); }
  }

  async function handleDelete(route: SignalRoute) {
    if (!confirm(`Delete route "${route.name}"?`)) return;
    setBusy(route.id);
    try { await deleteSignalRoute(route.id); }
    finally { setBusy(null); }
  }

  async function handleSeedDefaults() {
    if (!confirm(`Create ${DEFAULT_SIGNAL_ROUTES.length} default routes?`)) return;
    setSeeding(true);
    try {
      for (const r of DEFAULT_SIGNAL_ROUTES) {
        await createSignalRoute(r);
      }
    } finally {
      setSeeding(false);
    }
  }

  if (editing !== null) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <RouteEditor
          initial={editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  const activeCount  = routes.filter(r => r.active).length;
  const pausedCount  = routes.filter(r => !r.active).length;
  const totalFired   = routes.reduce((s, r) => s + (r.matchCount ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Signal Routing — के कहाँ जान्छ?</h1>
          <p className="text-sm text-zinc-500 mt-1">
            नयाँ signal (news/notice) आउँदा यो page ले decide गर्छ — <strong className="text-zinc-300">Content Queue</strong> मा जान्छ (video idea बन्छ),{" "}
            <strong className="text-zinc-300">Rate Suggestion</strong> बन्छ (EPF/NRB rate update), वा{" "}
            <strong className="text-zinc-300">Scheme Suggestion</strong> बन्छ।
            कुनै पनि कुरा automatically public हुँदैन — admin ले approve गरेपछि मात्र।
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-black text-sm font-bold rounded-xl transition-colors shrink-0"
        >
          + New Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "चालु Routes",    count: activeCount,  color: "text-green-400" },
          { label: "रोकिएका",       count: pausedCount,  color: "text-zinc-500"  },
          { label: "कति पटक Fire भयो", count: totalFired, color: "text-blue-400"  },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline diagram */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase mb-2">कसरी काम गर्छ?</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
          {["Website URL", "→", "AI पढ्छ", "→", "Signal बन्छ", "→", "Route Match", "→"].map((s, i) => (
            <span key={i} className={s === "→" ? "text-zinc-700" : "text-zinc-400"}>{s}</span>
          ))}
          <span className="text-blue-400">Content Queue</span>
          <span className="text-zinc-700">/</span>
          <span className="text-green-400">Rate Update</span>
          <span className="text-zinc-700">/</span>
          <span className="text-purple-400">Scheme Update</span>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1.5">सबै routed items draft मा जान्छन् — admin approve गरेपछि मात्र public हुन्छ।</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(["routes", "test"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-green-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "routes" ? `Routes (${routes.length})` : "Test Panel"}
          </button>
        ))}
      </div>

      {tab === "test" && <TestPanel routes={routes} />}

      {tab === "routes" && (
        <>
          {loading ? (
            <p className="text-sm text-zinc-600">Loading routes…</p>
          ) : routes.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-3xl">◈</p>
              <p className="text-zinc-400 font-semibold">No routes configured</p>
              <p className="text-zinc-600 text-sm">Create routes manually or load the default set.</p>
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {seeding ? "Creating…" : `Load ${DEFAULT_SIGNAL_ROUTES.length} Default Routes`}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600">{routes.length} route{routes.length !== 1 ? "s" : ""}</p>
                {routes.length < DEFAULT_SIGNAL_ROUTES.length && (
                  <button
                    onClick={handleSeedDefaults}
                    disabled={seeding}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    {seeding ? "Adding…" : "+ Load defaults"}
                  </button>
                )}
              </div>
              {routes.map(r => (
                <RouteCard
                  key={r.id}
                  route={r}
                  busy={busy === r.id}
                  onEdit={() => setEditing(r)}
                  onToggle={() => handleToggle(r)}
                  onDelete={() => handleDelete(r)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
