"use client";

import { useState, useMemo } from "react";
import { doc, getDoc }      from "firebase/firestore";
import { db }               from "../../firebase";
import { VaultShell }       from "../../../components/vault/VaultShell";
import { useVaultAuth }     from "../../../hooks/vault/useVaultAuth";
import { useMediaAtoms }    from "../../../hooks/vault/useMediaAtoms";
import type { MediaAtom, MediaAtomStatus, MediaAtomType, MediaAtomTone, MediaAtomAudience } from "../../../lib/types/media-atoms";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MediaAtomStatus, { np: string; color: string }> = {
  draft:        { np: "Draft",         color: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  script_ready: { np: "Script तयार",  color: "text-amber-400 bg-amber-950 border-amber-800" },
  approved:     { np: "स्वीकृत",      color: "text-green-400 bg-green-950 border-green-800" },
  published:    { np: "प्रकाशित",     color: "text-blue-400 bg-blue-950 border-blue-800"  },
};

const TONE_LABELS: Record<MediaAtomTone, { np: string; icon: string }> = {
  informative: { np: "जानकारी",   icon: "📘" },
  urgent:      { np: "तत्काल",    icon: "🔴" },
  hopeful:     { np: "आशाजनक",   icon: "🌱" },
  critical:    { np: "समालोचनात्मक", icon: "⚠️" },
};

const TYPE_LABELS: Record<MediaAtomType, string> = {
  short:     "Short",
  reel:      "Reel",
  explainer: "Explainer",
  scene:     "Scene",
};

const AUDIENCE_LABELS: Record<MediaAtomAudience, string> = {
  general: "सामान्य",
  youth:   "युवा",
  rural:   "ग्रामीण",
  urban:   "सहरी",
};

// ── External tool links ────────────────────────────────────────────────────

const EXTERNAL_TOOLS = [
  { name: "Ideogram",   url: "https://ideogram.ai",    icon: "🖼", label: "Visual बनाउनुहोस्" },
  { name: "Runway",     url: "https://runwayml.com",   icon: "🎬", label: "Video बनाउनुहोस्" },
  { name: "ElevenLabs", url: "https://elevenlabs.io",  icon: "🎙", label: "Voice बनाउनुहोस्" },
  { name: "CapCut",     url: "https://capcut.com",     icon: "✂️", label: "Edit गर्नुहोस्"    },
];

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MediaAtomStatus }) {
  const s = STATUS_LABELS[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.np}
    </span>
  );
}

// ── Script detail panel ─────────────────────────────────────────────────────

type ScriptTab = "script" | "narration" | "visual" | "caption";

function AtomDetailPanel({
  atom,
  onApprove,
  onPublish,
  onDelete,
  onClose,
}: {
  atom:      MediaAtom;
  onApprove: () => void;
  onPublish: () => void;
  onDelete:  () => void;
  onClose:   () => void;
}) {
  const [activeTab, setActiveTab] = useState<ScriptTab>("script");
  const [copied,    setCopied]    = useState<ScriptTab | null>(null);

  function copy(tab: ScriptTab, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tab);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const tabContent: Record<ScriptTab, { label: string; value: string; hint: string }> = {
    script:    { label: "Script",     value: atom.scriptNepali,   hint: "TikTok/Reel को लागि Nepali script — 60–150 words" },
    narration: { label: "Narration",  value: atom.narrationText,  hint: "TTS को लागि clean version — ElevenLabs मा paste गर्नुहोस्" },
    visual:    { label: "Visual Prompt", value: atom.visualPrompt, hint: "AI image generator को लागि — Ideogram वा Runway मा paste गर्नुहोस्" },
    caption:   { label: "Caption",    value: atom.captionText,    hint: "Social media caption — copy गरेर paste गर्नुहोस्" },
  };

  const sourceLabel = atom.sourceCollection === "constitutional_framework"
    ? `📜 ${atom.linkedArticle ?? "Constitution"}`
    : `🧠 ${atom.linkedTopic ?? "Intelligence Record"}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl flex flex-col gap-4 p-6 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={atom.status} />
              <span className="text-zinc-500 text-xs">{TYPE_LABELS[atom.mediaType]} · {TONE_LABELS[atom.emotionalTone].icon} {TONE_LABELS[atom.emotionalTone].np}</span>
            </div>
            <p className="text-white font-bold">{sourceLabel}</p>
            {atom.linkedBranch ? (
              <p className="text-zinc-500 text-xs">भाग {atom.linkedBranch} · {AUDIENCE_LABELS[atom.targetAudience]}</p>
            ) : (
              <p className="text-zinc-500 text-xs">{AUDIENCE_LABELS[atom.targetAudience]}</p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl shrink-0">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
          {(["script", "narration", "visual", "caption"] as ScriptTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                activeTab === tab ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              {tabContent[tab].label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <p className="text-zinc-600 text-xs px-1">{tabContent[activeTab].hint}</p>
          <div className="relative">
            <pre className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed min-h-[120px]">
              {tabContent[activeTab].value || <span className="text-zinc-700">— खाली छ —</span>}
            </pre>
            {tabContent[activeTab].value && (
              <button
                onClick={() => copy(activeTab, tabContent[activeTab].value)}
                className="absolute top-2 right-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied === activeTab ? "✓ Copy भयो" : "Copy"}
              </button>
            )}
          </div>
        </div>

        {/* External tools */}
        {(activeTab === "visual" || activeTab === "narration") && (
          <div className="space-y-2">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">External Tools मा खोल्नुहोस्</p>
            <div className="flex gap-2 flex-wrap">
              {EXTERNAL_TOOLS.filter(t =>
                activeTab === "visual"    ? ["Ideogram", "Runway"].includes(t.name) :
                activeTab === "narration" ? ["ElevenLabs", "CapCut"].includes(t.name) : false
              ).map(tool => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl transition-colors"
                >
                  <span>{tool.icon}</span>
                  <span>{tool.name}</span>
                  <span className="text-zinc-600">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Source refs */}
        {atom.sourceRefs.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 space-y-1">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">Source References</p>
            <ul className="space-y-0.5">
              {atom.sourceRefs.map((ref, i) => (
                <li key={i} className="text-zinc-500 text-xs truncate">{ref}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action bar */}
        <div className="flex gap-2 flex-wrap">
          {atom.status === "script_ready" && (
            <button
              onClick={onApprove}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              ✓ स्वीकृत गर्नुहोस्
            </button>
          )}
          {atom.status === "approved" && (
            <button
              onClick={onPublish}
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              🌐 Published मार्क गर्नुहोस्
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-4 bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-900 text-zinc-500 hover:text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            हटाउनुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate new atom form ──────────────────────────────────────────────────

function GenerateAtomPanel({ ownerId, onCreated }: { ownerId: string; onCreated: (atom: MediaAtom) => void }) {
  const [sourceCollection, setSourceCollection] = useState<"constitutional_framework" | "janta_intelligence">("constitutional_framework");
  const [sourceAtomId,  setSourceAtomId]  = useState("");
  const [linkedArticle, setLinkedArticle] = useState("");
  const [linkedBranch,  setLinkedBranch]  = useState("");
  const [mediaType,     setMediaType]     = useState<MediaAtomType>("reel");
  const [tone,          setTone]          = useState<MediaAtomTone>("informative");
  const [audience,      setAudience]      = useState<MediaAtomAudience>("general");
  const [generating,    setGenerating]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  async function handleGenerate() {
    const atomId = sourceAtomId.trim();
    if (!atomId) return;
    setGenerating(true);
    setError(null);
    try {
      // Fetch source atom text from Firestore before calling the AI function
      const snap = await getDoc(doc(db, sourceCollection, atomId));
      if (!snap.exists()) {
        setError(`Source atom "${atomId}" फेला परेन — ID ठीक छ?`);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      // Extract the most relevant text field from the source atom
      const sourceText = (
        (data.originalText as string) ??
        (data.plainNepaliSummary as string) ??
        (data.summaryNepali as string) ??
        (data.aiSummary as string) ??
        (data.description as string) ??
        ""
      );
      const sourceTitle = (
        (data.articleTitle as string) ??
        (data.title as string) ??
        (data.topic as string) ??
        atomId
      );

      if (!sourceText) {
        setError("Source atom मा text content फेला परेन");
        return;
      }

      const res = await fetch("/api/generate-media-script", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ownerId,
          sourceCollection,
          sourceAtomId:  atomId,
          sourceText,
          sourceTitle,
          linkedArticle: linkedArticle.trim() || undefined,
          linkedBranch:  linkedBranch ? parseInt(linkedBranch) : undefined,
          mediaType,
          emotionalTone:  tone,
          targetAudience: audience,
        }),
      });
      const result = await res.json() as { ok?: boolean; atom?: MediaAtom; error?: string };
      if (!res.ok || result.error) {
        setError(result.error ?? "Script generate हुन सकेन");
        return;
      }
      if (result.atom) onCreated(result.atom);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="space-y-0.5">
        <p className="text-white font-bold text-sm">नयाँ Media Atom Generate गर्नुहोस्</p>
        <p className="text-zinc-500 text-xs">Source atom छान्नुहोस् → AI ले Nepali script, narration, visual prompt र caption बनाउँछ</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setSourceCollection("constitutional_framework")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${sourceCollection === "constitutional_framework" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            📜 Constitution
          </button>
          <button
            onClick={() => setSourceCollection("janta_intelligence")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${sourceCollection === "janta_intelligence" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            🧠 Janta Intelligence
          </button>
        </div>

        <input
          type="text"
          placeholder="Source atom Firestore ID (e.g. abc123xyz)"
          value={sourceAtomId}
          onChange={e => setSourceAtomId(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Article / Topic (जस्तै: धारा ३१)"
            value={linkedArticle}
            onChange={e => setLinkedArticle(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <input
            type="number"
            placeholder="Part #"
            value={linkedBranch}
            onChange={e => setLinkedBranch(e.target.value)}
            className="w-24 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={mediaType}
            onChange={e => setMediaType(e.target.value as MediaAtomType)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="reel">Reel</option>
            <option value="short">Short</option>
            <option value="explainer">Explainer</option>
            <option value="scene">Scene</option>
          </select>
          <select
            value={tone}
            onChange={e => setTone(e.target.value as MediaAtomTone)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="informative">📘 जानकारी</option>
            <option value="hopeful">🌱 आशाजनक</option>
            <option value="urgent">🔴 तत्काल</option>
            <option value="critical">⚠️ समालोचनात्मक</option>
          </select>
          <select
            value={audience}
            onChange={e => setAudience(e.target.value as MediaAtomAudience)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="general">सामान्य</option>
            <option value="youth">युवा</option>
            <option value="rural">ग्रामीण</option>
            <option value="urban">सहरी</option>
          </select>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !sourceAtomId.trim()}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
        >
          {generating ? "AI Script Generate हुँदैछ…" : "Script Generate गर्नुहोस् (1 Gemini Flash call)"}
        </button>
        <p className="text-zinc-700 text-xs text-center">AI ले script, narration, visual prompt र caption एकैपटक बनाउँछ। Video generation हुँदैन — तपाईंले Approve गरेपछि मात्र external tool मा export गर्ने हो।</p>
      </div>
    </div>
  );
}

// ── Atom list item ──────────────────────────────────────────────────────────

function AtomRow({ atom, onClick }: { atom: MediaAtom; onClick: () => void }) {
  const sourceLabel = atom.sourceCollection === "constitutional_framework"
    ? atom.linkedArticle ?? "Constitution"
    : atom.linkedTopic ?? "Intelligence";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-colors space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {atom.sourceCollection === "constitutional_framework" ? "📜" : "🧠"} {sourceLabel}
          </p>
          <p className="text-zinc-500 text-xs">
            {TYPE_LABELS[atom.mediaType]} · {TONE_LABELS[atom.emotionalTone].icon} {TONE_LABELS[atom.emotionalTone].np} · {AUDIENCE_LABELS[atom.targetAudience]}
          </p>
        </div>
        <StatusBadge status={atom.status} />
      </div>
      {atom.scriptNepali && (
        <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">{atom.scriptNepali}</p>
      )}
      <p className="text-zinc-700 text-xs">{new Date(atom.createdAt).toLocaleDateString("ne-NP")}</p>
    </button>
  );
}

// ── Main workspace ──────────────────────────────────────────────────────────

function MediaWorkspaceInner() {
  const { user }                            = useVaultAuth();
  const { atoms, loading, createAtom, updateAtom, deleteAtom } = useMediaAtoms(user?.uid ?? null);

  const [selectedAtom, setSelectedAtom]   = useState<MediaAtom | null>(null);
  const [statusFilter, setStatusFilter]   = useState<MediaAtomStatus | "all">("all");
  const [showGenerate, setShowGenerate]   = useState(false);
  const [deleteGuard,  setDeleteGuard]    = useState<MediaAtom | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return atoms;
    return atoms.filter(a => a.status === statusFilter);
  }, [atoms, statusFilter]);

  const counts = useMemo(() => ({
    all:          atoms.length,
    draft:        atoms.filter(a => a.status === "draft").length,
    script_ready: atoms.filter(a => a.status === "script_ready").length,
    approved:     atoms.filter(a => a.status === "approved").length,
    published:    atoms.filter(a => a.status === "published").length,
  }), [atoms]);

  async function handleApprove(atom: MediaAtom) {
    if (!atom.id) return;
    await updateAtom(atom.id, { status: "approved", approvedAt: new Date().toISOString() });
    setSelectedAtom(prev => prev && prev.id === atom.id ? { ...prev, status: "approved" } : prev);
  }

  async function handlePublish(atom: MediaAtom) {
    if (!atom.id) return;
    await updateAtom(atom.id, { status: "published", publishedAt: new Date().toISOString() });
    setSelectedAtom(prev => prev && prev.id === atom.id ? { ...prev, status: "published" } : prev);
  }

  async function handleDelete(atom: MediaAtom) {
    if (!atom.id) return;
    await deleteAtom(atom.id);
    setSelectedAtom(null);
    setDeleteGuard(null);
  }

  async function handleAtomCreated(atom: MediaAtom) {
    setShowGenerate(false);
    const id = await createAtom(atom);
    setSelectedAtom({ ...atom, id });
  }

  const FILTER_TABS: Array<{ key: MediaAtomStatus | "all"; label: string }> = [
    { key: "all",          label: `सबै (${counts.all})` },
    { key: "script_ready", label: `Script तयार (${counts.script_ready})` },
    { key: "approved",     label: `स्वीकृत (${counts.approved})` },
    { key: "published",    label: `प्रकाशित (${counts.published})` },
    { key: "draft",        label: `Draft (${counts.draft})` },
  ];

  return (
    <VaultShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-white font-black text-2xl">🎬 Media Workspace</h1>
              <p className="text-zinc-500 text-sm mt-0.5">नागरिक Intelligence → Publication Pipeline</p>
            </div>
            <button
              onClick={() => setShowGenerate(p => !p)}
              className="bg-green-500 hover:bg-green-400 text-black font-black px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
            >
              + Generate
            </button>
          </div>

          {/* ONE brain principle note */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5">
            <p className="text-zinc-500 text-xs">
              <span className="text-green-400 font-semibold">ONE Brain Principle:</span> Media atoms ले intelligence store गर्दैन — Constitutional Framework र Janta Intelligence मा reference मात्र गर्छ।
              External tools (Ideogram, Runway, ElevenLabs) ले visual/voice/video बनाउँछन् — ZZC ले script र approval manage गर्छ।
            </p>
          </div>
        </div>

        {/* Generate panel */}
        {showGenerate && user?.uid && (
          <GenerateAtomPanel ownerId={user.uid} onCreated={handleAtomCreated} />
        )}

        {/* External tools quick access */}
        <div className="space-y-2">
          <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">External Production Tools</p>
          <div className="flex gap-2 flex-wrap">
            {EXTERNAL_TOOLS.map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>{tool.icon}</span>
                <span>{tool.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Atom list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🎬</p>
            <p className="text-zinc-400 font-semibold">
              {statusFilter === "all" ? "कुनै media atom छैन" : `"${STATUS_LABELS[statusFilter as MediaAtomStatus]?.np}" status मा atom छैन`}
            </p>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto">
              {statusFilter === "all"
                ? 'Constitution वा Janta Intelligence बाट source atom छानेर "Generate" button थिच्नुहोस् — AI ले Nepali script बनाउँछ।'
                : "फिल्टर बदल्नुहोस् वा नयाँ atom generate गर्नुहोस्।"}
            </p>
            {statusFilter === "all" && (
              <button
                onClick={() => setShowGenerate(true)}
                className="bg-green-500 hover:bg-green-400 text-black font-black px-5 py-2 rounded-xl text-sm transition-colors"
              >
                + पहिलो atom बनाउनुहोस्
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(atom => (
              <AtomRow
                key={atom.id}
                atom={atom}
                onClick={() => setSelectedAtom(atom)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedAtom && (
        <AtomDetailPanel
          atom={selectedAtom}
          onApprove={() => handleApprove(selectedAtom)}
          onPublish={() => handlePublish(selectedAtom)}
          onDelete={() => setDeleteGuard(selectedAtom)}
          onClose={() => setSelectedAtom(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteGuard && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <p className="text-white font-bold">Atom हटाउने?</p>
            <p className="text-zinc-400 text-sm">यो media atom र यसको script, narration, visual prompt सबै हट्छ। Source atom (Constitution/Intelligence) सुरक्षित रहन्छ।</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteGuard)}
                className="flex-1 bg-red-900 hover:bg-red-800 text-white font-bold py-2 rounded-xl text-sm"
              >
                हो, हटाउनुहोस्
              </button>
              <button
                onClick={() => setDeleteGuard(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-sm"
              >
                रद्द
              </button>
            </div>
          </div>
        </div>
      )}
    </VaultShell>
  );
}

export default function MediaClient() {
  return <MediaWorkspaceInner />;
}
