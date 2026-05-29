"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import {
  collection, getDocs,
  query as fsQuery, where, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import Link from "next/link";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";
import type { IntelligenceRecord } from "../../lib/types/intelligence-record";
import { UniversalKnowledgeCard, type UniversalKnowledgeObject } from "../../components/UniversalKnowledgeCard";
import { isPublicSafe } from "../../lib/vault/qualityScore";
import { CIVIC_TOPICS, searchTopics } from "../../lib/civic/topicIndex";

// Lazy-load the 3D tree — heavy canvas, only when user clicks Tree tab
const ConstitutionTreeClient = dynamic(() => import("./ConstitutionTreeClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh] text-zinc-600 text-sm">
      🌳 Tree लोड हुँदैछ…
    </div>
  ),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[constitution-reader]", e?.code ?? e); return fb; });

function toUKO(r: IntelligenceRecord): UniversalKnowledgeObject {
  return {
    id:                 r.id,
    domain:             "civic",
    objectType:         r.type,
    titleNepali:        r.titleNepali,
    title:              r.title,
    summaryNepali:      r.summaryNepali,
    textEvidence:       r.textEvidence,
    pageNumber:         r.pageNumber,
    sourceQuote:        r.traceability?.sourceQuote,
    sourceTitle:        r.sourceDocTitle,
    sourceDocId:        r.sourceDocId,
    extractionTier:     r.extractionTier as UniversalKnowledgeObject["extractionTier"],
    sector:             r.sector,
    ministry:           r.ministry,
    constitutionalRefs: r.constitutionalRefs,
    affectedGroups:     r.affectedGroups,
    tags:               r.tags,
    verificationStatus: r.verificationStatus,
  };
}

// ── Nepal Constitution 2015 — 35 Parts ────────────────────────────────────────

const PARTS: { num: number; titleNepali: string; titleEnglish: string }[] = [
  { num: 1,  titleNepali: "प्रारम्भिक",                           titleEnglish: "Preliminary" },
  { num: 2,  titleNepali: "नागरिकता",                             titleEnglish: "Citizenship" },
  { num: 3,  titleNepali: "मौलिक हक",                             titleEnglish: "Fundamental Rights" },
  { num: 4,  titleNepali: "निर्देशक सिद्धान्त र नीति",            titleEnglish: "Directive Principles" },
  { num: 5,  titleNepali: "राज्यको संरचना",                       titleEnglish: "Structure of the State" },
  { num: 6,  titleNepali: "संघीय व्यवस्थापिका",                   titleEnglish: "Federal Legislature" },
  { num: 7,  titleNepali: "संघीय कार्यपालिका",                    titleEnglish: "Federal Executive" },
  { num: 8,  titleNepali: "संघीय वित्त व्यवस्था",                 titleEnglish: "Federal Finance" },
  { num: 9,  titleNepali: "प्रदेश व्यवस्थापिका",                  titleEnglish: "State Legislature" },
  { num: 10, titleNepali: "प्रदेश कार्यपालिका",                   titleEnglish: "State Executive" },
  { num: 11, titleNepali: "प्रदेश वित्त व्यवस्था",                titleEnglish: "State Finance" },
  { num: 12, titleNepali: "स्थानीय तह",                           titleEnglish: "Local Level" },
  { num: 13, titleNepali: "स्थानीय वित्त व्यवस्था",               titleEnglish: "Local Finance" },
  { num: 14, titleNepali: "अन्तरसरकारी वित्त व्यवस्था",          titleEnglish: "Inter-Governmental Finance" },
  { num: 15, titleNepali: "एकल संघीय इकाइ",                      titleEnglish: "Federal Units" },
  { num: 16, titleNepali: "राष्ट्रिय सुरक्षा",                    titleEnglish: "National Security" },
  { num: 17, titleNepali: "न्यायपालिका",                          titleEnglish: "Judiciary" },
  { num: 18, titleNepali: "न्याय सेवा",                           titleEnglish: "Judicial Service" },
  { num: 19, titleNepali: "महान्यायाधिवक्ता",                     titleEnglish: "Attorney General" },
  { num: 20, titleNepali: "CIAA — अख्तियार",                      titleEnglish: "Commission for Investigation of Abuse of Authority" },
  { num: 21, titleNepali: "महालेखापरीक्षक",                       titleEnglish: "Auditor General" },
  { num: 22, titleNepali: "लोकसेवा आयोग",                         titleEnglish: "Public Service Commission" },
  { num: 23, titleNepali: "निर्वाचन आयोग",                        titleEnglish: "Election Commission" },
  { num: 24, titleNepali: "मानव अधिकार आयोग — NHRC",              titleEnglish: "National Human Rights Commission" },
  { num: 25, titleNepali: "राष्ट्रिय महिला आयोग",                 titleEnglish: "National Women Commission" },
  { num: 26, titleNepali: "राष्ट्रिय दलित आयोग",                  titleEnglish: "National Dalit Commission" },
  { num: 27, titleNepali: "राष्ट्रिय समावेशी आयोग",               titleEnglish: "National Inclusive Commission" },
  { num: 28, titleNepali: "आदिवासी जनजाति आयोग",                  titleEnglish: "Indigenous Nationalities Commission" },
  { num: 29, titleNepali: "मधेसी आयोग",                           titleEnglish: "Madheshi Commission" },
  { num: 30, titleNepali: "थारू आयोग",                             titleEnglish: "Tharu Commission" },
  { num: 31, titleNepali: "मुस्लिम आयोग",                         titleEnglish: "Muslim Commission" },
  { num: 32, titleNepali: "राष्ट्रिय प्राकृतिक स्रोत",            titleEnglish: "Natural Resources" },
  { num: 33, titleNepali: "आपतकालीन व्यवस्था",                    titleEnglish: "State of Emergency" },
  { num: 34, titleNepali: "संशोधन",                               titleEnglish: "Amendment" },
  { num: 35, titleNepali: "विविध",                                 titleEnglish: "Miscellaneous" },
];

// ── Consolidated article data model ──────────────────────────────────────────

interface ConsolidatedClause {
  clauseId:          string;
  clause:            string | null;
  titleNepali:       string;
  originalText:      string;
  plainNepaliSummary: string;
}

interface ConsolidatedArticle {
  articleNumber:  number;
  partNumber:     number;
  partTitle:      string;
  titleNepali:    string;
  titleEnglish:   string;
  clauses:        ConsolidatedClause[];
  rights:         string[];
  duties:         string[];
  institutions:   string[];
  keywords:       string[];
  sectors:        string[];
  affectedGroups: string[];
}

function buildConsolidated(
  records: ConstitutionalFrameworkRecord[],
): ConsolidatedArticle[] {
  const groups = new Map<number, ConstitutionalFrameworkRecord[]>();
  for (const r of records) {
    if (!groups.has(r.article)) groups.set(r.article, []);
    groups.get(r.article)!.push(r);
  }

  const result: ConsolidatedArticle[] = [];

  for (const [articleNumber, recs] of groups) {
    // Primary record: prefer the one with no clause (main article), else first
    const primary = recs.find(r => !r.clause) ?? recs[0];
    const partMeta = PARTS.find(p => p.num === primary.partNumber);

    // Sort clauses: null clause first, then by clause value
    const sorted = [...recs].sort((a, b) => {
      if (!a.clause && b.clause) return -1;
      if (a.clause && !b.clause) return 1;
      return String(a.clause ?? "").localeCompare(String(b.clause ?? ""));
    });

    // Deduplicate by plainNepaliSummary (first 60 chars, normalised)
    const seenSummaries = new Set<string>();
    const uniqueClauses = sorted.filter(r => {
      const key = (r.plainNepaliSummary ?? "").trim().toLowerCase().slice(0, 60);
      if (!key || seenSummaries.has(key)) return false;
      seenSummaries.add(key);
      return true;
    });

    result.push({
      articleNumber,
      partNumber:  primary.partNumber,
      partTitle:   partMeta?.titleNepali ?? "",
      titleNepali: primary.titleNepali,
      titleEnglish: primary.titleEnglish,
      clauses: uniqueClauses.map((r, idx) => ({
        clauseId:          r.articleId ?? `art-${articleNumber}-${idx}`,
        clause:            r.clause ?? null,
        titleNepali:       r.titleNepali,
        originalText:      r.originalText ?? "",
        plainNepaliSummary: r.plainNepaliSummary ?? "",
      })),
      rights:         [...new Set(recs.flatMap(r => r.rights         ?? []))],
      duties:         [...new Set(recs.flatMap(r => r.duties         ?? []))],
      institutions:   [...new Set(recs.flatMap(r => r.institutions   ?? []))],
      keywords:       [...new Set(recs.flatMap(r => r.keywords       ?? []))],
      sectors:        [...new Set(recs.flatMap(r => r.sectors        ?? []))],
      affectedGroups: [...new Set(recs.flatMap(r => r.affectedGroups ?? []))],
    });
  }

  return result.sort((a, b) => a.articleNumber - b.articleNumber);
}

// ── Consolidated Article Reader component ─────────────────────────────────────

type ReadMode = "revision" | "standard";

function ConsolidatedArticleReader({
  article,
  relatedCards,
  mode,
}: {
  article: ConsolidatedArticle;
  relatedCards: UniversalKnowledgeObject[];
  mode: ReadMode;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showCards,    setShowCards]    = useState(false);

  // ── Revision (छिटो) — compact bullets only ────────────────────────────────
  if (mode === "revision") {
    return (
      <article className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-4 py-3.5 space-y-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-emerald-600 font-mono font-bold text-[11px] shrink-0">
            धारा {article.articleNumber}
          </span>
          <h3 className="text-zinc-100 font-bold text-sm leading-snug">{article.titleNepali}</h3>
        </div>
        <ul className="space-y-1 pl-1">
          {article.clauses.map(c => (
            <li key={c.clauseId} className="flex gap-2 text-zinc-400 text-xs leading-relaxed">
              <span className="text-emerald-700 shrink-0 mt-0.5">•</span>
              <span>{c.plainNepaliSummary}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  // ── Standard (पूरा) — one clean article block ─────────────────────────────
  return (
    <article className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-5 space-y-4">

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-emerald-600 font-mono font-bold">भाग {article.partNumber}</span>
          {article.partTitle && (
            <span className="text-emerald-800 font-mono">— {article.partTitle}</span>
          )}
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500 font-mono font-bold">धारा {article.articleNumber}</span>
        </div>
        <h3 className="text-white font-black text-lg leading-snug">{article.titleNepali}</h3>
        {article.titleEnglish && (
          <p className="text-zinc-600 text-[11px]">{article.titleEnglish}</p>
        )}
      </div>

      {/* "के छ यस धारामा?" — all clauses as bullets */}
      <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/40 px-4 py-3 space-y-2">
        <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-mono">
          यस धारामा के छ?
        </p>
        <ul className="space-y-2">
          {article.clauses.map(c => (
            <li key={c.clauseId} className="flex gap-2.5 text-zinc-200 text-sm leading-relaxed">
              <span className="text-emerald-500 shrink-0 font-bold mt-0.5">•</span>
              <span>{c.plainNepaliSummary}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Original text — expandable, preserves clauses */}
      {article.clauses.some(c => c.originalText) && (
        <div>
          <button
            onClick={() => setShowOriginal(o => !o)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showOriginal ? "▲ मूल पाठ लुकाउनुहोस्" : "▼ मूल पाठ हेर्नुहोस्"}
          </button>
          {showOriginal && (
            <blockquote className="mt-2 rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-4 py-3 space-y-2">
              {article.clauses.map(c => c.originalText ? (
                <p key={c.clauseId} className="text-zinc-400 text-xs leading-relaxed italic">
                  {c.clause && (
                    <span className="text-zinc-600 font-semibold not-italic">({c.clause}) </span>
                  )}
                  {c.originalText}
                </p>
              ) : null)}
            </blockquote>
          )}
        </div>
      )}

      {/* Rights / institution tags */}
      {(article.rights.length > 0 || article.institutions.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {article.rights.slice(0, 4).map(r => (
            <span key={r} className="text-[9px] text-emerald-600 bg-emerald-950/20 border border-emerald-900/30 rounded-full px-2 py-0.5">
              {r}
            </span>
          ))}
          {article.institutions.slice(0, 3).map(i => (
            <span key={i} className="text-[9px] text-blue-500 bg-blue-950/20 border border-blue-900/30 rounded-full px-2 py-0.5">
              {i}
            </span>
          ))}
        </div>
      )}

      {/* Related civic intelligence — collapsed by default */}
      {relatedCards.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/40">
          <button
            onClick={() => setShowCards(s => !s)}
            className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <span className="font-mono">{showCards ? "▲" : "▼"}</span>
            <span>सम्बन्धित Civic Intelligence ({relatedCards.length})</span>
          </button>
          {showCards && (
            <div className="mt-3 space-y-2">
              {relatedCards.slice(0, 3).map(card => (
                <UniversalKnowledgeCard key={card.id} obj={card} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Result section header ─────────────────────────────────────────────────────

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">{title}</p>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Tab = "reader" | "tree";

export default function ConstitutionReaderClient() {
  const [articles,     setArticles]     = useState<ConstitutionalFrameworkRecord[]>([]);
  const [civicCards,   setCivicCards]   = useState<UniversalKnowledgeObject[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>("reader");
  const [treeLoaded,   setTreeLoaded]   = useState(false);
  const [readMode,     setReadMode]     = useState<ReadMode>("standard");

  useEffect(() => {
    async function load() {
      const [artSnap, cardSnap] = await Promise.all([
        safe(
          getDocs(fsQuery(
            collection(db, "constitutional_framework"),
            where("publishToJanta", "==", true),
          )),
          null,
        ),
        safe(
          getDocs(fsQuery(
            collection(db, "janta_intelligence"),
            where("publishToJanta", "==", true),
            limit(200),
          )),
          null,
        ),
      ]);

      if (artSnap) {
        const docs = artSnap.docs.map(d => d.data() as ConstitutionalFrameworkRecord);
        docs.sort((a, b) => (a.article ?? 0) - (b.article ?? 0));
        setArticles(docs);
      }

      if (cardSnap) {
        const raw = cardSnap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));
        setCivicCards(raw.filter(r => isPublicSafe(r)).map(r => toUKO(r)));
      }

      setLoading(false);
    }
    load();
  }, []);

  // ── Unique article count per part (for grid) ───────────────────────────────
  const articleCountByPart = useMemo(() => {
    const counts: Record<number, number> = {};
    const seen = new Set<string>();
    for (const a of articles) {
      const key = `${a.partNumber}-${a.article}`;
      if (!seen.has(key)) {
        seen.add(key);
        counts[a.partNumber] = (counts[a.partNumber] ?? 0) + 1;
      }
    }
    return counts;
  }, [articles]);

  // ── Search (client-side, no API) ───────────────────────────────────────────

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 1) return null;
    const n = q.toLowerCase();

    const matchedTopics = searchTopics(q);

    const partNumsFromTopics = new Set(matchedTopics.flatMap(t => t.relatedParts));
    const matchedParts = PARTS.filter(p =>
      partNumsFromTopics.has(p.num) ||
      p.titleNepali.toLowerCase().includes(n) ||
      p.titleEnglish.toLowerCase().includes(n),
    );

    const matchedArticles = articles.filter(a =>
      a.titleNepali?.toLowerCase().includes(n) ||
      a.titleEnglish?.toLowerCase().includes(n) ||
      a.plainNepaliSummary?.toLowerCase().includes(n) ||
      a.rights?.some(r => r.toLowerCase().includes(n)) ||
      a.sectors?.some(s => s.toLowerCase().includes(n)) ||
      a.keywords?.some(k => k.toLowerCase().includes(n)) ||
      a.institutions?.some(i => i.toLowerCase().includes(n)) ||
      a.originalText?.toLowerCase().includes(n),
    );

    const matchedCards = civicCards.filter(c =>
      c.titleNepali.toLowerCase().includes(n) ||
      c.summaryNepali.toLowerCase().includes(n) ||
      c.sector?.toLowerCase().includes(n) ||
      c.tags?.some(t => t.toLowerCase().includes(n)),
    ).slice(0, 4);

    return { matchedTopics, matchedParts, matchedArticles, matchedCards };
  }, [searchQuery, articles, civicCards]);

  // Consolidate search article results (group + dedup)
  const searchArticlesConsolidated = useMemo(
    () => buildConsolidated(searchResults?.matchedArticles ?? []).slice(0, 10),
    [searchResults],
  );

  // Consolidate articles for the selected part
  const consolidatedForPart = useMemo(
    () => buildConsolidated(selectedPart ? articles.filter(a => a.partNumber === selectedPart) : []),
    [articles, selectedPart],
  );

  function cardsForConsolidated(ca: ConsolidatedArticle): UniversalKnowledgeObject[] {
    return civicCards.filter(c =>
      c.constitutionalRefs?.includes(ca.partNumber) &&
      (ca.sectors.some(s => c.sector === s) || ca.keywords.some(k => c.tags?.includes(k))),
    ).slice(0, 3);
  }

  function cardsForPart(partNum: number): UniversalKnowledgeObject[] {
    return civicCards.filter(c => c.constitutionalRefs?.includes(partNum)).slice(0, 3);
  }

  const selectedPartMeta = selectedPart ? PARTS.find(p => p.num === selectedPart) : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
        <span>/</span>
        <Link href="/civic" className="hover:text-zinc-400 transition">Civic</Link>
        <span>/</span>
        <span className="text-emerald-500">संविधान</span>
      </div>

      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          नेपालको संविधान
        </h1>
        <p className="text-zinc-400 text-base max-w-xl">
          धारा, भाग र अधिकारहरू सजिलो भाषामा पढ्नुहोस् र बुझ्नुहोस्
        </p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
          <span>स्रोत: नेपालको संविधान २०७२ · आधिकारिक पाठ</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-base pointer-events-none">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSelectedPart(null); }}
          placeholder="धारा, अधिकार, विषय वा शब्द खोज्नुहोस्… (जस्तै: मौलिक हक, शिक्षा, CIAA)"
          className="w-full pl-11 pr-10 py-3.5 bg-zinc-900/60 border border-zinc-700/60 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-700 focus:bg-zinc-900/80 transition-colors text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-zinc-800/60">
        {([
          { key: "reader", label: "📖 Reader" },
          { key: "tree",   label: "🌳 Tree Map" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); if (key === "tree") setTreeLoaded(true); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TREE TAB ── */}
      {activeTab === "tree" && (
        <div className="-mx-4 sm:-mx-6 min-h-screen">
          {treeLoaded && <ConstitutionTreeClient />}
        </div>
      )}

      {/* ── READER TAB ── */}
      {activeTab === "reader" && (
        <>
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-900/40 border border-zinc-800/40 animate-pulse" />
              ))}
            </div>
          )}

          {/* ── SEARCH RESULTS ── */}
          {!loading && searchResults && (
            <div className="space-y-8">

              {searchResults.matchedTopics.length > 0 && (
                <ResultSection title="विषय">
                  {searchResults.matchedTopics.map(t => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4 space-y-3 cursor-pointer hover:bg-emerald-950/20 transition-colors"
                      onClick={() => {
                        if (t.relatedParts[0]) { setSelectedPart(t.relatedParts[0]); setSearchQuery(""); }
                      }}
                    >
                      <div className="flex items-baseline gap-2">
                        <p className="text-white font-black text-base">{t.termNepali}</p>
                        <span className="text-[10px] text-emerald-600 font-mono">{t.termEnglish}</span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{t.explanationNepali}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {t.relatedParts.map(p => (
                          <button
                            key={p}
                            onClick={e => { e.stopPropagation(); setSelectedPart(p); setSearchQuery(""); }}
                            className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded px-2 py-0.5 hover:bg-emerald-950/60 transition-colors"
                          >
                            भाग {p} →
                          </button>
                        ))}
                        {t.relatedInstitutions.slice(0, 2).map(i => (
                          <span key={i} className="text-[10px] text-blue-500 bg-blue-950/20 border border-blue-900/30 rounded px-2 py-0.5">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </ResultSection>
              )}

              {searchResults.matchedParts.length > 0 && (
                <ResultSection title="संविधान भाग">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.matchedParts.map(p => (
                      <button
                        key={p.num}
                        onClick={() => { setSelectedPart(p.num); setSearchQuery(""); }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors text-left"
                      >
                        <span className="text-emerald-600 font-mono font-bold text-sm shrink-0">भाग {p.num}</span>
                        <div>
                          <p className="text-zinc-200 text-sm font-semibold">{p.titleNepali}</p>
                          <p className="text-zinc-600 text-[10px]">{p.titleEnglish}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ResultSection>
              )}

              {searchArticlesConsolidated.length > 0 && (
                <ResultSection title={`धाराहरू (${searchArticlesConsolidated.length})`}>
                  <div className="space-y-3">
                    {searchArticlesConsolidated.map(a => (
                      <ConsolidatedArticleReader
                        key={a.articleNumber}
                        article={a}
                        relatedCards={cardsForConsolidated(a)}
                        mode={readMode}
                      />
                    ))}
                  </div>
                </ResultSection>
              )}

              {searchResults.matchedCards.length > 0 && (
                <ResultSection title="Civic Knowledge Cards">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {searchResults.matchedCards.map(c => (
                      <UniversalKnowledgeCard key={c.id} obj={c} compact />
                    ))}
                  </div>
                </ResultSection>
              )}

              {searchResults.matchedTopics.length === 0 &&
               searchResults.matchedParts.length === 0 &&
               searchArticlesConsolidated.length === 0 &&
               searchResults.matchedCards.length === 0 && (
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-10 text-center space-y-2">
                  <p className="text-zinc-500 text-sm">"{searchQuery}" भेटिएन</p>
                  <p className="text-zinc-700 text-xs">
                    जस्तै: मौलिक हक · शिक्षा · CIAA · नागरिकता · महिला अधिकार
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PART ARTICLE LIST ── */}
          {!loading && !searchResults && selectedPart && (
            <div className="space-y-5">
              <button
                onClick={() => setSelectedPart(null)}
                className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← सबै भागहरू
              </button>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-white">
                    भाग {selectedPart} — {selectedPartMeta?.titleNepali}
                  </h2>
                  <p className="text-zinc-600 text-xs mt-0.5">{selectedPartMeta?.titleEnglish}</p>
                </div>

                {/* Read mode toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-700">पढ्ने तरिका:</span>
                  <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-xs">
                    <button
                      onClick={() => setReadMode("revision")}
                      className={`px-3 py-1.5 transition-colors ${
                        readMode === "revision"
                          ? "bg-zinc-800 text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      ⚡ छिटो Revision
                    </button>
                    <button
                      onClick={() => setReadMode("standard")}
                      className={`px-3 py-1.5 transition-colors border-l border-zinc-800 ${
                        readMode === "standard"
                          ? "bg-zinc-800 text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      📖 पूरा पढ्नुहोस्
                    </button>
                  </div>
                </div>
              </div>

              {cardsForPart(selectedPart).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                    यस भागका Civic Knowledge Cards
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {cardsForPart(selectedPart).map(c => (
                      <UniversalKnowledgeCard key={c.id} obj={c} compact />
                    ))}
                  </div>
                </div>
              )}

              {consolidatedForPart.length === 0 ? (
                <p className="text-zinc-600 text-sm py-8">यस भागमा अहिले कुनै धारा लोड भएको छैन।</p>
              ) : (
                <div className={readMode === "revision" ? "space-y-2" : "space-y-4"}>
                  {consolidatedForPart.map(a => (
                    <ConsolidatedArticleReader
                      key={a.articleNumber}
                      article={a}
                      relatedCards={cardsForConsolidated(a)}
                      mode={readMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PART GRID (default: no search, no part) ── */}
          {!loading && !searchResults && !selectedPart && (
            <div className="space-y-6">
              <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">भागहरू — Parts</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PARTS.map(p => {
                  const count = articleCountByPart[p.num] ?? 0;
                  return (
                    <button
                      key={p.num}
                      onClick={() => setSelectedPart(p.num)}
                      className="flex flex-col gap-1 p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-emerald-900/40 transition-all text-left group"
                    >
                      <span className="text-emerald-600 font-mono font-bold text-xs">भाग {p.num}</span>
                      <span className="text-zinc-200 text-sm font-semibold leading-snug group-hover:text-white transition-colors">
                        {p.titleNepali}
                      </span>
                      <span className="text-zinc-700 text-[10px]">{count > 0 ? `${count} धारा` : "—"}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick topic shortcuts */}
              <div className="space-y-3 pt-2">
                <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">
                  विषय अनुसार खोज्नुहोस्
                </p>
                <div className="flex flex-wrap gap-2">
                  {CIVIC_TOPICS.slice(0, 12).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSearchQuery(t.termNepali)}
                      className="text-xs px-3 py-1.5 rounded-full border border-zinc-800/60 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
                    >
                      {t.termNepali}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </main>
  );
}
