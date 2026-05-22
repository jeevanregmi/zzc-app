"use client";

/**
 * Founder Economics OS — simplified for non-technical founder.
 * 5 tabs: डासबोर्ड | आय | खर्च | AI लागत | Approval
 *
 * Design rules:
 *   - NPR first, USD in parentheses
 *   - No jargon: "tokens" → "words", "provider" → "AI service"
 *   - Green/yellow/red everywhere
 *   - Complex tables behind "Advanced" toggle
 *   - Empty states show example data
 */

import { useState, useMemo } from "react";
import { useVaultAuth }       from "../../../hooks/vault/useVaultAuth";
import { useRevenue }         from "../../../hooks/business/useRevenue";
import { useExpenses }        from "../../../hooks/business/useExpenses";
import { useAICosts }         from "../../../hooks/business/useAICosts";
import { useVaultAIUsage }    from "../../../hooks/vault/useVaultAIUsage";
import { useApprovalQueue }   from "../../../hooks/vault/useApprovalQueue";
import { useForexRate }       from "../../../hooks/vault/useForexRate";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ApprovalItemType } from "../../../lib/types/economics";
import type { EconomicsSummary } from "../../../lib/types/economics";

// ─── Formatter factory (rate comes from NRB API at runtime) ──────────────────

const FALLBACK_RATE = 155; // approximate mid-rate 2026-05-20: buy 154.16, sell 154.76

function mkFmt(rate: number) {
  return {
    toNPR:     (usd: number) => `NPR ${Math.round(usd * rate).toLocaleString("en-NP")}`,
    both:      (usd: number) => `NPR ${Math.round(usd * rate).toLocaleString("en-NP")} ($${usd.toFixed(2)})`,
    bothMicro: (usd: number) => `NPR ${(usd * rate).toFixed(4)} ($${usd.toFixed(5)})`,
  };
}

// ─── Primitives ───────────────────────────────────────────────────────────────

type Health = "green" | "yellow" | "red" | "neutral";

/** Coloured status pill with dot */
function Pill({ level, label }: { level: Health; label: string }) {
  const cls =
    level === "green"   ? "bg-green-950 text-green-400 border-green-800" :
    level === "yellow"  ? "bg-amber-950 text-amber-400 border-amber-800" :
    level === "red"     ? "bg-red-950   text-red-400   border-red-800"   :
                          "bg-zinc-800  text-zinc-400  border-zinc-700";
  const dot =
    level === "green"  ? "bg-green-400" :
    level === "yellow" ? "bg-amber-400" :
    level === "red"    ? "bg-red-400"   : "bg-zinc-500";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/** Tooltip via HTML title — simple, no library */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span title={text} className="border-b border-dotted border-zinc-600 cursor-help">
      {children}
    </span>
  );
}

/** Collapsible advanced section */
function Advanced({ label = "थप विवरण हेर्नुहोस्", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
      >
        <span>{open ? "▲" : "▼"}</span>
        <span>{open ? "लुकाउनुहोस्" : label}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Empty state — grayed example overlay */
function EmptyState({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-4">
        <span className="bg-zinc-800/95 border border-zinc-700 text-zinc-300 text-sm font-semibold px-4 py-2 rounded-xl text-center backdrop-blur-sm">
          {message}
        </span>
      </div>
      <div className="opacity-15 pointer-events-none select-none">{children}</div>
    </div>
  );
}

/** Simple metric card */
function Card({
  label, nepali, value, sub, level, tip,
}: {
  label: string; nepali?: string; value: string;
  sub?: string; level?: Health; tip?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        {level && <Pill level={level} label="" />}
        {tip ? (
          <Tip text={tip}><p className="text-xs text-zinc-500 font-medium">{label}</p></Tip>
        ) : (
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
        )}
      </div>
      {nepali && <p className="text-xs text-zinc-600">{nepali}</p>}
      <p className="text-xl font-black text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

/** "What should I do?" contextual recommendations */
function WhatToDo({ items }: { items: { level: Health; text: string }[] }) {
  const all = items.length > 0 ? items : [{ level: "green" as Health, text: "सबै ठीक छ! Revenue बढाउन focus गर्नुहोस्।" }];
  return (
    <div className="bg-cyan-950/30 border border-cyan-900/60 rounded-2xl p-4 space-y-3">
      <p className="text-cyan-300 font-bold text-sm">के गर्नुपर्छ? (What should I do?)</p>
      <div className="space-y-2.5">
        {all.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${
              item.level === "green"  ? "bg-green-400" :
              item.level === "yellow" ? "bg-amber-400" :
              item.level === "red"    ? "bg-red-400"   : "bg-zinc-500"
            }`} />
            <p className="text-zinc-200 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue sources ──────────────────────────────────────────────────────────

const REV_SOURCES = [
  "subscription", "sponsorship", "civic-partnership", "research-sale",
  "api-access", "affiliate", "youtube", "consultation",
  "enterprise", "content-licensing", "playstore", "other",
] as const;

const REV_NEPALI: Record<string, string> = {
  "subscription":     "Subscription (मासिक शुल्क)",
  "sponsorship":      "Sponsorship",
  "civic-partnership":"Civic Partnership",
  "research-sale":    "Research Report बिक्री",
  "api-access":       "API Access",
  "affiliate":        "Affiliate Commission",
  "youtube":          "YouTube Revenue",
  "consultation":     "Consultation",
  "enterprise":       "Enterprise Deal",
  "content-licensing":"Content Licensing",
  "playstore":        "Play Store",
  "other":            "अन्य",
};

// ─── Approval types ───────────────────────────────────────────────────────────

const AQ_LABELS: Record<ApprovalItemType, string> = {
  "expense":            "खर्च",
  "revenue":            "आय",
  "payout":             "भुक्तानी",
  "sponsorship":        "Sponsorship",
  "revenue-adjustment": "आय सुधार",
};

const AQ_COLORS: Record<ApprovalItemType, string> = {
  "expense":            "text-orange-400 bg-orange-950 border border-orange-900",
  "revenue":            "text-green-400 bg-green-950 border border-green-900",
  "payout":             "text-red-400 bg-red-950 border border-red-900",
  "sponsorship":        "text-cyan-400 bg-cyan-950 border border-cyan-900",
  "revenue-adjustment": "text-yellow-400 bg-yellow-950 border border-yellow-900",
};

// ─── Bootstrap panel ──────────────────────────────────────────────────────────

const BOOTSTRAP = [
  { service: "Anthropic Claude",  amountUSD: 100, description: "Claude API credit — ZZC development (May 2026)", date: "2026-05-20" },
  { service: "OpenAI ChatGPT",    amountUSD:  20, description: "ChatGPT subscription — ZZC development (May 2026)", date: "2026-05-20" },
  { service: "Emergent",          amountUSD:   1, description: "Emergent service — ZZC development (May 2026)", date: "2026-05-20" },
] as const;

function BootstrapPanel({ onSave, rate }: { onSave: (e: typeof BOOTSTRAP) => Promise<void>; rate: number }) {
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  if (done) return null;
  return (
    <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-amber-400 font-semibold text-sm">पुरानो AI खर्च record गर्नुहोस्</p>
        <p className="text-amber-700 text-xs mt-0.5">May 2026 मा गरिएको payments — एक क्लिकमा save गर्नुहोस्</p>
      </div>
      <div className="space-y-1.5">
        {BOOTSTRAP.map(c => (
          <div key={c.service} className="flex items-center justify-between bg-zinc-900/60 rounded-lg px-3 py-2">
            <p className="text-sm text-white">{c.service}</p>
            <p className="text-sm font-mono text-orange-400">NPR {Math.round(c.amountUSD * rate).toLocaleString()} (${c.amountUSD})</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={async () => { setSaving(true); await onSave(BOOTSTRAP); setSaving(false); setDone(true); }}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? "Save गर्दैछु…" : `Save NPR ${Math.round(121 * rate).toLocaleString("en-NP")} ($121) →`}
        </button>
        <button onClick={() => setDone(true)} className="text-zinc-600 hover:text-zinc-400 text-xs">छोड्नुहोस्</button>
      </div>
    </div>
  );
}

// ─── Revenue form ─────────────────────────────────────────────────────────────

function RevenueForm({ onAdd, rate }: { onAdd: ReturnType<typeof useRevenue>["add"]; rate: number }) {
  const [source, setSource] = useState("subscription");
  const [amount, setAmount] = useState("");
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [desc,   setDesc]   = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!amount) return;
    setSaving(true);
    await onAdd({
      source:       source as ReturnType<typeof useRevenue>["entries"][0]["source"],
      platform:     source,
      amountNPR:    parseFloat(amount),
      amountUSD:    parseFloat(amount) / rate,
      usdToNprRate: rate,
      date, description: desc, verified: false, receiptPath: "",
    });
    setAmount(""); setDesc(""); setSaving(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-zinc-200">नया आय थप्नुहोस्</p>
        <p className="text-xs text-zinc-600 mt-0.5">आयको स्रोत र NPR मा रकम राख्नुहोस्</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={source} onChange={e => setSource(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        >
          {REV_SOURCES.map(s => <option key={s} value={s}>{REV_NEPALI[s] ?? s}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input type="number" placeholder="रकम (NPR मा)" value={amount} onChange={e => setAmount(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input type="text" placeholder="विवरण (optional)" value={desc} onChange={e => setDesc(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
      </div>
      {amount && <p className="text-xs text-zinc-600">≈ ${(parseFloat(amount) / rate).toFixed(2)} USD</p>}
      <button onClick={submit} disabled={saving || !amount}
        className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {saving ? "Save…" : "आय record गर्नुहोस् →"}
      </button>
    </div>
  );
}

// ─── Expense form ─────────────────────────────────────────────────────────────

const EXP_CATS: Record<string, string> = {
  "ai-api":             "AI Tool (Claude, Gemini…)",
  "cloud-hosting":      "Cloud Hosting (Cloudflare…)",
  "storage":            "Storage (R2, Firebase…)",
  "dev-tools":          "Development Tools",
  "marketing":          "Marketing",
  "content-production": "Content Production",
  "operations":         "Operation",
};

function ExpenseForm({ onAdd, rate }: { onAdd: ReturnType<typeof useExpenses>["add"]; rate: number }) {
  const [service,  setService]  = useState("");
  const [category, setCategory] = useState("cloud-hosting");
  const [capex,    setCapex]    = useState("OPEX");
  const [usd,      setUsd]      = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [desc,     setDesc]     = useState("");
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!service || !usd) return;
    setSaving(true);
    const u = parseFloat(usd);
    await onAdd({
      service, category: category as ReturnType<typeof useExpenses>["entries"][0]["category"],
      classification: capex as "CAPEX" | "OPEX",
      amountUSD: u, amountNPR: Math.round(u * rate),
      usdToNprRate: rate, date, description: desc,
      invoicePath: "", recurring: false, billingCycle: "monthly",
    });
    setService(""); setUsd(""); setDesc(""); setSaving(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-zinc-200">नया खर्च थप्नुहोस्</p>
        <p className="text-xs text-zinc-600 mt-0.5">कुन service मा कति USD खर्च भयो? (AI खर्च छुट्टै auto-track हुन्छ)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="Service (Cloudflare, Firebase…)" value={service} onChange={e => setService(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        >
          {Object.entries(EXP_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={capex} onChange={e => setCapex(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="OPEX">मासिक खर्च (OPEX)</option>
          <option value="CAPEX">एकमुस्त लगानी (CAPEX)</option>
        </select>
        <input type="number" placeholder="रकम (USD मा)" value={usd} onChange={e => setUsd(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        />
        <input type="text" placeholder="विवरण (optional)" value={desc} onChange={e => setDesc(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
        />
      </div>
      {usd && <p className="text-xs text-zinc-600">= NPR {Math.round(parseFloat(usd) * rate).toLocaleString()}</p>}
      <button onClick={submit} disabled={saving || !service || !usd}
        className="bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {saving ? "Save…" : "खर्च record गर्नुहोस् →"}
      </button>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

type Tab = "dashboard" | "income" | "expenses" | "ai" | "approval";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "डासबोर्ड" },
  { id: "income",    label: "आय"       },
  { id: "expenses",  label: "खर्च"     },
  { id: "ai",        label: "AI लागत"  },
  { id: "approval",  label: "Approval" },
];

function BIDashboard() {
  const { user } = useVaultAuth();
  const uid      = user?.uid ?? null;

  const rev      = useRevenue(uid);
  const exp      = useExpenses(uid);
  const ai       = useAICosts(uid);
  const aiUsage  = useVaultAIUsage();
  const approval = useApprovalQueue(uid);
  const forex    = useForexRate();

  const [tab,           setTab]           = useState<Tab>("dashboard");
  const [showBootstrap, setShowBootstrap] = useState(true);
  const [brief,         setBrief]         = useState<EconomicsSummary | null>(null);
  const [briefLoading,  setBriefLoading]  = useState(false);
  const [briefError,    setBriefError]    = useState<string | null>(null);
  const [aqType,        setAqType]        = useState<ApprovalItemType>("sponsorship");
  const [aqTitle,       setAqTitle]       = useState("");
  const [aqDesc,        setAqDesc]        = useState("");
  const [aqAmtUSD,      setAqAmtUSD]      = useState("");
  const [aqSaving,      setAqSaving]      = useState(false);

  // ── Live exchange rate (NRB official) ────────────────────────────────────────

  const rate = forex.loading ? FALLBACK_RATE : forex.rateNPR;
  const { toNPR, both, bothMicro } = useMemo(() => mkFmt(rate), [rate]);

  // ── Core numbers ─────────────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const thisMonthRevNPR = rev.thisMonthNPR;

  const thisMonthExpUSD = useMemo(
    () => exp.entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.amountUSD, 0),
    [exp.entries, currentPeriod],
  );
  const thisMonthAIManualUSD = useMemo(
    () => ai.entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.costUSD, 0),
    [ai.entries, currentPeriod],
  );

  const totalAIUSD      = aiUsage.thisMonthUSD + thisMonthAIManualUSD;
  const totalMonthlyUSD = thisMonthExpUSD + totalAIUSD;
  const totalMonthlyNPR = Math.round(totalMonthlyUSD * rate);

  const netNPR       = thisMonthRevNPR - Math.round(thisMonthExpUSD * rate) - Math.round(totalAIUSD * rate);
  const totalRevUSD  = useMemo(() => rev.entries.reduce((s, e) => s + e.amountUSD, 0),  [rev.entries]);
  const totalExpUSD  = useMemo(() => exp.entries.reduce((s, e) => s + e.amountUSD, 0) + ai.totalUSD + aiUsage.totalCostUSD, [exp.entries, ai.totalUSD, aiUsage.totalCostUSD]);

  // ── Health ───────────────────────────────────────────────────────────────────

  const health = useMemo<{ level: Health; label: string; desc: string }>(() => {
    if (totalRevUSD > 0 && totalRevUSD > totalMonthlyUSD)
      return { level: "green",  label: "राम्रो",       desc: "आय खर्चभन्दा बढी छ — profitable!" };
    if (totalRevUSD > 0)
      return { level: "yellow", label: "सावधान",       desc: "आय छ तर खर्च धेरै छ" };
    if (totalMonthlyUSD < 2)
      return { level: "neutral",label: "निर्माण चरण", desc: "Revenue सुरु भएको छैन — खर्च पनि कम छ, राम्रो" };
    if (totalMonthlyUSD < 10)
      return { level: "yellow", label: "निर्माण चरण", desc: "Revenue सुरु गर्नुपर्छ — खर्च बढ्दैछ" };
    return { level: "red",    label: "ध्यान दिनुहोस्", desc: "Revenue छैन, खर्च बढ्दैछ — तत्काल कदम चाल्नुहोस्" };
  }, [totalRevUSD, totalMonthlyUSD]);

  // ── Recommendations ───────────────────────────────────────────────────────────

  const recs = useMemo<{ level: Health; text: string }[]>(() => {
    const list: { level: Health; text: string }[] = [];
    if (approval.pending.length > 0)
      list.push({ level: "yellow", text: `${approval.pending.length} वटा items approval queue मा छन् — Approval tab मा हेर्नुहोस्।` });
    if (totalRevUSD === 0)
      list.push({ level: "yellow", text: "Revenue stream सुरु गर्नुहोस्: subscription, sponsorship, civic partnership — आय tab मा record गर्नुहोस्।" });
    if (totalAIUSD > 10)
      list.push({ level: "red", text: `यो महिना AI लागत NPR ${Math.round(totalAIUSD * rate).toLocaleString()} ($${totalAIUSD.toFixed(2)}) छ — AI लागत tab मा details हेर्नुहोस्।` });
    if (aiUsage.providerEconomics.some(p => p.successRate < 0.7))
      list.push({ level: "red", text: "कुनै AI service मा problem छ — AI लागत tab मा provider health हेर्नुहोस्।" });
    if (totalRevUSD === 0 && totalMonthlyUSD < 2)
      list.push({ level: "green", text: "खर्च धेरै कम छ — राम्रो! QA sprint पूरा गरेपछि revenue collection सुरु गर्नुहोस्।" });
    return list;
  }, [approval.pending.length, totalRevUSD, totalAIUSD, aiUsage.providerEconomics, totalMonthlyUSD]);

  // ── Founder Brief ─────────────────────────────────────────────────────────────

  async function generateBrief() {
    setBriefLoading(true);
    setBriefError(null);
    const snapshot = [
      `ZZC Financial Snapshot — ${new Date().toISOString().slice(0, 10)}`,
      `Monthly burn: $${totalMonthlyUSD.toFixed(4)} (AI: $${totalAIUSD.toFixed(4)}, Infra: $${thisMonthExpUSD.toFixed(2)})`,
      `Total invested to date: $${totalExpUSD.toFixed(2)}`,
      `Total revenue to date: $${totalRevUSD.toFixed(2)}`,
      `Total AI analyses run: ${aiUsage.totalAnalyses}`,
      `Average cost per analysis: $${aiUsage.avgCostPerAnalysis.toFixed(6)}`,
      `Projected monthly AI cost: $${aiUsage.projectedMonthlyUSD.toFixed(4)}`,
      "",
      "Provider breakdown:",
      ...aiUsage.providerEconomics.map(p =>
        `  ${p.provider}: $${p.totalCostUSD.toFixed(4)} total, ${p.callCount} calls, $${p.avgCostUSD.toFixed(6)}/call, ${(p.successRate * 100).toFixed(0)}% success`
      ),
      "",
      `Revenue streams: ${totalRevUSD === 0 ? "None — pre-revenue stage" : `$${totalRevUSD.toFixed(2)} total`}`,
    ].join("\n");

    try {
      const res  = await fetch("/api/economics-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ snapshot }),
      });
      const data = await res.json() as EconomicsSummary & { error?: string };
      if (!res.ok || data.error) { setBriefError(data.error ?? "Retry गर्नुहोस्।"); return; }
      setBrief(data);
    } catch (err) {
      setBriefError(`Network error: ${String(err)}`);
    } finally {
      setBriefLoading(false);
    }
  }

  // ── Approval submit ───────────────────────────────────────────────────────────

  async function submitApproval() {
    if (!aqTitle || !aqAmtUSD) return;
    setAqSaving(true);
    const usd = parseFloat(aqAmtUSD);
    await approval.propose({ type: aqType, title: aqTitle, description: aqDesc, amountUSD: usd, amountNPR: Math.round(usd * rate) });
    setAqTitle(""); setAqDesc(""); setAqAmtUSD(""); setAqSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white">व्यापार डासबोर्ड</h1>
          <Pill level={health.level} label={health.label} />
          {/* NRB live rate badge */}
          <span
            title={forex.loading ? "NRB बाट rate load हुँदैछ…" : `NRB ${forex.source === "localStorage" ? "(cached)" : ""} · Buy: ${forex.buy?.toFixed(2)} · Sell: ${forex.sell?.toFixed(2)} · मिति: ${forex.date}`}
            className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5 cursor-help"
          >
            {forex.loading ? "दर लोड…" : `NRB: 1 USD = NPR ${rate.toFixed(2)}`}
          </span>
        </div>
        <p className="text-zinc-500 text-sm mt-1">{health.desc}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap " +
              (tab === t.id ? "bg-zinc-700 text-white font-semibold" : "text-zinc-500 hover:text-white")
            }
          >
            {t.label}
            {t.id === "approval" && approval.pending.length > 0 && (
              <span className="ml-1.5 text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-bold">
                {approval.pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ───────────────────────── DASHBOARD ───────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          {/* Monthly summary */}
          <div>
            <Tip text="यो calendar month को शुरुदेखि अहिलेसम्मको तथ्याङ्क">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3 cursor-help">
                यो महिनाको सारांश
              </p>
            </Tip>
            <div className="grid grid-cols-3 gap-3">
              <Card
                label="कुल आय"
                nepali="भित्र आएको पैसा"
                value={thisMonthRevNPR > 0 ? `NPR ${thisMonthRevNPR.toLocaleString()}` : "NPR 0"}
                sub={thisMonthRevNPR > 0 ? `$${(thisMonthRevNPR / rate).toFixed(2)}` : "अझै आएको छैन"}
                level={thisMonthRevNPR > 0 ? "green" : "neutral"}
                tip="ZZC बाट यो महिना आएको कुल पैसा"
              />
              <Card
                label="कुल खर्च"
                nepali="बाहिर गएको पैसा"
                value={`NPR ${totalMonthlyNPR.toLocaleString()}`}
                sub={`$${totalMonthlyUSD.toFixed(2)}`}
                level={totalMonthlyUSD < 5 ? "green" : totalMonthlyUSD < 20 ? "yellow" : "red"}
                tip="AI खर्च + hosting + अन्य सबै infrastructure यो महिना"
              />
              <Card
                label={netNPR >= 0 ? "नाफा" : "घाटा"}
                nepali={netNPR >= 0 ? "आय > खर्च" : "खर्च > आय"}
                value={`NPR ${Math.abs(netNPR).toLocaleString()}`}
                sub={netNPR < 0 ? "Founder funded" : "Profitable"}
                level={netNPR >= 0 ? "green" : netNPR > -13500 ? "yellow" : "red"}
                tip="आय minus खर्च — सकारात्मक भए नाफा, नकारात्मक भए घाटा"
              />
            </div>
          </div>

          {/* AI cost summary */}
          <div>
            <Tip text="Document analyze गर्दा लाग्ने AI cost — automatically track हुन्छ">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3 cursor-help">AI लागत सारांश</p>
            </Tip>
            <div className="grid grid-cols-2 gap-3">
              <Card
                label="यो महिना AI खर्च"
                nepali="Document analysis को लागत"
                value={totalAIUSD > 0 ? toNPR(totalAIUSD) : "NPR 0"}
                sub={totalAIUSD > 0 ? `$${totalAIUSD.toFixed(4)} · ${aiUsage.totalAnalyses} analyses` : "अझै कुनै analysis छैन"}
                level={totalAIUSD < 1 ? "green" : totalAIUSD < 10 ? "yellow" : "red"}
                tip="Gemini, AWS, Anthropic — सबैको मिलाएको AI cost"
              />
              <Card
                label="प्रति document"
                nepali="एउटा document analyze गर्न"
                value={aiUsage.avgCostPerAnalysis > 0 ? bothMicro(aiUsage.avgCostPerAnalysis) : "Data आउँदैछ"}
                sub={aiUsage.projectedMonthlyUSD > 0 ? `अनुमानित मासिक: ${toNPR(aiUsage.projectedMonthlyUSD)}` : undefined}
                level={aiUsage.avgCostPerAnalysis === 0 ? "neutral" : aiUsage.avgCostPerAnalysis < 0.01 ? "green" : "yellow"}
                tip="औसतमा एउटा document वा URL analyze गर्न यति पैसा लाग्छ"
              />
            </div>
          </div>

          {/* What to do */}
          <WhatToDo items={recs} />

          {/* Founder Brief */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white font-bold text-sm">Founder Brief</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  AI ले तपाईंको financial data हेरेर simple Nepali मा सल्लाह दिन्छ
                </p>
              </div>
              <button
                onClick={generateBrief}
                disabled={briefLoading}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
              >
                {briefLoading ? "Analyzing…" : brief ? "फेरि generate गर्नुहोस्" : "Founder Brief बनाउनुहोस् →"}
              </button>
            </div>

            {briefError && (
              <div className="bg-red-950/40 border border-red-800 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{briefError}</p>
              </div>
            )}

            {!brief && !briefError && (
              <p className="text-zinc-600 text-xs">
                Button थिच्नुहोस् — AI ले तपाईंको खर्च, AI cost, र revenue हेरेर actionable advice दिन्छ।
              </p>
            )}

            {brief && (
              <div className="space-y-3 pt-1">
                {([
                  { key: "leaks",       label: "पैसा कहाँ जाँदैछ?",   color: "text-red-400",   bg: "bg-red-950/30 border-red-900/40"    },
                  { key: "efficiency",  label: "सस्तो option के हो?", color: "text-green-400", bg: "bg-green-950/30 border-green-900/40" },
                  { key: "projections", label: "भविष्यमा कति लाग्छ?", color: "text-blue-400",  bg: "bg-blue-950/30 border-blue-900/40"   },
                  { key: "advice",      label: "अहिले के गर्ने?",     color: "text-cyan-400",  bg: "bg-cyan-950/30 border-cyan-900/40"   },
                ] as const).map(s => {
                  const items = brief[s.key] as string[];
                  if (!items?.length) return null;
                  return (
                    <div key={s.key} className={`rounded-xl p-3 border ${s.bg}`}>
                      <p className={`text-xs font-bold ${s.color} mb-2`}>{s.label}</p>
                      <div className="space-y-1.5">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`${s.color} shrink-0 text-xs mt-0.5`}>→</span>
                            <p className="text-zinc-300 text-sm">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-zinc-700 text-xs text-right">
                  {brief.provider ?? "AI"} · {new Date(brief.generatedAt).toLocaleString("en-NP")}
                </p>
              </div>
            )}
          </div>

          {/* All-time totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <Tip text="ZZC सुरु गरेदेखि अहिलेसम्म कति लगानी भयो — expenses + AI cost सबै मिलाएर">
                <p className="text-xs text-zinc-500 mb-1 cursor-help">कुल लगानी (सबै समय)</p>
              </Tip>
              <p className="text-xl font-black font-mono text-orange-400">{toNPR(totalExpUSD)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">${totalExpUSD.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <Tip text="यो pace मा चलेमा एक वर्षमा कति खर्च हुन्छ भन्ने अनुमान">
                <p className="text-xs text-zinc-500 mb-1 cursor-help">वार्षिक खर्च दर (अनुमान)</p>
              </Tip>
              <p className="text-xl font-black font-mono text-amber-400">{toNPR(totalMonthlyUSD * 12)}</p>
              <p className="text-xs text-zinc-600 mt-0.5">${(totalMonthlyUSD * 12).toFixed(2)}/year</p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────── INCOME ──────────────────────────────────── */}
      {tab === "income" && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm">आय भनेको के हो?</p>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              ZZC बाट आउने पैसा — subscription, sponsorship, civic partnership, research reports, वा API access।
              NPR मा amount राख्नुहोस्, USD automatically calculate हुन्छ।
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Subscription", "Sponsorship", "Civic Partnership", "Research Sale"].map(t => (
                <span key={t} className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          <RevenueForm onAdd={rev.add} rate={rate} />

          {rev.entries.length === 0 ? (
            <EmptyState message="अझै कुनै आय record गरिएको छैन — माथिको form बाट थप्नुहोस्">
              <div className="space-y-2 mt-2">
                {[
                  { source: "Subscription", date: "2026-05-01", npr: "NPR 2,500", usd: "$18.52" },
                  { source: "Sponsorship",  date: "2026-05-15", npr: "NPR 15,000", usd: "$111.11" },
                  { source: "Research Sale",date: "2026-05-20", npr: "NPR 5,000",  usd: "$37.04" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{e.source}</p>
                      <p className="text-xs text-zinc-500">{e.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-green-400">{e.npr}</p>
                      <p className="text-xs text-zinc-600">{e.usd}</p>
                    </div>
                  </div>
                ))}
              </div>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-xs text-zinc-500">{rev.entries.length} वटा entries</p>
                <p className="text-xs text-green-400 font-semibold">
                  कुल: NPR {rev.entries.reduce((s, e) => s + e.amountNPR, 0).toLocaleString()} (${totalRevUSD.toFixed(2)})
                </p>
              </div>
              {rev.entries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{e.description || (REV_NEPALI[e.source] ?? e.source)}</p>
                    <p className="text-xs text-zinc-500">{e.date} · {REV_NEPALI[e.source] ?? e.source}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono text-green-400">NPR {e.amountNPR.toLocaleString()}</p>
                      <p className="text-xs text-zinc-600">${e.amountUSD.toFixed(2)}</p>
                    </div>
                    <button onClick={() => rev.remove(e.id)} className="text-zinc-700 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────── EXPENSES ────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm">खर्च भनेको के हो?</p>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              ZZC चलाउन लाग्ने infrastructure cost — Cloudflare hosting, Firebase, domain, marketing, etc।
              AI खर्च छुट्टै "AI लागत" tab मा automatically track हुन्छ।
            </p>
          </div>

          {showBootstrap && (
            <BootstrapPanel
              onSave={async (entries) => {
                await Promise.all(entries.map(c => exp.add({
                  service: c.service, category: "ai-api", classification: "OPEX",
                  amountUSD: c.amountUSD, amountNPR: Math.round(c.amountUSD * rate),
                  usdToNprRate: rate, date: c.date, description: c.description,
                  invoicePath: "", recurring: false, billingCycle: "one-time",
                })));
                setShowBootstrap(false);
              }}
              rate={rate}
            />
          )}

          <ExpenseForm onAdd={exp.add} rate={rate} />

          {exp.entries.length === 0 ? (
            <EmptyState message="अझै कुनै खर्च record गरिएको छैन — माथिको form बाट थप्नुहोस्">
              <div className="space-y-2 mt-2">
                {[
                  { service: "Cloudflare Pages",  cat: "Cloud Hosting", usd: "$0.00",   npr: "NPR 0"   },
                  { service: "Firebase Firestore", cat: "Database",      usd: "$2.50",   npr: "NPR 338" },
                  { service: "Domain .com.np",     cat: "Infrastructure",usd: "$10.00",  npr: "NPR 1,350" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{e.service}</p>
                      <p className="text-xs text-zinc-500">{e.cat}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-orange-400">{e.npr}</p>
                      <p className="text-xs text-zinc-600">{e.usd}</p>
                    </div>
                  </div>
                ))}
              </div>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-xs text-zinc-500">{exp.entries.length} वटा entries</p>
                <p className="text-xs text-orange-400 font-semibold">
                  कुल: {both(exp.entries.reduce((s, e) => s + e.amountUSD, 0))}
                </p>
              </div>
              {exp.entries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{e.service}</p>
                    <p className="text-xs text-zinc-500">
                      {e.date} · {EXP_CATS[e.category] ?? e.category} ·{" "}
                      <span className={e.classification === "CAPEX" ? "text-blue-400" : "text-orange-400"}>
                        {e.classification === "CAPEX" ? "एकमुस्त" : "मासिक"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono text-orange-400">NPR {e.amountNPR.toLocaleString()}</p>
                      <p className="text-xs text-zinc-600">${e.amountUSD.toFixed(2)}</p>
                    </div>
                    <button onClick={() => exp.remove(e.id)} className="text-zinc-700 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────── AI COST ─────────────────────────────────── */}
      {tab === "ai" && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm">AI लागत भनेको के हो?</p>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              Document analyze गर्दा, URL process गर्दा, र SSF statement पढ्दा AI service लाई पैसा तिर्नुपर्छ।
              ZZC सबैभन्दा पहिले सस्तो AI (Gemini) try गर्छ, अनि मात्र महँगो use गर्छ।
            </p>
          </div>

          {/* Simple metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              label="यो महिना AI खर्च"
              nepali="सबै AI services को जम्मा"
              value={totalAIUSD > 0 ? toNPR(totalAIUSD) : "NPR 0"}
              sub={`$${totalAIUSD.toFixed(4)} · ${aiUsage.totalAnalyses} documents`}
              level={totalAIUSD < 1 ? "green" : totalAIUSD < 10 ? "yellow" : "red"}
              tip="Gemini + AWS + Anthropic सबैको combined AI cost यो महिना"
            />
            <Card
              label="प्रति document"
              nepali="एउटा file analyze गर्न"
              value={aiUsage.avgCostPerAnalysis > 0 ? `NPR ${(aiUsage.avgCostPerAnalysis * rate).toFixed(4)}` : "Data आउँदैछ"}
              sub={aiUsage.avgCostPerAnalysis > 0 ? `$${aiUsage.avgCostPerAnalysis.toFixed(5)} average` : "Document analyze गरेपछि देखिन्छ"}
              level={aiUsage.avgCostPerAnalysis === 0 ? "neutral" : aiUsage.avgCostPerAnalysis < 0.01 ? "green" : "yellow"}
              tip="एउटा document वा URL analyze गर्न औसतमा यति लाग्छ"
            />
          </div>

          {/* Provider health — human language */}
          {aiUsage.providerEconomics.length === 0 ? (
            <EmptyState message="Document analyze गरेपछि AI service health यहाँ देखिन्छ">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <p className="text-zinc-300 font-semibold text-sm">AI Services को अवस्था</p>
                {[
                  { label: "Gemini Flash (Google) — सबैभन्दा सस्तो", pct: 95 },
                  { label: "AWS Bedrock — मध्यम",                    pct: 88 },
                  { label: "Anthropic Claude — सबैभन्दा महँगो",      pct: 100 },
                ].map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-zinc-300 text-sm">{p.label}</p>
                    <div className="bg-zinc-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </EmptyState>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-5">
              <div>
                <p className="text-zinc-200 font-semibold text-sm">AI Services को अवस्था</p>
                <p className="text-zinc-500 text-xs mt-0.5">ZZC सबैभन्दा सस्तो service पहिले try गर्छ — Gemini → AWS → Anthropic</p>
              </div>
              {aiUsage.providerEconomics.map(p => {
                const lvl: Health = p.successRate >= 0.9 ? "green" : p.successRate >= 0.6 ? "yellow" : "red";
                const labels: Record<string, string> = {
                  gemini:    "Gemini Flash (Google) — सबैभन्दा सस्तो",
                  bedrock:   "AWS Bedrock — मध्यम खर्च",
                  anthropic: "Anthropic Claude — सबैभन्दा महँगो",
                };
                const statusText = p.successRate >= 0.9 ? "राम्रो" : p.successRate >= 0.6 ? "ठीकै" : "Problem छ";
                return (
                  <div key={p.provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill level={lvl} label={statusText} />
                        <Tip text={`${p.callCount} calls गरियो · प्रति call: NPR ${(p.avgCostUSD * rate).toFixed(4)} ($${p.avgCostUSD.toFixed(6)})`}>
                          <span className="text-zinc-300 text-sm">{labels[p.provider] ?? p.provider}</span>
                        </Tip>
                      </div>
                      <Tip text="यो service बाट अहिलेसम्मको जम्मा खर्च">
                        <span className="text-zinc-500 text-xs font-mono cursor-help">
                          {toNPR(p.totalCostUSD)} total
                        </span>
                      </Tip>
                    </div>
                    <div className="bg-zinc-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${lvl === "green" ? "bg-green-500" : lvl === "yellow" ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.round(p.successRate * 100)}%` }}
                      />
                    </div>
                    <p className="text-zinc-600 text-xs">{Math.round(p.successRate * 100)}% requests सफल · {p.callCount} documents processed</p>
                  </div>
                );
              })}

              <Advanced label="Technical details (tokens, exact costs, model names)">
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-800/80">
                      <tr>
                        {["Service", "जम्मा", "Calls", "प्रति call", "सफल %"].map(h => (
                          <th key={h} className={`px-3 py-2 text-zinc-400 font-medium ${h === "Service" ? "text-left" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsage.providerEconomics.map(p => (
                        <tr key={p.provider} className="border-t border-zinc-800/60 hover:bg-zinc-800/20">
                          <td className="px-3 py-2 text-zinc-200 capitalize font-semibold">{p.provider}</td>
                          <td className="px-3 py-2 text-right font-mono text-orange-400">${p.totalCostUSD.toFixed(5)}</td>
                          <td className="px-3 py-2 text-right text-zinc-400">{p.callCount}</td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-300">${p.avgCostUSD.toFixed(6)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${p.successRate >= 0.9 ? "text-green-400" : p.successRate >= 0.7 ? "text-amber-400" : "text-red-400"}`}>
                            {Math.round(p.successRate * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Advanced>
            </div>
          )}

          {/* Daily chart */}
          {aiUsage.dailyTimeline.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <Tip text="पछिल्लो 30 दिनमा प्रत्येक दिन AI मा कति NPR खर्च भयो">
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider cursor-help">दैनिक AI खर्च — पछिल्लो 30 दिन</p>
              </Tip>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={aiUsage.dailyTimeline.map(d => ({ date: d.date, npr: +(d.costUSD * rate).toFixed(3) }))}>
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `NPR ${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }}
                    formatter={(v) => [`NPR ${Number(v).toFixed(3)}`, "AI खर्च"]}
                  />
                  <Bar dataKey="npr" fill="#a855f7" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-zinc-600 text-xs mt-2 text-right">
                <Tip text="Last 30 days total ÷ 30">दैनिक औसत: NPR {(aiUsage.dailyBurnUSD * rate).toFixed(3)}</Tip>
              </p>
            </div>
          )}

          {/* Month comparison */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <Tip text="गत महिना (last calendar month) को AI cost">
                <p className="text-xs text-zinc-500 mb-1 cursor-help">गत महिना</p>
              </Tip>
              <p className="text-base font-bold font-mono text-zinc-300">{toNPR(aiUsage.lastMonthUSD)}</p>
              <p className="text-xs text-zinc-600">${aiUsage.lastMonthUSD.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <Tip text="यो महिना (current month) को AI cost अहिलेसम्म">
                <p className="text-xs text-zinc-500 mb-1 cursor-help">यो महिना</p>
              </Tip>
              <p className="text-base font-bold font-mono text-white">{toNPR(aiUsage.thisMonthUSD)}</p>
              <p className="text-xs text-zinc-600">${aiUsage.thisMonthUSD.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <Tip text="यो pace मा महिना सकिँदा कति हुन्छ भन्ने अनुमान">
                <p className="text-xs text-zinc-500 mb-1 cursor-help">अनुमानित</p>
              </Tip>
              <p className="text-base font-bold font-mono text-amber-400">{toNPR(aiUsage.projectedMonthlyUSD)}</p>
              <p className="text-xs text-zinc-600">${aiUsage.projectedMonthlyUSD.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────── APPROVAL ────────────────────────────────── */}
      {tab === "approval" && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm">Approval Queue भनेको के हो?</p>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              ठूला deals, sponsorships, वा payouts यहाँ stage गर्नुहोस्।
              Approve गरेपछि मात्र final हुन्छ — गलत entries हुँदैन।
            </p>
          </div>

          {/* Propose */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-zinc-200">नयाँ proposal थप्नुहोस्</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={aqType} onChange={e => setAqType(e.target.value as ApprovalItemType)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {(["sponsorship","revenue","payout","expense","revenue-adjustment"] as ApprovalItemType[]).map(t => (
                  <option key={t} value={t}>{AQ_LABELS[t]}</option>
                ))}
              </select>
              <input type="number" placeholder="रकम (USD मा)" value={aqAmtUSD} onChange={e => setAqAmtUSD(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <input type="text" placeholder="नाम (NRB Sponsorship Q3…)" value={aqTitle} onChange={e => setAqTitle(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 col-span-2"
              />
              <input type="text" placeholder="विवरण (optional)" value={aqDesc} onChange={e => setAqDesc(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 col-span-2"
              />
            </div>
            {aqAmtUSD && (
              <p className="text-xs text-zinc-500">= NPR {Math.round(parseFloat(aqAmtUSD || "0") * rate).toLocaleString()}</p>
            )}
            <button onClick={submitApproval} disabled={aqSaving || !aqTitle || !aqAmtUSD}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {aqSaving ? "…" : "Approval Queue मा थप्नुहोस् →"}
            </button>
          </div>

          {/* Pending */}
          {approval.pending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pill level="yellow" label="Pending" />
                <p className="text-zinc-400 text-sm">तपाईंको निर्णय चाहिन्छ ({approval.pending.length} items)</p>
              </div>
              {approval.pending.map(item => (
                <div key={item.id} className="bg-zinc-900 border border-amber-900/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AQ_COLORS[item.type]}`}>
                          {AQ_LABELS[item.type]}
                        </span>
                        <span className="text-xs text-zinc-600">{item.requestedAt.slice(0, 10)}</span>
                      </div>
                      <p className="text-white font-semibold">{item.title}</p>
                      {item.description && <p className="text-zinc-500 text-xs mt-0.5">{item.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-bold">NPR {item.amountNPR.toLocaleString()}</p>
                      <p className="text-zinc-600 text-xs">${item.amountUSD.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approval.approve(item.id)}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-green-900 text-green-400 hover:bg-green-800 transition-colors"
                    >✓ Approve</button>
                    <button onClick={() => approval.reject(item.id)}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-red-950 text-red-400 hover:bg-red-900 transition-colors"
                    >✕ Reject</button>
                    <button onClick={() => approval.remove(item.id)}
                      className="text-xs text-zinc-600 hover:text-zinc-400 px-3 transition-colors"
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {(approval.approved.length + approval.rejected.length) > 0 && (
            <Advanced label={`History हेर्नुहोस् (${approval.approved.length + approval.rejected.length} items)`}>
              <div className="space-y-2">
                {[...approval.approved, ...approval.rejected]
                  .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
                  .map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Pill level={item.status === "approved" ? "green" : "red"} label={item.status === "approved" ? "Approved" : "Rejected"} />
                      <span className="text-zinc-300 text-sm">{item.title}</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono shrink-0">NPR {item.amountNPR.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Advanced>
          )}

          {approval.items.length === 0 && (
            <EmptyState message="कुनै proposal छैन — माथिबाट थप्नुहोस्">
              <div className="space-y-2 mt-2">
                {[
                  { type: "Sponsorship",  title: "NRB Digital Week Sponsorship",   npr: "NPR 50,000", status: "pending"  },
                  { type: "Revenue",      title: "Annual Research Report Sale",     npr: "NPR 25,000", status: "approved" },
                  { type: "Payout",       title: "Content Creator Payment — May",   npr: "NPR 5,000",  status: "pending"  },
                ].map((e, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">{e.title}</p>
                      <p className="text-zinc-500 text-xs">{e.type}</p>
                    </div>
                    <span className="text-zinc-400 text-sm font-mono">{e.npr}</span>
                  </div>
                ))}
              </div>
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusinessClient() {
  return <BIDashboard />;
}
