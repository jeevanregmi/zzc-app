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

// ── Article card ───────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  relatedCards,
}: {
  article: ConstitutionalFrameworkRecord;
  relatedCards: UniversalKnowledgeObject[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-5 space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-emerald-600 font-mono font-bold">भाग {article.partNumber}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500 font-mono">धारा {article.article}</span>
          {article.clause && (
            <span className="text-zinc-700 font-mono">({article.clause})</span>
          )}
        </div>
        <h3 className="text-white font-black text-base leading-snug">{article.titleNepali}</h3>
        <p className="text-zinc-600 text-[11px]">{article.titleEnglish}</p>
      </div>

      {/* Plain explanation — always visible */}
      {article.plainNepaliSummary && (
        <p className="text-zinc-300 text-sm leading-relaxed">{article.plainNepaliSummary}</p>
      )}

      {/* Original text — expandable */}
      {article.originalText && (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {expanded ? "▲ मूल पाठ लुकाउनुहोस्" : "▼ मूल पाठ हेर्नुहोस्"}
          </button>
          {expanded && (
            <blockquote className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-4 py-3">
              <p className="text-zinc-400 text-xs leading-relaxed italic">{article.originalText}</p>
            </blockquote>
          )}
        </div>
      )}

      {/* Rights / institution tags */}
      {((article.rights?.length ?? 0) > 0 || (article.institutions?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {article.rights?.slice(0, 3).map(r => (
            <span key={r} className="text-[9px] text-emerald-600 bg-emerald-950/20 border border-emerald-900/30 rounded-full px-2 py-0.5">
              {r}
            </span>
          ))}
          {article.institutions?.slice(0, 2).map(i => (
            <span key={i} className="text-[9px] text-blue-500 bg-blue-950/20 border border-blue-900/30 rounded-full px-2 py-0.5">
              {i}
            </span>
          ))}
        </div>
      )}

      {/* Quality-gated related Knowledge Cards */}
      {relatedCards.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-800/40">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            सम्बन्धित ज्ञान ({relatedCards.length})
          </p>
          {relatedCards.slice(0, 2).map(card => (
            <UniversalKnowledgeCard key={card.id} obj={card} compact />
          ))}
        </div>
      )}
    </article>
  );
}

// ── Grouped result section header ──────────────────────────────────────────────

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
  const [articles,      setArticles]      = useState<ConstitutionalFrameworkRecord[]>([]);
  const [civicCards,    setCivicCards]    = useState<UniversalKnowledgeObject[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [selectedPart,  setSelectedPart]  = useState<number | null>(null);
  const [activeTab,     setActiveTab]     = useState<Tab>("reader");
  const [treeLoaded,    setTreeLoaded]    = useState(false);

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
    ).slice(0, 12);

    const matchedCards = civicCards.filter(c =>
      c.titleNepali.toLowerCase().includes(n) ||
      c.summaryNepali.toLowerCase().includes(n) ||
      c.sector?.toLowerCase().includes(n) ||
      c.tags?.some(t => t.toLowerCase().includes(n)),
    ).slice(0, 4);

    return { matchedTopics, matchedParts, matchedArticles, matchedCards };
  }, [searchQuery, articles, civicCards]);

  function cardsForPart(partNum: number): UniversalKnowledgeObject[] {
    return civicCards.filter(c => c.constitutionalRefs?.includes(partNum)).slice(0, 3);
  }

  function cardsForArticle(a: ConstitutionalFrameworkRecord): UniversalKnowledgeObject[] {
    return civicCards.filter(c =>
      c.constitutionalRefs?.includes(a.partNumber) &&
      (c.sector === a.sectors?.[0] || c.tags?.some(t => a.keywords?.includes(t))),
    ).slice(0, 2);
  }

  const articlesForPart = selectedPart
    ? articles.filter(a => a.partNumber === selectedPart)
    : [];

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

              {searchResults.matchedArticles.length > 0 && (
                <ResultSection title={`धाराहरू (${searchResults.matchedArticles.length})`}>
                  <div className="space-y-3">
                    {searchResults.matchedArticles.map(a => (
                      <ArticleCard key={a.articleId} article={a} relatedCards={cardsForArticle(a)} />
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

              {/* Empty search state */}
              {searchResults.matchedTopics.length === 0 &&
               searchResults.matchedParts.length === 0 &&
               searchResults.matchedArticles.length === 0 &&
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
              <div>
                <h2 className="text-xl font-black text-white">
                  भाग {selectedPart} — {selectedPartMeta?.titleNepali}
                </h2>
                <p className="text-zinc-600 text-xs mt-0.5">{selectedPartMeta?.titleEnglish}</p>
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

              {articlesForPart.length === 0 ? (
                <p className="text-zinc-600 text-sm py-8">यस भागमा अहिले कुनै धारा लोड भएको छैन।</p>
              ) : (
                <div className="space-y-3">
                  {articlesForPart.map(a => (
                    <ArticleCard key={a.articleId} article={a} relatedCards={cardsForArticle(a)} />
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
                  const count = articles.filter(a => a.partNumber === p.num).length;
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
