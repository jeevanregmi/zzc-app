"use client";

import { useState, useEffect } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import {
  subscribeStructuredSchemes,
  upsertStructuredScheme,
  deleteStructuredScheme,
  type StructuredScheme,
} from "../../../lib/vault/firestore";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORGS       = ["EPF", "CIT", "SSF", "NEPSE", "Beema", "Other"] as const;
const CATEGORIES = ["Investment", "Loan", "Insurance", "Pension"] as const;
const RISK_LEVELS= ["Low Risk", "Moderate Risk", "High Risk"] as const;
const LIQUIDITIES= ["Low", "Medium", "High"] as const;

const EMPTY_FORM: Omit<StructuredScheme, "id" | "createdAt" | "updatedAt" | "verified" | "verifiedBy" | "verifiedAt" | "published"> = {
  title:             "",
  titleNepali:       "",
  organization:      "EPF",
  category:          "Investment",
  subcategory:       "",
  summary:           "",
  nepaliSummary:     "",
  interestRate:      null,
  annualReturn:      null,
  riskLevel:         "Low Risk",
  liquidity:         "Low",
  benefits:          [],
  eligibility:       [],
  documents:         [],
  compareTags:       [],
  loanLimit:         null,
  retirementSupport: false,
  medicalCoverage:   false,
  hasInsurance:      false,
  calculatorEnabled: false,
  sourceUrl:         "",
};

// ─── Small helpers ─────────────────────────────────────────────────────────────

function parseLines(s: string): string[] {
  return s.split("\n").map(l => l.trim()).filter(Boolean);
}

function joinLines(arr: string[]): string {
  return arr.join("\n");
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ scheme }: { scheme: StructuredScheme }) {
  if (scheme.published && scheme.verified)
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800 font-semibold">◉ Live</span>;
  if (scheme.verified)
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-800 font-semibold">✓ Verified</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 font-semibold">Draft</span>;
}

// ─── Scheme list row ──────────────────────────────────────────────────────────

function SchemeRow({
  scheme,
  onEdit,
  onVerify,
  onPublish,
  onDelete,
  saving,
}: {
  scheme:    StructuredScheme;
  onEdit:    () => void;
  onVerify:  () => void;
  onPublish: () => void;
  onDelete:  () => void;
  saving:    boolean;
}) {
  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 space-y-2 ${
      scheme.published && scheme.verified ? "border-green-900" :
      scheme.verified                     ? "border-amber-900" :
      "border-zinc-800"
    }`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{scheme.title || <span className="text-zinc-600 italic">Untitled</span>}</p>
          <p className="text-xs text-zinc-500">{scheme.titleNepali}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{scheme.organization}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{scheme.category}</span>
          <StatusBadge scheme={scheme} />
        </div>
      </div>

      <p className="text-xs text-zinc-500 line-clamp-2">{scheme.summary || <span className="italic">No summary</span>}</p>

      <div className="flex gap-1.5 flex-wrap pt-1">
        <button
          onClick={onEdit}
          className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onVerify}
          disabled={saving}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
            scheme.verified
              ? "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              : "border-green-700 text-green-400 hover:bg-green-900/20"
          }`}
        >
          {scheme.verified ? "Unverify" : "Verify"}
        </button>
        <button
          onClick={onPublish}
          disabled={saving || !scheme.verified}
          title={!scheme.verified ? "Verify before publishing" : ""}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
            scheme.published
              ? "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              : "border-blue-700 text-blue-400 hover:bg-blue-900/20"
          }`}
        >
          {scheme.published ? "Unpublish" : "Publish"}
        </button>
        <button
          onClick={onDelete}
          disabled={saving}
          className="ml-auto px-3 py-1 text-xs font-semibold rounded-lg border border-red-900 text-red-500 hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Scheme editor form ────────────────────────────────────────────────────────

function SchemeEditor({
  initial,
  adminUid,
  onSaved,
  onCancel,
}: {
  initial:  Partial<StructuredScheme> & { id?: string };
  adminUid: string;
  onSaved:  () => void;
  onCancel: () => void;
}) {
  const isNew = !initial.id;

  const [form,    setForm]    = useState({ ...EMPTY_FORM, ...initial });
  const [schemeId, setSchemeId] = useState(initial.id ?? "");
  const [benefits,    setBenefits]    = useState(joinLines(initial.benefits    ?? []));
  const [eligibility, setEligibility] = useState(joinLines(initial.eligibility ?? []));
  const [documents,   setDocuments]   = useState(joinLines(initial.documents   ?? []));
  const [compareTags, setCompareTags] = useState(joinLines(initial.compareTags ?? []));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function field<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!schemeId.trim()) { setError("Scheme ID is required"); return; }
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const id = schemeId.trim().toLowerCase().replace(/\s+/g, "-");
      await upsertStructuredScheme(id, {
        ...form,
        benefits:    parseLines(benefits),
        eligibility: parseLines(eligibility),
        documents:   parseLines(documents),
        compareTags: parseLines(compareTags),
        createdAt:   initial.createdAt ?? new Date().toISOString(),
      });
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600";
  const sel = inp + " cursor-pointer";
  const label = "text-[10px] text-zinc-500 block mb-1";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">{isNew ? "New Scheme" : `Editing: ${initial.title}`}</h2>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white text-xs">✕ Cancel</button>
      </div>

      {/* Scheme ID */}
      <div>
        <label className={label}>Scheme ID (slug — used in URLs)</label>
        <input
          className={inp}
          value={schemeId}
          onChange={e => setSchemeId(e.target.value)}
          placeholder="e.g. epf-provident-fund"
          disabled={!isNew}
        />
        {!isNew && <p className="text-[10px] text-zinc-700 mt-0.5">ID is fixed after creation</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Title (English)</label>
          <input className={inp} value={form.title} onChange={e => field("title", e.target.value)} placeholder="EPF Provident Fund" />
        </div>
        <div>
          <label className={label}>Title (Nepali)</label>
          <input className={inp} value={form.titleNepali} onChange={e => field("titleNepali", e.target.value)} placeholder="कर्मचारी सञ्चय कोष" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={label}>Organization</label>
          <select className={sel} value={form.organization} onChange={e => field("organization", e.target.value)}>
            {ORGS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <select className={sel} value={form.category} onChange={e => field("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Risk Level</label>
          <select className={sel} value={form.riskLevel} onChange={e => field("riskLevel", e.target.value)}>
            {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Liquidity</label>
          <select className={sel} value={form.liquidity} onChange={e => field("liquidity", e.target.value)}>
            {LIQUIDITIES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Subcategory</label>
        <input className={inp} value={form.subcategory} onChange={e => field("subcategory", e.target.value)} placeholder="e.g. Retirement Savings" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Interest Rate (%)</label>
          <input type="number" step="0.01" className={inp} value={form.interestRate ?? ""} onChange={e => field("interestRate", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 8.5" />
        </div>
        <div>
          <label className={label}>Annual Return (%)</label>
          <input type="number" step="0.01" className={inp} value={form.annualReturn ?? ""} onChange={e => field("annualReturn", e.target.value ? parseFloat(e.target.value) : null)} placeholder="optional" />
        </div>
      </div>

      <div>
        <label className={label}>Summary (English)</label>
        <textarea rows={3} className={inp} value={form.summary} onChange={e => field("summary", e.target.value)} placeholder="Plain English description of this scheme..." />
      </div>
      <div>
        <label className={label}>Summary (Nepali)</label>
        <textarea rows={3} className={inp} value={form.nepaliSummary} onChange={e => field("nepaliSummary", e.target.value)} placeholder="नेपाली विवरण..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Benefits (one per line)</label>
          <textarea rows={4} className={inp} value={benefits} onChange={e => setBenefits(e.target.value)} placeholder={"Tax benefits\nRetirement income\nLife insurance"} />
        </div>
        <div>
          <label className={label}>Eligibility (one per line)</label>
          <textarea rows={4} className={inp} value={eligibility} onChange={e => setEligibility(e.target.value)} placeholder={"Formal sector employee\nAge 18-60"} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Required Documents (one per line)</label>
          <textarea rows={3} className={inp} value={documents} onChange={e => setDocuments(e.target.value)} placeholder={"Citizenship\nEmployment letter"} />
        </div>
        <div>
          <label className={label}>Compare Tags (one per line)</label>
          <textarea rows={3} className={inp} value={compareTags} onChange={e => setCompareTags(e.target.value)} placeholder={"retirement\ngovernment-backed"} />
        </div>
      </div>

      <div>
        <label className={label}>Source URL</label>
        <input type="url" className={inp} value={form.sourceUrl} onChange={e => field("sourceUrl", e.target.value)} placeholder="https://epf.gov.np/..." />
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        {([
          ["retirementSupport", "Retirement Support"],
          ["medicalCoverage",   "Medical Coverage"],
          ["hasInsurance",      "Has Insurance"],
          ["calculatorEnabled", "Calculator Enabled"],
        ] as [keyof typeof form, string][]).map(([key, lbl]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={!!form[key]}
              onChange={e => field(key, e.target.checked as never)}
              className="accent-green-500"
            />
            {lbl}
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-green-700 hover:bg-green-600 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : isNew ? "Create Scheme" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SchemesClient() {
  const { user } = useVaultAuth();
  const [schemes, setSchemes] = useState<StructuredScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<StructuredScheme> & { id?: string } | null>(null);
  const [saving,  setSaving]  = useState<string | null>(null); // id of scheme being toggled
  const [search,  setSearch]  = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");

  useEffect(() => {
    const unsub = subscribeStructuredSchemes(s => { setSchemes(s); setLoading(false); });
    return unsub;
  }, []);

  const filtered = schemes.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.organization.toLowerCase().includes(q) || s.titleNepali.includes(q);
    const matchCat    = catFilter === "All" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const publishedCount = schemes.filter(s => s.published && s.verified).length;
  const draftCount     = schemes.filter(s => !s.published).length;

  async function handleVerify(scheme: StructuredScheme) {
    setSaving(scheme.id);
    try {
      await upsertStructuredScheme(scheme.id, {
        verified:   !scheme.verified,
        verifiedBy: user?.uid ?? "",
        verifiedAt: new Date().toISOString(),
        ...(scheme.verified ? { published: false } : {}),
      });
    } finally { setSaving(null); }
  }

  async function handlePublish(scheme: StructuredScheme) {
    if (!scheme.verified) return;
    setSaving(scheme.id);
    try {
      await upsertStructuredScheme(scheme.id, { published: !scheme.published });
    } finally { setSaving(null); }
  }

  async function handleDelete(scheme: StructuredScheme) {
    if (!confirm(`Delete "${scheme.title}"? This cannot be undone.`)) return;
    setSaving(scheme.id);
    try {
      await deleteStructuredScheme(scheme.id);
    } finally { setSaving(null); }
  }

  if (editing !== null) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <SchemeEditor
          initial={editing}
          adminUid={user?.uid ?? ""}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Scheme Management</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Control which schemes appear on the public homepage. Only <strong className="text-white">verified + published</strong> schemes are shown.
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-black text-sm font-bold rounded-xl transition-colors shrink-0"
        >
          + New Scheme
        </button>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
        publishedCount > 0 ? "bg-green-950/30 border-green-800" : "bg-amber-950/30 border-amber-800"
      }`}>
        <span className={`text-lg ${publishedCount > 0 ? "text-green-400" : "text-amber-400"}`}>
          {publishedCount > 0 ? "◉" : "○"}
        </span>
        <div className="text-sm">
          {publishedCount > 0 ? (
            <span className="text-green-300">
              <strong>{publishedCount}</strong> scheme{publishedCount !== 1 ? "s" : ""} live on homepage.{" "}
              {draftCount > 0 && <span className="text-zinc-500">{draftCount} in draft.</span>}
            </span>
          ) : (
            <span className="text-amber-300">No schemes published. Homepage shows empty state.</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search schemes..."
          className="flex-1 min-w-48 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
        />
        <div className="flex gap-1.5 flex-wrap">
          {["All", ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                catFilter === cat ? "bg-green-600 text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-zinc-600">Loading Firestore schemes…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-3xl mb-3">◻</p>
          <p className="font-semibold text-zinc-400 mb-1">No schemes yet</p>
          <p className="text-sm">Click &quot;+ New Scheme&quot; to add your first scheme.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-600">{filtered.length} scheme{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map(s => (
            <SchemeRow
              key={s.id}
              scheme={s}
              saving={saving === s.id}
              onEdit={() => setEditing(s)}
              onVerify={() => handleVerify(s)}
              onPublish={() => handlePublish(s)}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
