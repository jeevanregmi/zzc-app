"use client";

import { useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { usePublicDataControl, RATE_DEFINITIONS } from "../../../hooks/vault/usePublicDataControl";
import { setMarketRate, type MarketRateDoc } from "../../../lib/vault/firestore";

// ─── Inline editor for a single market rate ───────────────────────────────────

function RateEditor({
  def,
  doc,
  adminUid,
}: {
  def:      typeof RATE_DEFINITIONS[number];
  doc:      MarketRateDoc | undefined;
  adminUid: string;
}) {
  const [value,     setValue]     = useState(String(doc?.value     ?? ""));
  const [source,    setSource]    = useState(doc?.source    ?? "");
  const [sourceUrl, setSourceUrl] = useState(doc?.sourceUrl ?? "");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  const isVerified  = doc?.verified  ?? false;
  const isPublished = doc?.published ?? false;

  async function save(patch: Partial<Omit<MarketRateDoc, "id">>) {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await setMarketRate(def.id, patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveValue() {
    const num = parseFloat(value);
    if (isNaN(num)) { setError("Enter a valid number"); return; }
    await save({ value: num, source, sourceUrl, label: def.label });
  }

  async function toggleVerified() {
    await save({
      verified:   !isVerified,
      verifiedBy: adminUid,
      verifiedAt: new Date().toISOString(),
    });
  }

  async function togglePublished() {
    await save({ published: !isPublished });
  }

  const hasDoc = doc !== undefined;

  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 space-y-3 ${
      isPublished && isVerified ? "border-green-800" :
      isVerified                ? "border-amber-800" :
      "border-zinc-800"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-white">{def.label}</p>
          <p className="text-[10px] text-zinc-600 font-mono">{def.id}</p>
        </div>
        <div className="flex gap-1.5">
          {hasDoc && (
            <>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                isVerified
                  ? "bg-green-900/50 text-green-400 border-green-800"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}>
                {isVerified ? "✓ Verified" : "Unverified"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                isPublished
                  ? "bg-blue-900/50 text-blue-400 border-blue-800"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}>
                {isPublished ? "◉ Published" : "Hidden"}
              </span>
            </>
          )}
          {!hasDoc && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-900">
              Not in Firestore
            </span>
          )}
        </div>
      </div>

      {/* Current Firestore value */}
      {hasDoc && (
        <div className="text-[11px] text-zinc-500 bg-zinc-950 rounded px-3 py-1.5 font-mono">
          Current: <span className="text-white font-bold">{doc.value} {def.unit}</span>
          {doc.updatedAt && doc.updatedAt !== "—" && (
            <span className="ml-2 text-zinc-700">· {doc.updatedAt.slice(0, 10)}</span>
          )}
        </div>
      )}

      {/* Edit controls */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 block mb-1">Value ({def.unit})</label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={def.hint}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-green-600"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Source description</label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. NRB Monetary Policy 2081/82"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://nrb.org.np/..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-1">
        <button
          onClick={handleSaveValue}
          disabled={saving}
          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Value"}
        </button>
        {hasDoc && (
          <>
            <button
              onClick={toggleVerified}
              disabled={saving}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 border ${
                isVerified
                  ? "border-amber-700 text-amber-400 hover:bg-amber-900/20"
                  : "border-green-700 text-green-400 hover:bg-green-900/20"
              }`}
            >
              {isVerified ? "Unverify" : "Mark Verified"}
            </button>
            <button
              onClick={togglePublished}
              disabled={saving || !isVerified}
              title={!isVerified ? "Verify first before publishing" : ""}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 border ${
                isPublished
                  ? "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                  : "border-blue-700 text-blue-400 hover:bg-blue-900/20"
              }`}
            >
              {isPublished ? "Unpublish" : "Publish"}
            </button>
          </>
        )}
      </div>

      {!hasDoc && (
        <p className="text-[10px] text-zinc-600">
          Save a value above to create this document in Firestore.
        </p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicDataClient() {
  const { user } = useVaultAuth();
  const { rates, loading } = usePublicDataControl();

  const publishedCount = rates.filter(r => r.published && r.verified).length;
  const totalDefs      = RATE_DEFINITIONS.length;

  const rateMap = new Map(rates.map(r => [r.id, r]));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Public Data Control</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage what financial data appears publicly on the homepage ticker.
          Only <strong className="text-white">verified + published</strong> rates are shown to users.
        </p>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
        publishedCount > 0
          ? "bg-green-950/30 border-green-800"
          : "bg-amber-950/30 border-amber-800"
      }`}>
        <span className={`text-lg ${publishedCount > 0 ? "text-green-400" : "text-amber-400"}`}>
          {publishedCount > 0 ? "◉" : "○"}
        </span>
        <div className="text-sm">
          {publishedCount > 0 ? (
            <span className="text-green-300">
              <strong>{publishedCount}/{totalDefs}</strong> rates are live on the public homepage ticker.
            </span>
          ) : (
            <span className="text-amber-300">
              No rates published yet. Homepage ticker shows "Admin update required."
              Verify and publish rates below to make them public.
            </span>
          )}
        </div>
      </div>

      {/* Workflow reminder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-400 mb-1">Admin workflow — market rates</p>
        <p>1. Find the official rate (NRB, EPF, SSF websites)</p>
        <p>2. Enter value + source description + source URL</p>
        <p>3. Click <span className="text-green-400">Save Value</span> — writes to Firestore but stays hidden</p>
        <p>4. Click <span className="text-green-400">Mark Verified</span> — confirms you have checked the source</p>
        <p>5. Click <span className="text-blue-400">Publish</span> — makes it visible on the public homepage ticker</p>
        <p className="text-amber-400">⚠ Quick Ingest signals do NOT change these values. Only admin edits here update public data.</p>
      </div>

      {/* Rate editors */}
      {loading ? (
        <div className="text-sm text-zinc-600">Loading Firestore data…</div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Market Rates</h2>
          <div className="grid grid-cols-1 gap-4">
            {RATE_DEFINITIONS.map(def => (
              <RateEditor
                key={def.id}
                def={def}
                doc={rateMap.get(def.id)}
                adminUid={user?.uid ?? ""}
              />
            ))}
          </div>
        </section>
      )}

      {/* Schemes section — future */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Scheme Data</h2>
        <p className="text-sm text-zinc-600">
          Public schemes currently read from Firestore <code className="text-zinc-500">structuredSchemes</code> collection.
          Admin-controlled scheme publishing UI is planned for a future release.
        </p>
        <p className="text-xs text-zinc-700 mt-2">
          To update schemes today: write directly to the <code>structuredSchemes</code> Firestore collection
          using the Firebase Console.
        </p>
      </section>

    </div>
  );
}
