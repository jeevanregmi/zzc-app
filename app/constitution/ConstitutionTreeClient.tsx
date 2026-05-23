"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";
import Link from "next/link";

// ─── Tree Data ─────────────────────────────────────────────────────────────────

interface Branch {
  id:       string;
  label:    string;
  nepali:   string;
  emoji:    string;
  color:    string;        // tailwind color base (e.g. "green")
  keywords: string[];      // for search matching
  articles: string[];      // known article references
  type:     "branch";
}

const BRANCHES: Branch[] = [
  {
    id: "education", label: "Education", nepali: "शिक्षा", emoji: "📚",
    color: "green",
    keywords: ["शिक्षा", "education", "school", "university", "vidyalaya", "padhna"],
    articles: ["Art. 31"],
    type: "branch",
  },
  {
    id: "health", label: "Health", nepali: "स्वास्थ्य", emoji: "🏥",
    color: "red",
    keywords: ["स्वास्थ्य", "health", "hospital", "medicine", "aushadhi", "ausadhi"],
    articles: ["Art. 35"],
    type: "branch",
  },
  {
    id: "employment", label: "Employment", nepali: "रोजगारी", emoji: "💼",
    color: "blue",
    keywords: ["रोजगारी", "rojgari", "employment", "work", "labour", "shramik", "job"],
    articles: ["Art. 33", "Art. 34"],
    type: "branch",
  },
  {
    id: "finance", label: "Finance / Economy", nepali: "अर्थ/वित्त", emoji: "💰",
    color: "yellow",
    keywords: ["अर्थ", "वित्त", "finance", "economy", "budget", "tax", "bittiya"],
    articles: ["Art. 51(d)", "Art. 119", "Art. 120"],
    type: "branch",
  },
  {
    id: "women", label: "Women", nepali: "महिला", emoji: "👩",
    color: "pink",
    keywords: ["महिला", "mahila", "women", "gender", "linga", "samanta"],
    articles: ["Art. 38"],
    type: "branch",
  },
  {
    id: "children", label: "Children", nepali: "बालबालिका", emoji: "👶",
    color: "purple",
    keywords: ["बालबालिका", "bal", "children", "child", "minor", "baccha"],
    articles: ["Art. 39"],
    type: "branch",
  },
  {
    id: "environment", label: "Environment", nepali: "वातावरण", emoji: "🌿",
    color: "emerald",
    keywords: ["वातावरण", "vatavaran", "environment", "jungle", "ban", "nature", "climate"],
    articles: ["Art. 30"],
    type: "branch",
  },
  {
    id: "federalism", label: "Federalism", nepali: "संघीयता", emoji: "🗺️",
    color: "orange",
    keywords: ["संघीयता", "sanghiyata", "federalism", "province", "pradesh", "municipality", "palika"],
    articles: ["Art. 56", "Art. 57", "Art. 232"],
    type: "branch",
  },
  {
    id: "agriculture", label: "Agriculture", nepali: "कृषि", emoji: "🌾",
    color: "lime",
    keywords: ["कृषि", "krishi", "agriculture", "farmer", "kisan", "land", "jagga"],
    articles: ["Art. 51(c)"],
    type: "branch",
  },
  {
    id: "governance", label: "Governance", nepali: "सुशासन", emoji: "⚖️",
    color: "cyan",
    keywords: ["सुशासन", "sushasan", "governance", "corruption", "bhrashtachar", "transparency"],
    articles: ["Art. 51(e)", "Art. 17"],
    type: "branch",
  },
  {
    id: "dalits", label: "Dalits / Inclusion", nepali: "दलित/समावेशिता", emoji: "🤝",
    color: "violet",
    keywords: ["दलित", "dalit", "marginalized", "inclusion", "samaveshi", "janajati", "aadivasi"],
    articles: ["Art. 40", "Art. 42"],
    type: "branch",
  },
  {
    id: "justice", label: "Justice / Judiciary", nepali: "न्याय", emoji: "⚖️",
    color: "indigo",
    keywords: ["न्याय", "nyay", "justice", "court", "adalat", "supreme court", "constitution court"],
    articles: ["Art. 126", "Art. 127", "Art. 137"],
    type: "branch",
  },
];

// Leaf type legend
const LEAF_TYPES = [
  { type: "leaf",    emoji: "🍃", label: "Active Article",      desc: "Currently active constitutional provision" },
  { type: "fruit",   emoji: "🍎", label: "Implemented",         desc: "Has government programs / budgets connected" },
  { type: "flower",  emoji: "🌸", label: "Promised",            desc: "Future plans or policy promises attached" },
  { type: "dry",     emoji: "🍂", label: "Unimplemented",       desc: "Delayed, disputed, or not yet acted upon" },
];

// ─── Constitution Record Card ──────────────────────────────────────────────────

function ArticleCard({
  record,
  selected,
  onClick,
}: {
  record: ConstitutionalFrameworkRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const leafType =
    record.constitutionalThemes?.includes("implemented") ? "fruit"  :
    record.constitutionalThemes?.includes("promised")    ? "flower" :
    record.constitutionalThemes?.includes("disputed")    ? "dry"    : "leaf";

  const leafEmoji = LEAF_TYPES.find(l => l.type === leafType)?.emoji ?? "🍃";

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-2xl border p-4 transition-all space-y-2 ${
        selected
          ? "bg-amber-950/60 border-amber-600 ring-1 ring-amber-600"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{leafEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-snug">
            {record.titleNepali || record.titleEnglish}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">{record.articleId?.replace("art-", "Art. ")}</p>
        </div>
      </div>
      <p className="text-zinc-300 text-xs leading-relaxed line-clamp-3">
        {record.plainNepaliSummary || record.originalText}
      </p>
      {record.rights?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {record.rights.slice(0, 3).map(r => (
            <span key={r} className="text-xs px-1.5 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-900">
              {r}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Placeholder Card ──────────────────────────────────────────────────────────

function PlaceholderArticleCard({ article }: { article: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 border-dashed p-4 space-y-2 bg-zinc-900/40">
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">🍃</span>
        <div>
          <p className="text-zinc-500 font-bold text-sm">{article}</p>
          <p className="text-zinc-700 text-xs">Extract Constitution PDF to see details</p>
        </div>
      </div>
      <div className="h-2 bg-zinc-800 rounded w-3/4 animate-pulse" />
      <div className="h-2 bg-zinc-800 rounded w-1/2 animate-pulse" />
    </div>
  );
}

// ─── Side Panel ────────────────────────────────────────────────────────────────

function SidePanel({
  record,
  branch,
}: {
  record: ConstitutionalFrameworkRecord | null;
  branch: Branch | null;
}) {
  if (!record && !branch) return null;

  const title    = record ? (record.titleNepali || record.titleEnglish) : (branch?.nepali ?? "");
  const subtitle = record ? record.articleId?.replace("art-", "Art. ") : branch?.articles.join(", ") ?? "";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 sticky top-4">
      <div>
        <p className="text-white font-black text-base leading-snug">{title}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>
      </div>

      {record?.originalText && (
        <div className="bg-zinc-800/60 rounded-xl p-3">
          <p className="text-zinc-500 text-xs font-semibold mb-1.5">Original Text</p>
          <p className="text-zinc-400 text-xs leading-relaxed italic">
            &ldquo;{record.originalText}&rdquo;
          </p>
        </div>
      )}

      {/* Semantic tags */}
      {record && (
        <div className="space-y-2">
          {record.obligations?.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold mb-1">State Obligations</p>
              <ul className="space-y-0.5">
                {record.obligations.map((o, i) => (
                  <li key={i} className="text-zinc-400 text-xs flex gap-1.5">
                    <span className="text-amber-500 shrink-0">→</span>{o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {record.institutions?.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold mb-1">Institutions</p>
              <div className="flex flex-wrap gap-1">
                {record.institutions.map(inst => (
                  <span key={inst} className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900">
                    🏛️ {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
          {record.affectedGroups?.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold mb-1">Affected Groups</p>
              <div className="flex flex-wrap gap-1">
                {record.affectedGroups.map(g => (
                  <span key={g} className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related Intelligence — future connections */}
      <div className="space-y-2 border-t border-zinc-800 pt-3">
        <p className="text-zinc-500 text-xs font-semibold">Connected Intelligence</p>
        {[
          { icon: "📋", label: "Related Policies",     count: 0, color: "text-blue-400" },
          { icon: "💰", label: "Related Budgets",      count: 0, color: "text-green-400" },
          { icon: "🏛️", label: "Govt. Programs",      count: 0, color: "text-amber-400" },
          { icon: "📊", label: "Implementation",       count: 0, color: "text-purple-400" },
          { icon: "📰", label: "Related News/Media",   count: 0, color: "text-cyan-400" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <span className={`text-xs ${item.color}`}>{item.icon} {item.label}</span>
            {item.count === 0 ? (
              <span className="text-zinc-700 text-xs">— Extract PDF first</span>
            ) : (
              <span className={`text-xs font-bold ${item.color}`}>{item.count}</span>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/vault/documents"
        className="block w-full text-center text-xs font-bold py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
      >
        📜 Vault मा Constitution Extract गर्नुहोस्
      </Link>
    </div>
  );
}

// ─── Branch Chip ───────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  green:   { bg: "bg-green-950/40",   text: "text-green-300",   border: "border-green-800",   activeBg: "bg-green-900" },
  red:     { bg: "bg-red-950/40",     text: "text-red-300",     border: "border-red-800",     activeBg: "bg-red-900" },
  blue:    { bg: "bg-blue-950/40",    text: "text-blue-300",    border: "border-blue-800",    activeBg: "bg-blue-900" },
  yellow:  { bg: "bg-yellow-950/40",  text: "text-yellow-300",  border: "border-yellow-800",  activeBg: "bg-yellow-900" },
  pink:    { bg: "bg-pink-950/40",    text: "text-pink-300",    border: "border-pink-800",    activeBg: "bg-pink-900" },
  purple:  { bg: "bg-purple-950/40",  text: "text-purple-300",  border: "border-purple-800",  activeBg: "bg-purple-900" },
  emerald: { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-800", activeBg: "bg-emerald-900" },
  orange:  { bg: "bg-orange-950/40",  text: "text-orange-300",  border: "border-orange-800",  activeBg: "bg-orange-900" },
  lime:    { bg: "bg-lime-950/40",    text: "text-lime-300",    border: "border-lime-800",    activeBg: "bg-lime-900" },
  cyan:    { bg: "bg-cyan-950/40",    text: "text-cyan-300",    border: "border-cyan-800",    activeBg: "bg-cyan-900" },
  violet:  { bg: "bg-violet-950/40",  text: "text-violet-300",  border: "border-violet-800",  activeBg: "bg-violet-900" },
  indigo:  { bg: "bg-indigo-950/40",  text: "text-indigo-300",  border: "border-indigo-800",  activeBg: "bg-indigo-900" },
};

function BranchChip({ branch, active, count, onClick }: { branch: Branch; active: boolean; count: number; onClick: () => void }) {
  const c = COLOR_MAP[branch.color] ?? COLOR_MAP.cyan;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-semibold text-sm transition-all shrink-0 ${
        active
          ? `${c.activeBg} ${c.text} ${c.border} ring-1 ${c.border}`
          : `${c.bg} ${c.text} ${c.border} hover:${c.activeBg}`
      }`}
    >
      <span>{branch.emoji}</span>
      <span>{branch.nepali}</span>
      {count > 0 && (
        <span className="text-xs opacity-70 font-normal">({count})</span>
      )}
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [search,         setSearch]         = useState("");
  const [activeBranch,   setActiveBranch]   = useState<Branch | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [allRecords,     setAllRecords]     = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Load constitutional_framework records (publicly readable where publishToJanta == true)
  useEffect(() => {
    getDocs(query(
      collection(db, "constitutional_framework"),
      where("publishToJanta", "==", true),
    )).then(snap => {
      setAllRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Search: auto-select matching branch
  useEffect(() => {
    if (!search.trim()) return;
    const q = search.toLowerCase();
    const match = BRANCHES.find(b =>
      b.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))
    );
    if (match && match.id !== activeBranch?.id) setActiveBranch(match);
  }, [search, activeBranch?.id]);

  // Records for the active branch
  const branchRecords = useMemo(() => {
    if (!activeBranch) return [] as ConstitutionalFrameworkRecord[];
    if (allRecords.length === 0) return [] as ConstitutionalFrameworkRecord[];
    return allRecords.filter(r => {
      const sectors  = (r.sectors ?? []).join(" ").toLowerCase();
      const themes   = (r.constitutionalThemes ?? []).join(" ").toLowerCase();
      const keywords = (r.keywords ?? []).join(" ").toLowerCase();
      const kws      = activeBranch.keywords.map(k => k.toLowerCase());
      return kws.some(k => sectors.includes(k) || themes.includes(k) || keywords.includes(k));
    });
  }, [activeBranch, allRecords]);

  // Count per branch
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BRANCHES.forEach(b => {
      counts[b.id] = allRecords.filter(r => {
        const all = [...(r.sectors ?? []), ...(r.constitutionalThemes ?? []), ...(r.keywords ?? [])].join(" ").toLowerCase();
        return b.keywords.some(k => all.includes(k.toLowerCase()));
      }).length;
    });
    return counts;
  }, [allRecords]);

  // Filtered branches for search
  const visibleBranches = useMemo(() => {
    if (!search.trim()) return BRANCHES;
    const q = search.toLowerCase();
    return BRANCHES.filter(b =>
      b.nepali.toLowerCase().includes(q) ||
      b.label.toLowerCase().includes(q) ||
      b.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))
    );
  }, [search]);

  const hasData = allRecords.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
        <Link href="/janta" className="text-zinc-500 hover:text-white text-sm transition-colors">← जनता</Link>
        <span className="text-zinc-800">|</span>
        <span className="text-white font-bold text-sm">🌳 संविधान Tree</span>
        {hasData && (
          <span className="text-amber-500 text-xs font-semibold">
            {allRecords.length} articles extracted
          </span>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-6xl">🌳</div>
          <h1 className="text-3xl font-black text-white">नेपाल संविधान</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            जीवित रूख — मौलिक हक, निर्देशक सिद्धान्त, संस्था, र नागरिक अधिकार।
            <br />
            <span className="text-zinc-600">Topic खोज्नुस् — constitutional root देखाउँछ।</span>
          </p>
          {!hasData && !loading && (
            <div className="inline-flex items-center gap-2 bg-amber-950/50 border border-amber-800 rounded-xl px-4 py-2">
              <span className="text-amber-400 text-xs font-semibold">
                📜 Vault मा Constitution PDF upload गरेर Extract गर्नुस् — tree populate हुनेछ
              </span>
              <Link href="/vault/documents" className="text-amber-300 text-xs underline font-bold">
                Vault →
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedRecord(null); }}
            placeholder="शिक्षा, स्वास्थ्य, रोजगारी, महिला, संघीयता..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-600 transition-colors"
          />
        </div>

        {/* Tree visual */}
        <div className="flex flex-col items-center gap-3">

          {/* Root */}
          <div className="bg-zinc-900 border border-amber-800/60 rounded-2xl px-6 py-3 text-center">
            <p className="text-amber-400 font-black text-sm">🌱 Root — जनताको संप्रभुता</p>
            <p className="text-zinc-600 text-xs">Art. 1–4 · Nepal is a sovereign, socialist, secular, democratic republic</p>
          </div>

          {/* Connector */}
          <div className="w-0.5 h-5 bg-zinc-800" />

          {/* Trunk */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-3 w-full max-w-xl text-center space-y-1.5">
            <p className="text-zinc-300 font-black text-xs uppercase tracking-widest">Trunk — Constitutional Foundations</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { label: "मौलिक हक",        sub: "Part 3 · Art. 16–46", color: "text-green-400" },
                { label: "निर्देशक सिद्धान्त", sub: "Part 4 · Art. 48–51", color: "text-blue-400" },
                { label: "नागरिक कर्तव्य",   sub: "Part 5 · Art. 48",    color: "text-purple-400" },
                { label: "राज्य संरचना",     sub: "Part 5+ · Art. 56+",  color: "text-orange-400" },
              ].map(t => (
                <div key={t.label} className="text-center">
                  <p className={`${t.color} text-xs font-bold`}>{t.label}</p>
                  <p className="text-zinc-700 text-xs">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Connector */}
          <div className="w-0.5 h-5 bg-zinc-800" />

          {/* Branches label */}
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Branches — Sectors & Themes</p>
        </div>

        {/* Branch chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {visibleBranches.map(branch => (
            <BranchChip
              key={branch.id}
              branch={branch}
              active={activeBranch?.id === branch.id}
              count={branchCounts[branch.id] ?? 0}
              onClick={() => {
                setActiveBranch(prev => prev?.id === branch.id ? null : branch);
                setSelectedRecord(null);
              }}
            />
          ))}
          {visibleBranches.length === 0 && search && (
            <p className="text-zinc-600 text-sm">कुनै branch match भएन — अर्को keyword try गर्नुस्</p>
          )}
        </div>

        {/* Leaf type legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {LEAF_TYPES.map(lt => (
            <div key={lt.type} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span>{lt.emoji}</span>
              <span>{lt.label}</span>
            </div>
          ))}
        </div>

        {/* Active branch content */}
        {activeBranch && (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Articles grid */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeBranch.emoji}</span>
                <div>
                  <p className="text-white font-black">{activeBranch.nepali}</p>
                  <p className="text-zinc-500 text-xs">{activeBranch.label} · {activeBranch.articles.join(", ")}</p>
                </div>
              </div>

              {loading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : branchRecords.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {branchRecords.map(record => (
                    <ArticleCard
                      key={record.id}
                      record={record}
                      selected={selectedRecord?.id === record.id}
                      onClick={() => setSelectedRecord(prev => prev?.id === record.id ? null : record)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeBranch.articles.map(a => (
                      <PlaceholderArticleCard key={a} article={a} />
                    ))}
                  </div>
                  <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-zinc-500 text-sm">
                      Constitution PDF extract गरेपछि यहाँ <span className="text-amber-400 font-semibold">{activeBranch.nepali}</span> सम्बन्धी articles देखिन्छ।
                    </p>
                    <Link
                      href="/vault/documents"
                      className="inline-block text-xs font-bold px-4 py-2 rounded-xl bg-amber-900/60 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
                    >
                      📜 Vault मा जानुस् →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Side panel */}
            <div>
              <SidePanel record={selectedRecord} branch={activeBranch} />
            </div>
          </div>
        )}

        {/* No branch selected — show all extracted articles */}
        {!activeBranch && hasData && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-sm text-center">
              Branch select गर्नुस् — वा सबै {allRecords.length} extracted articles हेर्नुस्:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allRecords.slice(0, 12).map(record => (
                <ArticleCard
                  key={record.id}
                  record={record}
                  selected={selectedRecord?.id === record.id}
                  onClick={() => setSelectedRecord(prev => prev?.id === record.id ? null : record)}
                />
              ))}
            </div>
            {allRecords.length > 12 && (
              <p className="text-zinc-600 text-xs text-center">
                + {allRecords.length - 12} more articles — branch filter गर्नुस्
              </p>
            )}
          </div>
        )}

        {/* Footer note */}
        <div className="border-t border-zinc-900 pt-6 text-center space-y-1">
          <p className="text-zinc-700 text-xs">
            Nepal Constitution 2015 (2072 BS) · 308 Articles · 35 Parts · 9 Schedules
          </p>
          <p className="text-zinc-800 text-xs">
            ZZC Constitutional Intelligence · Root Ontology Layer · Governance Graph Foundation
          </p>
        </div>
      </div>
    </div>
  );
}
