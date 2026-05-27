"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { UploadDocMeta } from "../../../hooks/vault/useDocumentUpload";
import type { DocUploadTask, DocCategory, GovFolder } from "../../../lib/types/documents";
import { GOV_FOLDER_META } from "../../../lib/types/documents";
import { createIntelligenceDoc } from "../../../lib/vault/firestore";
import { ActionLearnCard, type ActionLearnData } from "../../vault/LearnTip";
import OfficialSourceLinks from "../OfficialSourceLinks";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const CATEGORIES = ["research", "strategy", "legal", "finance", "content", "intelligence", "other"] as const;
type Cat = typeof CATEGORIES[number];

interface CatInfo {
  np:         string;
  desc:       string;
  examples:   string;
  ai_does:    string;
  depends_on: string;
}

const CATEGORY_INFO: Record<Cat, CatInfo> = {
  research: {
    np:         "अनुसन्धान",
    desc:       "अध्ययन, सर्वेक्षण, आयोग प्रतिवेदन, शोधपत्र — तथ्यमा आधारित विश्लेषण",
    examples:   "CEDA report, NPC अध्ययन, विश्वविद्यालय thesis, सर्वेक्षण प्रतिवेदन",
    ai_does:    "AI यो document बाट तथ्याङ्क, निष्कर्ष र नीतिगत सुझावहरू निकाल्छ र Constitution को Directive Principles सँग तुलना गर्छ",
    depends_on: "Constitution Tree को Research nodes, जनता Civic Gap detector, र भविष्यको Policy Evidence engine",
  },
  strategy: {
    np:         "रणनीति / नीति",
    desc:       "दीर्घकालीन सरकारी दिशा, राष्ट्रिय योजना र नीति सम्बन्धी documents",
    examples:   "राष्ट्रिय शिक्षा नीति २०७६, १५औं पञ्चवर्षीय योजना, कृषि विकास रणनीति, स्वास्थ्य नीति",
    ai_does:    "AI यो document बाट दीर्घकालीन प्रतिबद्धताहरू निकाल्छ, timeline सहित Constitution branches सँग map गर्छ, र नीति कार्यान्वयन gap पहिल्याउँछ",
    depends_on: "Constitution Tree का सबै branches, जनता Timeline को policy layer, र भविष्यको Governance Scorecard",
  },
  legal: {
    np:         "कानूनी / ऐन",
    desc:       "ऐन, नियमावली, संविधान, अदालत फैसला, अध्यादेश — कानूनी बाध्यता सम्बन्धी",
    examples:   "नागरिकता ऐन, श्रम ऐन, उच्च अदालत फैसला, सर्वोच्च आदेश, विनियमावली",
    ai_does:    "AI कानूनी भाषा सरल बनाउँछ, नागरिक अधिकारहरू निकाल्छ, र संविधानको Fundamental Rights सँग तुलना गर्छ",
    depends_on: "Constitution Tree को Rights branches, जनता Legal Aid layer, र भविष्यको Citizen Rights tracker",
  },
  finance: {
    np:         "आर्थिक / बजेट",
    desc:       "बजेट, आर्थिक प्रतिवेदन, वित्तीय तथ्याङ्क, लेखापरीक्षण — सार्वजनिक खर्च र नीति",
    examples:   "वार्षिक बजेट भाषण, NRB monetary policy, EPF/SSF विवरण, CIAA लेखापरीक्षण प्रतिवेदन",
    ai_does:    "AI बजेट allocation निकाल्छ, नागरिकमाथि पर्ने प्रभाव विश्लेषण गर्छ, र Constitution को राज्यको दायित्व सँग तुलना गर्छ",
    depends_on: "Constitution Tree को Economic Rights nodes, जनता Budget Tracker, र भविष्यको Public Finance monitor",
  },
  content: {
    np:         "सामग्री / Content",
    desc:       "जनचेतना सामग्री, script, outreach draft — नागरिक संचार सम्बन्धी",
    examples:   "जनजागरण script, social post draft, campaign content, IEC materials",
    ai_does:    "AI यो content को civic accuracy जाँच्छ, सम्बन्धित government documents सँग जोड्छ, र facts verify गर्छ",
    depends_on: "Content Queue system, जनता public feed, र भविष्यको Civic Fact-checker",
  },
  intelligence: {
    np:         "सूचना / Intelligence",
    desc:       "समाचार, सरकारी सूचना, परिपत्र, नीति संकेत — real-time civic signals",
    examples:   "सरकारी परिपत्र, press release, GoN notice, संसद समाचार, news analysis",
    ai_does:    "AI यो signal बाट नागरिकमाथि तत्काल प्रभाव निकाल्छ, Constitution branches मा update गर्छ, र trend detect गर्छ",
    depends_on: "जनता Timeline को real-time layer, Constitution Tree को Living Update system, र भविष्यको Alert engine",
  },
  other: {
    np:         "अन्य",
    desc:       "माथिका कुनैमा नपर्ने सार्वजनिक महत्त्वका कागजपत्र",
    examples:   "अन्य सरकारी वा सार्वजनिक महत्त्वका documents जुन specific category मा नपर्ने",
    ai_does:    "AI document को प्रकृति बुझेर सबैभन्दा उपयुक्त Constitution branch खोज्छ र automatically categorise गर्ने सुझाव दिन्छ",
    depends_on: "AI Auto-classification system र भविष्यको Smart Categorisation engine",
  },
};

// Upload flow steps — always visible, teaches the civic journey
const FLOW_STEPS = [
  { icon: "📄", label: "Upload" },
  { icon: "🤖", label: "AI Extract" },
  { icon: "🌳", label: "Constitution Map" },
  { icon: "⚡", label: "Intelligence" },
  { icon: "🌐", label: "जनताले सिक्छन्" },
];

function UploadFlowBar() {
  return (
    <div className="flex items-center gap-1 py-2">
      {FLOW_STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-base leading-none">{step.icon}</span>
            <span className="text-zinc-600 text-[9px] mt-0.5 text-center leading-tight truncate w-full">{step.label}</span>
          </div>
          {i < FLOW_STEPS.length - 1 && (
            <span className="text-zinc-700 text-xs shrink-0">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  tasks:           DocUploadTask[];
  onUpload:        (file: File, meta: UploadDocMeta) => void;
  onClear:         () => void;
  onClose:         () => void;
  onDismiss?:      (localId: string) => void;
  ownerId?:        string;
  initialGovFolder?:   GovFolder;
  initialTags?:        string;
  initialTitle?:       string;
  initialPartNumber?:  number;
}

// ── URL ingest result preview ─────────────────────────────────────────────────

interface IngestPreview {
  title:         string;
  summary:       string;
  credibility:   string;
  relevanceScore:number;
  detectedTopics:string[];
  aiInsights:    string[];
  contentIdeas:  string[];
  sourceType?:   string;
  sourceAuthority?: string;
}

function UrlIngestPanel({ ownerId, onClose }: { ownerId: string; onClose: () => void }) {
  const [url,       setUrl]       = useState("");
  const [source,    setSource]    = useState("");
  const [category,  setCategory]  = useState<DocCategory>("intelligence");
  const [fetching,  setFetching]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState<IngestPreview | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  const handleIngest = async () => {
    if (!url.trim() || !source.trim()) return;
    setFetching(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/ingest-url", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: url.trim(), sourceName: source.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string } & IngestPreview;
      if (!res.ok || data.error) {
        setError(data.error ?? "URL fetch गर्न सकिएन");
        return;
      }
      setPreview(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !ownerId) return;
    setSaving(true);
    try {
      await createIntelligenceDoc({
        ownerId,
        title:            preview.title || source,
        description:      preview.summary.slice(0, 200),
        fileName:         url,
        fileType:         "other",
        mimeType:         "text/html",
        fileSize:         0,
        storagePath:      url,
        downloadUrl:      url,
        folder:           "government-sources",
        tags:             preview.detectedTopics.slice(0, 5),
        category,
        processingStatus: "ai_ready",
        adminApprovalStatus: "pending_review",
        aiSummary:        preview.summary,
        aiKeyInsights:    preview.aiInsights,
        detectedTopics:   preview.detectedTopics,
        contentIdeas:     preview.contentIdeas,
        confidence:       preview.relevanceScore,
        sourceCredibility:preview.credibility as "high" | "medium" | "low" | "unverified",
        sourceType:       (preview.sourceType ?? "unknown") as "official" | "unofficial" | "research" | "unknown",
        sourceAuthority:  preview.sourceAuthority,
        sourceUrl:        url,
        language:         "English",
        aiProvider:       "anthropic-sonnet",
        aiRetryCount:     0,
        uploadedAt:       new Date().toISOString(),
        updatedAt:        new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const catInfo = CATEGORY_INFO[category as Cat] ?? null;

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-green-400 font-semibold">Intelligence Library मा save भयो</p>
        <p className="text-zinc-500 text-sm text-center">Admin review पर्खिरहेको छ। Documents page बाट AI analysis पुनः चलाउन सकिन्छ।</p>
        <button onClick={onClose} className="bg-green-500 hover:bg-green-400 text-black font-black px-6 py-2.5 rounded-xl text-sm">सम्पन्न</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="url"
          placeholder="https://nrb.org.np/... वा parliament.gov.np/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
        />
        <p className="text-zinc-600 text-xs px-1">NRB परिपत्र, संसद विधेयक, MoF सूचना, EPF/SSF pages, समाचार — सबै काम गर्छ</p>
        <input
          type="text"
          placeholder="स्रोतको नाम (जस्तै: Nepal Rastra Bank, संसद सचिवालय)"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
        />
        <p className="text-zinc-600 text-xs px-1">स्रोतको नाम AI को विश्वसनीयता मूल्याङ्कनमा प्रयोग हुन्छ</p>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as DocCategory)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          {(["intelligence", "research", "finance", "legal", "strategy", "content", "other"] as Cat[]).map(c => (
            <option key={c} value={c}>{CATEGORY_INFO[c].np} — {c}</option>
          ))}
        </select>
        {catInfo && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 space-y-1.5">
            <p className="text-cyan-400 text-xs font-bold">{catInfo.np}</p>
            <p className="text-zinc-300 text-xs">{catInfo.desc}</p>
            <p className="text-zinc-500 text-xs">🤖 {catInfo.ai_does}</p>
            <p className="text-zinc-600 text-xs">🌳 {catInfo.depends_on}</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>}

      {!preview ? (
        <button
          onClick={handleIngest}
          disabled={fetching || !url.trim() || !source.trim()}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
        >
          {fetching ? "Fetch + AI विश्लेषण हुँदैछ…" : "Fetch गरेर AI विश्लेषण गर्नुहोस् →"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-white font-semibold text-sm">{preview.title}</p>
            <p className="text-zinc-400 text-xs line-clamp-3">{preview.summary}</p>
            <div className="flex gap-2 flex-wrap">
              {preview.detectedTopics.slice(0, 4).map(t => (
                <span key={t} className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
            <p className="text-zinc-600 text-xs">
              सान्दर्भिकता: {Math.round(preview.relevanceScore * 100)}% · विश्वसनीयता: {preview.credibility}
              {preview.sourceAuthority && ` · ${preview.sourceAuthority}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving ? "Save हुँदैछ…" : "Library मा Save गर्नुहोस् →"}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              फेरि Fetch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload Action Intelligence ────────────────────────────────────────────────
// Teaches the founder exactly what happens when a document is uploaded.

function UploadActionIntel({ fileCount, category }: { fileCount: number; category: string }) {
  const uploadAction: ActionLearnData = {
    icon:  "📤",
    title: "Upload",
    color: "cyan",
    does:  `Document ZZC को Civic Intelligence Library मा store हुन्छ। File Cloudflare R2 storage मा जान्छ र Firestore मा metadata record बन्छ। यसपछि AI automatically document पढ्छ — तपाईंले केही गर्नु पर्दैन।`,
    creates: [
      `Cloudflare R2 → file permanently stored (storagePath, downloadUrl)`,
      `vault_intelligence_docs → नयाँ record (status: "pending_ai" → "ai_ready")`,
      `Record fields: title, category ("${category}"), ownerId, mimeType, fileSize, uploadedAt`,
      `Async AI job → Claude ले document पढेर extract गर्छ: summary, keyInsights, policyChanges, financialImplications`,
    ],
    flows: [
      `R2 → Cloudflare Worker → AI extraction (Claude claude-sonnet-4-6)`,
      `AI output → vault_intelligence_docs update: aiSummary, aiKeyInsights[], policyChanges[], financialImplications[]`,
      `processingStatus: "pending_ai" → "ai_ready" भएपछि Admin Vault मा appear`,
      `Admin review (/vault/admin) → Approve → vault_civic_atoms harvest`,
    ],
    future: [
      "Auto-categorization: AI ले category automatically suggest गर्छ",
      "Duplicate detection: same document दोहोर्याएर upload गर्न नदिने",
      "Document versioning: updated policy documents को v1→v2 chain",
      "Cross-document atom linking: same topic, different documents बीच auto-link",
    ],
    example: fileCount > 0
      ? `${fileCount} file${fileCount > 1 ? "s" : ""} upload हुँदैछ — "${category}" category मा। AI ले 30 seconds देखि 2 minutes भित्र process गर्छ।`
      : `File छान्नुहोस् — त्यसपछि यहाँ real-time status देखाउँछ।`,
  };

  return <ActionLearnCard actions={[uploadAction]} />;
}

export function DocumentUploadModal({ tasks, onUpload, onClear, onClose, onDismiss, ownerId, initialGovFolder, initialTags, initialTitle, initialPartNumber }: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [tab,      setTab]     = useState<"file" | "url">("file");
  const [dragging, setDragging] = useState(false);
  const [staged,   setStaged]   = useState<File[]>([]);
  const [meta, setMeta] = useState<UploadDocMeta>({
    title:              initialTitle ?? "",
    description:        "",
    category:           "strategy",
    folder:             "",
    tags:               initialTags ?? "",
    govFolder:          initialGovFolder,
    constitutionalParts: initialPartNumber ? [initialPartNumber] : undefined,
  });

  const addFiles = (files: File[]) => {
    const valid = files.filter(f => ALLOWED_MIME.includes(f.type));
    setStaged(prev => [...prev, ...valid]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleUploadAll = () => {
    staged.forEach(file => {
      onUpload(file, {
        ...meta,
        title: meta.title || file.name.replace(/\.[^.]+$/, ""),
      });
    });
    setStaged([]);
  };

  const anyActive       = tasks.some(t => t.status === "uploading" || t.status === "creating");
  const anyError        = tasks.some(t => t.status === "error");
  const allSucceeded    = tasks.length > 0 && tasks.every(t => t.status === "done");
  const allSettled      = tasks.length > 0 && !anyActive;
  const successCount    = tasks.filter(t => t.status === "done").length;
  const errorCount      = tasks.filter(t => t.status === "error").length;

  const selectedCatInfo = CATEGORY_INFO[meta.category as Cat] ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg flex flex-col gap-4 p-6 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-white font-black text-lg leading-tight">नागरिक Intelligence Library मा थप्नुहोस्</h2>
            <p className="text-zinc-500 text-xs mt-0.5">तपाईंको document AI ले पढ्छ र नेपालको संविधानसँग जोड्छ</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none shrink-0 mt-0.5">×</button>
        </div>

        {/* Civic learning flow — always visible */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl px-3 py-2">
          <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wide mb-1.5">Upload पछि के हुन्छ?</p>
          <UploadFlowBar />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setTab("file")}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors ${tab === "file" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            📄 File Upload
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors ${tab === "url" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            🔗 URL थप्नुहोस्
          </button>
        </div>

        {/* URL ingestion panel */}
        {tab === "url" && ownerId && (
          <UrlIngestPanel ownerId={ownerId} onClose={onClose} />
        )}
        {tab === "url" && !ownerId && (
          <p className="text-zinc-500 text-sm text-center py-4">Authentication आवश्यक छ</p>
        )}

        {/* File upload tab */}
        {tab === "file" && (
        <>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors ${
            dragging ? "border-green-500 bg-green-950/20" : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME.join(",")}
            className="hidden"
            onChange={e => addFiles(Array.from(e.target.files ?? []))}
          />
          <p className="text-zinc-400 text-sm">यहाँ file drag गर्नुहोस् वा click गरेर छान्नुहोस्</p>
          <p className="text-zinc-600 text-xs mt-1">PDF, DOCX, TXT, MD, Images — जुनसुकै सरकारी document</p>
          {staged.length > 0 && (
            <p className="text-green-400 text-xs mt-2 font-semibold">{staged.length} file{staged.length > 1 ? "s" : ""} तयार छ</p>
          )}
        </div>

        {/* Staged file list */}
        {staged.length > 0 && (
          <ul className="space-y-1 max-h-20 overflow-y-auto">
            {staged.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg">
                <span className="truncate">{f.name}</span>
                <button onClick={() => setStaged(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 ml-2 shrink-0">×</button>
              </li>
            ))}
          </ul>
        )}

        {/* Metadata form */}
        <div className="space-y-3">

          {/* Title */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="शीर्षक (optional — filename बाट लिन्छ)"
              value={meta.title}
              onChange={e => setMeta(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-zinc-600 text-xs px-1">AI यो नाम प्रयोग गरी document पहिचान गर्छ — official नाम राख्नुहोस् (जस्तै: राष्ट्रिय शिक्षा नीति २०७६)</p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="छोटो विवरण (optional)"
              value={meta.description}
              onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-zinc-600 text-xs px-1">AI लाई context दिन्छ — document किन महत्त्वपूर्ण छ, कुन सरकारी निकायको हो, कुन वर्षको हो</p>
          </div>

          {/* Category — full civic explanation */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-semibold px-1">विषय वर्ग छान्नुहोस्</label>
            <select
              value={meta.category}
              onChange={e => setMeta(p => ({ ...p, category: e.target.value as typeof meta.category }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_INFO[c].np} — {c}</option>
              ))}
            </select>
            {selectedCatInfo && (
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl px-3 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-xs font-black">{selectedCatInfo.np}</span>
                  <span className="text-zinc-700 text-xs">—</span>
                  <span className="text-zinc-400 text-xs">{selectedCatInfo.desc}</span>
                </div>
                <div className="bg-zinc-800/50 rounded-lg px-2.5 py-2 space-y-1.5">
                  <p className="text-zinc-400 text-xs"><span className="text-violet-400 font-semibold">🤖 AI ले के गर्छ:</span> {selectedCatInfo.ai_does}</p>
                  <p className="text-zinc-500 text-xs"><span className="text-amber-500 font-semibold">🌳 कुन system प्रयोग गर्छ:</span> {selectedCatInfo.depends_on}</p>
                </div>
                <p className="text-zinc-600 text-xs">उदाहरण: {selectedCatInfo.examples}</p>
              </div>
            )}
          </div>

          {/* Civic Library Folder — govFolder */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-semibold px-1">Civic Library फोल्डर</label>
            <select
              value={meta.govFolder ?? ""}
              onChange={e => setMeta(p => ({ ...p, govFolder: (e.target.value as GovFolder) || undefined }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="">— फोल्डर छान्नुहोस् (optional) —</option>
              {(Object.keys(GOV_FOLDER_META) as GovFolder[]).map(k => {
                const m = GOV_FOLDER_META[k];
                return <option key={k} value={k}>{m.icon} {m.np}</option>;
              })}
            </select>
            {meta.govFolder && (
              <p className="text-zinc-600 text-xs px-1">{GOV_FOLDER_META[meta.govFolder].desc}</p>
            )}
            {meta.govFolder && (
              <div className="mt-2">
                <OfficialSourceLinks
                  compact
                  govFolder={meta.govFolder}
                  tags={meta.tags ? meta.tags.split(",").map(t => t.trim()).filter(Boolean) : []}
                />
              </div>
            )}
          </div>

          {/* Tags — AI relationship signal explanation */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Tags — शिक्षा, स्वास्थ्य, बजेट, महिला अधिकार…"
              value={meta.tags}
              onChange={e => setMeta(p => ({ ...p, tags: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-zinc-600 text-xs px-1">
              Tags = AI को relationship signal — यी keywords ले यो document लाई अरू documents र Constitution branches सँग जोड्छ।
              राम्रा tags भएमा AI ले civic gap र cross-tree patterns राम्रो detect गर्छ।
            </p>
          </div>

          {/* Folder */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="फोल्डर (optional) — जस्तै: शिक्षा-मन्त्रालय, NRB"
              value={meta.folder}
              onChange={e => setMeta(p => ({ ...p, folder: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-zinc-600 text-xs px-1">Documents लाई organise गर्न — मन्त्रालय वा विषय क्षेत्रको नाम राख्नुहोस्</p>
          </div>
        </div>

        {/* Upload tasks */}
        {tasks.length > 0 && (
          <ul className="space-y-2 max-h-36 overflow-y-auto">
            {tasks.map(task => (
              <li key={task.localId}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400 truncate">{task.fileName}</span>
                  <span className={
                    task.status === "done"     ? "text-green-400" :
                    task.status === "error"    ? "text-red-400"   :
                    task.status === "creating" ? "text-amber-400" :
                                                 "text-zinc-500"
                  }>
                    {task.status === "uploading" ? `${task.progress}%` : task.status}
                  </span>
                </div>
                {task.status === "uploading" && (
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.error && (
                  <div className="mt-1 bg-red-950/60 border border-red-900/70 rounded-lg px-3 py-2 text-xs">
                    <p className="text-red-400 font-medium">{task.error}</p>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(task.localId)}
                        className="mt-1.5 text-red-500 hover:text-red-300 underline"
                      >
                        हटाउनुहोस्
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Error summary banner */}
        {allSettled && anyError && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3 space-y-2">
            <p className="text-red-400 text-sm font-semibold">
              {errorCount === tasks.length
                ? `Upload असफल — ${errorCount} file${errorCount > 1 ? "s" : ""} save हुन सकेन`
                : `${successCount} save भयो · ${errorCount} असफल`}
            </p>
            <p className="text-red-300/70 text-xs">
              असफल files save भएन। Storage जाँच गर्न{" "}
              <Link href="/vault/system" className="underline hover:text-red-200" onClick={onClose}>
                System Status
              </Link>{" "}
              हेर्नुहोस्, त्यसपछि error dismiss गरेर फेरि try गर्नुहोस्।
            </p>
          </div>
        )}

        {/* ── Upload Action Intelligence ─────────────────────────────────── */}
        <UploadActionIntel fileCount={staged.length} category={meta.category} />

        {/* Footer */}
        <div className="flex gap-3">
          {allSucceeded ? (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              सम्पन्न — {successCount} save भयो
            </button>
          ) : allSettled && anyError ? (
            <>
              {successCount > 0 && (
                <button
                  onClick={onClear}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {successCount} save राख्नुहोस्, errors हटाउनुहोस्
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                बन्द गर्नुहोस् (files save भएन)
              </button>
            </>
          ) : (
            <button
              onClick={handleUploadAll}
              disabled={staged.length === 0 || anyActive}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              {anyActive ? "Upload हुँदैछ…" : staged.length > 0 ? `${staged.length} file${staged.length > 1 ? "s" : ""} Upload गर्नुहोस्` : "Upload गर्नुहोस्"}
            </button>
          )}
          {!allSettled && (
            <button
              onClick={onClose}
              className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              रद्द
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
