"use client";

import { useState, useMemo, useEffect } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import { useDocumentUpload } from "../../../hooks/vault/useDocumentUpload";
import { deleteIntelligenceDoc, updateIntelligenceDoc, createQueueItem } from "../../../lib/vault/firestore";
import { aiCostAdapter } from "../../../lib/business/firestore";
import { collection, addDoc, getDocs, query, where, deleteDoc, Timestamp, deleteField, limit } from "firebase/firestore";
import { db } from "../../firebase";
import type { AIService } from "../../../lib/business/types";
import Link from "next/link";
import { useQueueItems } from "../../../hooks/vault/useQueueItems";
import { deleteStorageFile } from "../../../lib/vault/storage";
import { DocumentCard } from "../../../components/vault/documents/DocumentCard";
import { DocumentUploadModal } from "../../../components/vault/documents/DocumentUploadModal";
import { DocumentViewer } from "../../../components/vault/documents/DocumentViewer";
import { LearnBlock } from "../../../components/vault/LearnTip";
import { CivicIntelligencePipeline } from "../../../components/vault/CivicIntelligencePipeline";
import { useLearningMode } from "../../../contexts/LearningModeContext";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import type { QueueContentType, QueuePlatform } from "../../../lib/types/queue";

function inferContentType(idea: string): QueueContentType {
  const l = idea.toLowerCase();
  if (l.startsWith("youtube:"))   return "youtube-long";
  if (l.startsWith("short:") || l.startsWith("reel:"))   return "shorts";
  if (l.startsWith("post:") || l.startsWith("facebook:")) return "facebook-post";
  if (l.startsWith("carousel:"))  return "carousel";
  if (l.startsWith("explainer:")) return "explainer";
  return "other";
}

function inferPlatform(idea: string): QueuePlatform {
  const l = idea.toLowerCase();
  if (l.startsWith("youtube:"))  return "youtube";
  if (l.startsWith("short:") || l.startsWith("reel:") || l.startsWith("carousel:")) return "instagram";
  if (l.startsWith("post:") || l.startsWith("facebook:")) return "facebook";
  return "all";
}

const ALL_CATEGORIES = ["all", "research", "strategy", "legal", "finance", "content", "intelligence", "other"] as const;
type FilterCategory = typeof ALL_CATEGORIES[number];

const CAT_LABEL: Record<FilterCategory, { en: string; np: string }> = {
  all:          { en: "All",           np: "सबै"            },
  research:     { en: "Research",      np: "अनुसन्धान"      },
  strategy:     { en: "Strategy",      np: "रणनीति"         },
  legal:        { en: "Legal / Court", np: "कानूनी / अदालत" },
  finance:      { en: "Finance",       np: "आर्थिक / बजेट"  },
  content:      { en: "Content",       np: "सामग्री"        },
  intelligence: { en: "Intelligence",  np: "सूचना"          },
  other:        { en: "Other",         np: "अन्य"           },
};

// What to upload — civic document examples per category
const CAT_EXAMPLES: Partial<Record<FilterCategory, string[]>> = {
  finance:   ["बजेट", "NRB circular", "EPF/SSF report", "राजस्व नीति"],
  legal:     ["अदालत फैसला", "ऐन", "नियमावली", "संवैधानिक आदेश"],
  research:  ["आयोग प्रतिवेदन", "नीति अनुसन्धान", "सर्वेक्षण"],
  strategy:  ["राष्ट्रिय योजना", "विकास नीति", "सरकारी कार्यक्रम"],
};

export default function DocumentsClient() {
  const { on: learn } = useLearningMode();
  const { user } = useVaultAuth();
  const { docs, loading } = useIntelligenceDocs(user?.uid ?? null);
  const { tasks, uploadDoc, clearDone, dismissTask, summary } = useDocumentUpload(user?.uid ?? "");
  const { items: allQueueItems } = useQueueItems(user?.uid ?? null, "all");

  // Source traceability: map docId → count of queue items it generated
  const queueCountByDoc = useMemo(() => {
    const map: Record<string, number> = {};
    allQueueItems.forEach(item => {
      if (item.sourceDocId) {
        map[item.sourceDocId] = (map[item.sourceDocId] ?? 0) + 1;
      }
    });
    return map;
  }, [allQueueItems]);

  const [search,       setSearch]      = useState("");
  const [filter,       setFilter]      = useState<FilterCategory>("all");
  const [showUpload,    setShowUpload]   = useState(false);
  const [viewing,       setViewing]      = useState<IntelligenceDocument | null>(null);
  const [processingId,  setProcessingId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [bulkImageProgress, setBulkImageProgress] = useState<{ done: number; total: number } | null>(null);
  const [extractingPointsId, setExtractingPointsId] = useState<string | null>(null);
  const [pointCountByDoc, setPointCountByDoc] = useState<Record<string, number>>({});
  const [extractingPromisesId, setExtractingPromisesId] = useState<string | null>(null);
  const [promiseCountByDoc, setPromiseCountByDoc] = useState<Record<string, number>>({});
  const [extractingIntelId, setExtractingIntelId] = useState<string | null>(null);
  const [intelCountByDoc, setIntelCountByDoc] = useState<Record<string, number>>({});
  const [relCountByDoc, setRelCountByDoc] = useState<Record<string, number>>({});

  // Load persisted intel + relationship counts from Firestore on mount
  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(
      collection(db, "janta_intelligence"),
      where("ownerId", "==", user.uid),
      limit(2000),
    )).then(snap => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const docId = (d.data() as Record<string, unknown>).sourceDocId as string;
        if (docId) counts[docId] = (counts[docId] ?? 0) + 1;
      });
      setIntelCountByDoc(counts);
    }).catch(() => {});

    // Load constitutional_framework counts
    getDocs(query(
      collection(db, "constitutional_framework"),
      where("ownerId", "==", user.uid),
      limit(500),
    )).then(snap => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const docId = (d.data() as Record<string, unknown>).sourceDocId as string;
        if (docId) counts[docId] = (counts[docId] ?? 0) + 1;
      });
      setConstitutionCountByDoc(counts);
    }).catch(() => {});
  }, [user?.uid]);
  const [matchingIntelId, setMatchingIntelId] = useState<string | null>(null);
  const [extractingConstitutionId, setExtractingConstitutionId] = useState<string | null>(null);
  const [constitutionBatch,        setConstitutionBatch]        = useState<number>(0); // 1,2,3 = which batch running
  const [constitutionCountByDoc, setConstitutionCountByDoc]     = useState<Record<string, number>>({});
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [processError,        setProcessError]        = useState<string | null>(null);
  const [processErrorCode,    setProcessErrorCode]    = useState<string | null>(null);
  const [processErrorDetails, setProcessErrorDetails] = useState<string | null>(null);
  const [uploadToast,   setUploadToast]  = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Show a toast when a batch of uploads finishes — cleared after 5s
  useEffect(() => {
    if (!summary) return;
    const { successCount, errorCount } = summary;
    if (successCount > 0 && errorCount === 0) {
      setUploadToast({ type: "success", msg: `${successCount} document${successCount > 1 ? "s" : ""} uploaded successfully.` });
    } else if (errorCount > 0 && successCount === 0) {
      setUploadToast({ type: "error",   msg: `${errorCount} upload${errorCount > 1 ? "s" : ""} failed. See details in the upload panel.` });
    } else if (successCount > 0 && errorCount > 0) {
      setUploadToast({ type: "error",   msg: `${successCount} uploaded, ${errorCount} failed. See details in the upload panel.` });
    }
    const t = setTimeout(() => setUploadToast(null), 5_000);
    return () => clearTimeout(t);
  }, [summary]);

  const filtered = docs.filter(d => {
    if ((d as unknown as Record<string, unknown>).archived === true) return false; // hide archived
    const matchCat    = filter === "all" || d.category === filter;
    const q           = search.toLowerCase();
    const matchSearch = !q
      || d.title.toLowerCase().includes(q)
      || d.fileName.toLowerCase().includes(q)
      || d.tags.some(t => t.toLowerCase().includes(q))
      || d.detectedTopics?.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Reset a stuck doc (processing_ai with no active session) back to "ready" so it can be retried
  const handleResetStuck = async (doc: IntelligenceDocument) => {
    await updateIntelligenceDoc(doc.id, {
      processingStatus:  "ready",
      aiProcessingError: "Reset after stuck processing_ai state — retry when ready.",
    });
  };

  const handleDelete = async (doc: IntelligenceDocument) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await Promise.all([
      deleteIntelligenceDoc(doc.id),
      doc.storagePath ? deleteStorageFile(doc.storagePath).catch(() => {}) : Promise.resolve(),
    ]);
  };

  const handleProcess = async (doc: IntelligenceDocument) => {
    setProcessingId(doc.id);
    setProcessError(null);
    setProcessErrorCode(null);
    setProcessErrorDetails(null);

    await updateIntelligenceDoc(doc.id, { processingStatus: "processing_ai" });

    try {
      const res = await fetch("/api/process-document", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          docId:       doc.id,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType,
          fileName:    doc.fileName,
        }),
      });

      const data = await res.json() as {
        ok?:                    boolean;
        error?:                 string;
        code?:                  string;
        details?:               string;
        tried?:                 string[];
        provider?:              string;
        model?:                 string;
        retries?:               number;
        estInputTokens?:        number;
        estOutputTokens?:       number;
        estCostUSD?:            number;
        aiSummary?:             string;
        aiKeyInsights?:         string[];
        detectedTopics?:        string[];
        contentIdeas?:          string[];
        language?:              string;
        confidence?:            number;
        // Civic intelligence fields
        sourceType?:            string;
        sourceAuthority?:       string;
        affectedSectors?:       string[];
        policyChanges?:         string[];
        financialImplications?: string[];
        youthImpact?:           string;
        ssfEpfCitRelevance?:    string;
        nepaliExplainer?:       string;
      };

      if (!res.ok || data.error) {
        // Upload is always safe — only mark ai_paused, never error, for AI failures.
        // error codes: BILLING_EXHAUSTED | NO_PROVIDERS | AI_UNAVAILABLE | AI_PARSE_ERROR
        const aiPaused = ["BILLING_EXHAUSTED", "NO_PROVIDERS", "AI_UNAVAILABLE", "TIMEOUT"].includes(data.code ?? "");
        await updateIntelligenceDoc(doc.id, {
          processingStatus: aiPaused ? "ai_paused" : "ready",
          aiProcessingError: (data.error ?? "AI processing failed.").slice(0, 300),
        });
        setProcessErrorCode(data.code ?? null);
        setProcessErrorDetails(data.details ?? null);
        setProcessError(data.error ?? "Document uploaded. AI analysis temporarily unavailable.");
        return;
      }

      // AI complete — write intelligence + civic fields + provider attribution
      await updateIntelligenceDoc(doc.id, {
        processingStatus:     "ai_ready",
        adminApprovalStatus:  "pending_review",
        aiProvider:           data.provider,
        aiRetryCount:         data.retries ?? 0,
        aiProcessingError:    deleteField() as unknown as undefined,
        // Base AI fields
        aiSummary:            data.aiSummary,
        aiKeyInsights:        data.aiKeyInsights,
        detectedTopics:       data.detectedTopics,
        contentIdeas:         data.contentIdeas,
        language:             data.language,
        confidence:           data.confidence,
        // Civic intelligence fields
        sourceType:           data.sourceType as "official" | "unofficial" | "research" | "unknown" | undefined,
        sourceAuthority:      data.sourceAuthority,
        affectedSectors:      data.affectedSectors,
        policyChanges:        data.policyChanges,
        financialImplications:data.financialImplications,
        youthImpact:          data.youthImpact,
        ssfEpfCitRelevance:   data.ssfEpfCitRelevance,
        nepaliExplainer:      data.nepaliExplainer,
      });

      // Log AI cost to business_ai_costs (per-user BI) + vault_ai_usage (admin global log)
      const providerServiceMap: Record<string, AIService> = {
        "gemini-flash":    "google-ai",
        "bedrock-sonnet":  "aws-bedrock",
        "anthropic-sonnet":"anthropic",
      };
      if (data.provider && user?.uid) {
        const today = new Date().toISOString().slice(0, 10);
        // Per-user BI log
        aiCostAdapter.add(user.uid, {
          service:        providerServiceMap[data.provider] ?? "other",
          operation:      "analysis",
          model:          data.model ?? data.provider,
          inputTokens:    data.estInputTokens  ?? 0,
          outputTokens:   data.estOutputTokens ?? 0,
          costUSD:        data.estCostUSD ?? 0,
          relatedFeature: "/vault/documents",
          date:           today,
        }).catch(() => {});
        // Admin global log — vault_ai_usage
        addDoc(collection(db, "vault_ai_usage"), {
          provider:      data.provider,
          model:         data.model ?? data.provider,
          tokensIn:      data.estInputTokens  ?? 0,
          tokensOut:     data.estOutputTokens ?? 0,
          estimatedCost: data.estCostUSD ?? 0,
          documentId:    doc.id,
          userId:        user.uid,
          date:          today,
          status:        "success",
          createdAt:     Timestamp.now(),
        }).catch(() => {});
      }

    } catch (err) {
      // Network-level failure — document is safe, AI just didn't run.
      await updateIntelligenceDoc(doc.id, {
        processingStatus: "ready",
        aiProcessingError: `Network error: ${String(err)}`.slice(0, 200),
      });
      setProcessError(`Network error: ${String(err)}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Separate from handleProcess — only callable after admin approves the doc in Admin Vault.
  const handleGenerateQueueItems = async (doc: IntelligenceDocument) => {
    if (doc.adminApprovalStatus !== "approved") return;
    if (!doc.contentIdeas || doc.contentIdeas.length === 0) return;

    setProcessingId(doc.id);
    const ideas     = doc.contentIdeas;
    const insights  = doc.aiKeyInsights ?? [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await Promise.all(ideas.map(idea =>
        createQueueItem({
          ownerId:           user!.uid,
          aiTitle:           idea.replace(/^(YouTube|Short|Post|Reel|Carousel|Explainer):\s*/i, ""),
          contentType:       inferContentType(idea),
          platform:          inferPlatform(idea),
          sourceDocId:       doc.id,
          sourceDocTitle:    doc.title,
          sourceDocUrl:      doc.downloadUrl,
          sourceDocFileName: doc.fileName,
          sourceInsights:    insights,
          sourceUploadedAt:  doc.uploadedAt,
          confidence:        doc.confidence ?? 0.5,
          language:          doc.language ?? "English",
          status:            "pending",
          adminNotes:        "",
          expiresAt,
          createdAt:         new Date().toISOString(),
          updatedAt:         new Date().toISOString(),
        }),
      ));
    } finally {
      setProcessingId(null);
    }
  };

  const handleExtractPoints = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    setExtractingPointsId(doc.id);
    try {
      const res = await fetch("/api/extract-policy-points", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          docId:         doc.id,
          title:         doc.title,
          ocrText:       (doc as unknown as Record<string, unknown>).ocrText as string | undefined,
          aiSummary:     doc.aiSummary,
          aiKeyInsights: doc.aiKeyInsights,
          policyChanges: doc.policyChanges,
          ownerId:       user.uid,
        }),
      });
      const data = await res.json() as { ok: boolean; points?: Array<{
        pointNumber: number; title: string; simpleSummary: string;
        youthImpact: string; keyFact: string; sectors: string[];
      }>; error?: string };
      if (!data.ok || !data.points) throw new Error(data.error ?? "Extraction failed");

      // Delete any existing points for this doc (this user) before inserting fresh ones
      const existingSnap = await getDocs(
        query(collection(db, "vault_policy_points"),
          where("parentDocId", "==", doc.id),
          where("ownerId",     "==", user.uid),
        )
      );
      await Promise.all(existingSnap.docs.map(d => deleteDoc(d.ref)));

      const now = new Date().toISOString();
      await Promise.all(data.points.map(pt =>
        addDoc(collection(db, "vault_policy_points"), {
          parentDocId:    doc.id,
          parentDocTitle: doc.title,
          ownerId:        user.uid,
          pointNumber:    pt.pointNumber,
          title:          pt.title,
          simpleSummary:  pt.simpleSummary,
          youthImpact:    pt.youthImpact,
          keyFact:        pt.keyFact,
          sectors:        pt.sectors,
          publishToJanta: true,
          createdAt:      now,
        }),
      ));
      setPointCountByDoc(prev => ({ ...prev, [doc.id]: data.points!.length }));
    } catch (err) {
      alert(`Policy points निकाल्न सकिएन: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtractingPointsId(null);
    }
  };

  const handleGenerateImage = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    setGeneratingImageId(doc.id);
    try {
      const res = await fetch("/api/generate-hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:           doc.title,
          nepaliExplainer: doc.nepaliExplainer,
          affectedSectors: doc.affectedSectors,
          sourceAuthority: doc.sourceAuthority,
          aiKeyInsights:   doc.aiKeyInsights,
        }),
      });
      const data = await res.json() as { ok: boolean; heroImageUrl?: string; error?: string };
      if (!data.ok || !data.heroImageUrl) throw new Error(data.error ?? "Image generation failed");
      await updateIntelligenceDoc(doc.id, { heroImageUrl: data.heroImageUrl });
    } catch (err) {
      alert(`Hero image generate गर्न सकिएन: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGeneratingImageId(null);
    }
  };

  const handleBulkGenerateImages = async () => {
    const targets = docs.filter(d => d.adminApprovalStatus === "approved" && !d.heroImageUrl);
    if (targets.length === 0) return;
    setBulkImageProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      const doc = targets[i];
      setGeneratingImageId(doc.id);
      try {
        const res = await fetch("/api/generate-hero-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:           doc.title,
            nepaliExplainer: doc.nepaliExplainer,
            affectedSectors: doc.affectedSectors,
            sourceAuthority: doc.sourceAuthority,
            aiKeyInsights:   doc.aiKeyInsights,
          }),
        });
        const data = await res.json() as { ok: boolean; heroImageUrl?: string; error?: string };
        if (data.ok && data.heroImageUrl) {
          await updateIntelligenceDoc(doc.id, { heroImageUrl: data.heroImageUrl });
        }
      } catch { /* skip failed, continue */ }
      setBulkImageProgress({ done: i + 1, total: targets.length });
    }
    setGeneratingImageId(null);
    setBulkImageProgress(null);
  };

  const handleExtractPromises = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    setExtractingPromisesId(doc.id);
    try {
      const text = doc.aiSummary ?? doc.nepaliExplainer ?? "";
      if (!text) { alert("Document मा AI summary छैन — पहिले AI analyze गर्नुस्।"); return; }

      const res = await fetch("/api/extract-promises", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text:       text + "\n\n" + (doc.aiKeyInsights ?? []).join("\n"),
          docTitle:   doc.title,
          docType:    doc.detectedTopics?.[0] ?? "government document",
          sourceYear: new Date(doc.uploadedAt).getFullYear().toString(),
          ownerId:    user.uid,
          docId:      doc.id,
        }),
      });
      const data = await res.json() as { ok: boolean; promises?: unknown[]; error?: string };
      if (!data.ok || !data.promises) throw new Error(data.error ?? "Extraction failed");

      // Delete existing promises for this doc
      const existing = await getDocs(query(
        collection(db, "policy_promises"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", user.uid),
      ));
      await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));

      // Insert new promises
      const now = new Date().toISOString();
      const batch = (data.promises as Record<string, unknown>[]).map(p =>
        addDoc(collection(db, "policy_promises"), {
          ...p,
          ownerId:        user.uid,
          sourceDocId:    doc.id,
          sourceDocTitle: doc.title,
          status:         "promised",
          publishToJanta: true,
          createdAt:      now,
          updatedAt:      now,
        })
      );
      await Promise.all(batch);
      setPromiseCountByDoc(prev => ({ ...prev, [doc.id]: data.promises!.length }));
    } catch (err) {
      alert(`वाचाहरू निकाल्न सकिएन: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtractingPromisesId(null);
    }
  };

  const handleExtractIntelligence = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    setExtractingIntelId(doc.id);
    try {
      // Full OCR text is the authoritative source — fall back to AI fields if not available
      const fullText = (doc as unknown as Record<string, unknown>).ocrText as string | undefined;
      const text = fullText
        || [
            doc.aiSummary,
            ...(doc.aiKeyInsights ?? []),
            ...(doc.policyChanges ?? []),
            ...(doc.financialImplications ?? []),
            doc.nepaliExplainer,
          ].filter(Boolean).join("\n\n");

      if (!text) {
        alert("Document मा text छैन — पहिले AI analyze गर्नुस् त्यसपछि Deep Extract गर्नुस्।");
        return;
      }

      const res = await fetch("/api/extract-intelligence", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text:        text || undefined,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType,
          docTitle:    doc.title,
          docType:     doc.detectedTopics?.[0] ?? "government document",
          sourceYear:  new Date(doc.uploadedAt).getFullYear().toString(),
          ownerId:     user.uid,
          docId:       doc.id,
          domain:      doc.category === "finance" ? "finance" : "janta",
        }),
      });

      const data = await res.json() as {
        ok:          boolean;
        records?:    Record<string, unknown>[];
        totalFound?: number;
        chunkCount?: number;
        error?:      string;
        details?:    string;
      };
      if (!data.ok || !data.records) {
        const msg = [data.error ?? "Extraction failed", data.details].filter(Boolean).join(" — ");
        throw new Error(msg);
      }

      // Clear old intel for this doc
      const oldSnap = await getDocs(query(
        collection(db, "janta_intelligence"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", user.uid),
      ));
      await Promise.all(oldSnap.docs.map(d => deleteDoc(d.ref)));

      // Save all new records and collect IDs + data for matching
      const now    = new Date().toISOString();
      const domain = (data as { domain?: string }).domain ?? "janta";
      const savedRecords: Array<Record<string, unknown>> = [];
      const savePromises = data.records.map(r => {
        const record = {
          // defaults for fields the lean prompt omits
          summaryNepali:   "",
          measurable:      true,
          timeline:        null,
          budgetAmount:    null,
          geoScope:        "national",
          governmentLevel: "federal",
          tags:            [],
          affectedGroups:  [],
          affectedSectors: [],
          department:      null,
          traceability: {
            sourceQuote:         (r as Record<string,unknown>).sourceQuote ?? "",
            rawParagraph:        "",
            extractionReasoning: "",
          },
          // actual record fields override defaults
          ...r,
          domain,
          ownerId:              user.uid,
          sourceDocId:          doc.id,
          sourceDocTitle:       doc.title,
          implementationStatus: "announced",
          verificationStatus:   "ai_extracted",
          publishToJanta:       domain === "janta",
          published:            true,
          createdAt:            now,
          updatedAt:            now,
        };
        savedRecords.push(record);
        return addDoc(collection(db, "janta_intelligence"), record);
      });
      const savedRefs = await Promise.all(savePromises);

      // Attach Firestore IDs to saved records for matching
      const savedWithIds = savedRecords.map((r, i) => ({
        ...r,
        id: savedRefs[i].id,
      }));

      setIntelCountByDoc(prev => ({ ...prev, [doc.id]: savedWithIds.length }));

      // ── Step 2: Relationship Matching ────────────────────────────────────
      // Non-blocking — matching failure must not break extraction result
      setExtractingIntelId(null);
      setMatchingIntelId(doc.id);

      try {
        // Fetch recent intel records from other documents (candidates for matching)
        const candidateSnap = await getDocs(query(
          collection(db, "janta_intelligence"),
          where("ownerId", "==", user.uid),
          limit(60),
        ));
        const candidates = candidateSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
          .filter(r => r.sourceDocId !== doc.id)
          .slice(0, 40);

        if (candidates.length > 0 && savedWithIds.length > 0) {
          const matchRes = await fetch("/api/match-intelligence", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              newRecords:     savedWithIds.slice(0, 30),
              candidates:     candidates.slice(0, 40),
              sourceDocId:    doc.id,
              sourceDocTitle: doc.title,
              ownerId:        user.uid,
            }),
          });

          if (matchRes.ok) {
            const matchData = await matchRes.json() as {
              ok:              boolean;
              relationships?:  Array<{
                fromId: string; toId: string;
                fromTitle: string; toTitle: string;
                relationshipType: string; confidence: number; explanation: string;
              }>;
              totalMatched?: number;
            };

            if (matchData.ok && matchData.relationships?.length) {
              const rNow = new Date().toISOString();
              await Promise.all(matchData.relationships.map(rel =>
                addDoc(collection(db, "janta_relationships"), {
                  ...rel,
                  ownerId:            user.uid,
                  sourceDocIds:       [doc.id],
                  verificationStatus: "ai_matched",
                  createdAt:          rNow,
                  updatedAt:          rNow,
                })
              ));
              setRelCountByDoc(prev => ({
                ...prev,
                [doc.id]: matchData.relationships!.length,
              }));
            }
          }
        }
      } catch {
        // Matching is best-effort — extraction is already saved, never fail here
      } finally {
        setMatchingIntelId(null);
      }

      return; // already cleared extractingIntelId above
    } catch (err) {
      alert(`Intelligence extract गर्न सकिएन: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtractingIntelId(null);
      setMatchingIntelId(null);
    }
  };

  // ── Constitution Framework extraction — 11 batches by article number (28 articles each) ─
  // Batching by article number (not part number) ensures uniform output size per batch,
  // avoiding Cloudflare 30s timeout caused by dense parts like Parliament (Part 8, ~74 articles).
  const handleExtractConstitution = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    setExtractingConstitutionId(doc.id);

    const BATCHES = [
      { articleRange: "1-28",    label: "धारा १–२८"    },
      { articleRange: "29-56",   label: "धारा २९–५६"   },
      { articleRange: "57-84",   label: "धारा ५७–८४"   },
      { articleRange: "85-112",  label: "धारा ८५–११२"  },
      { articleRange: "113-140", label: "धारा ११३–१४०" },
      { articleRange: "141-168", label: "धारा १४१–१६८" },
      { articleRange: "169-196", label: "धारा १६९–१९६" },
      { articleRange: "197-224", label: "धारा १९७–२२४" },
      { articleRange: "225-252", label: "धारा २२५–२५२" },
      { articleRange: "253-280", label: "धारा २५३–२८०" },
      { articleRange: "281-308", label: "धारा २८१–३०८" },
    ];

    let totalSaved = 0;

    try {
      for (let i = 0; i < BATCHES.length; i++) {
        const batch = BATCHES[i];
        setConstitutionBatch(i + 1);

        let res: Response;
        try {
          res = await fetch("/api/extract-constitution", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              documentId:   doc.id,
              downloadUrl:  doc.downloadUrl,
              mimeType:     doc.mimeType ?? "application/pdf",
              docTitle:     doc.title,
              ownerId:      user.uid,
              articleRange: batch.articleRange,
            }),
          });
        } catch (fetchErr) {
          alert(`📜 ${batch.label} — Network error. ${totalSaved} records saved so far.\n${fetchErr}`);
          break;
        }

        // Guard against Cloudflare HTML timeout pages (504/524)
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          alert(`📜 ${batch.label} — Server timeout (Cloudflare 30s limit). ${totalSaved} records saved.\n\nRe-extract गर्दा यो batch automatically resume हुन्छ।`);
          break;
        }

        const data = await res.json() as Record<string, unknown>;
        if (!res.ok) {
          const msg = [data.error ?? "extraction failed", data.details].filter(Boolean).join(" — ");
          alert(`📜 ${batch.label} extract गर्न सकिएन: ${msg}\n\nपहिले ${totalSaved} records save भइसके।`);
          break;
        }

        const records = data.records as Record<string, unknown>[] | undefined;
        if (!records?.length) {
          // Empty batch is fine (some article ranges may not have content) — keep going
          continue;
        }

        const now = new Date().toISOString();
        await Promise.all(records.map(r =>
          addDoc(collection(db, "constitutional_framework"), {
            ...r, ownerId: user.uid, createdAt: r.createdAt ?? now, updatedAt: now,
          })
        ));

        totalSaved += records.length;
        setConstitutionCountByDoc(prev => ({ ...prev, [doc.id]: totalSaved }));
      }

      alert(`📜 संविधान extract सम्पन्न!\n\n${totalSaved} धाराहरू save भए`);
    } catch (err) {
      alert(`Constitution extract error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtractingConstitutionId(null);
      setConstitutionBatch(0);
    }
  };

  // ── Archive document (soft-delete + clean intel records) ────────────────────
  const handleArchive = async (doc: IntelligenceDocument) => {
    if (!user?.uid) return;
    const confirmed = window.confirm(
      `"${doc.title}" archive गर्ने?\n\nYo action le:\n• Document hide गर्छ (delete गर्दैन)\n• यसका सबै janta_intelligence records DELETE गर्छ\n• यसका सबै janta_relationships records DELETE गर्छ\n\nProceed?`
    );
    if (!confirmed) return;
    setArchivingId(doc.id);
    try {
      // 1. Delete janta_intelligence records for this doc
      const intelSnap = await getDocs(query(
        collection(db, "janta_intelligence"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", user.uid),
      ));
      await Promise.all(intelSnap.docs.map(d => deleteDoc(d.ref)));

      // 2. Delete janta_relationships records for this doc
      const relSnap = await getDocs(query(
        collection(db, "janta_relationships"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", user.uid),
      ));
      await Promise.all(relSnap.docs.map(d => deleteDoc(d.ref)));

      // 3. Delete constitutional_framework records for this doc
      const constSnap = await getDocs(query(
        collection(db, "constitutional_framework"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", user.uid),
      ));
      await Promise.all(constSnap.docs.map(d => deleteDoc(d.ref)));

      // 4. Mark vault document as archived (hides from grid)
      await updateIntelligenceDoc(doc.id, { archived: true } as Partial<IntelligenceDocument>);

      // Update local counts
      setIntelCountByDoc(prev => { const n = { ...prev }; delete n[doc.id]; return n; });
      setConstitutionCountByDoc(prev => { const n = { ...prev }; delete n[doc.id]; return n; });
    } catch (err) {
      alert(`Archive failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setArchivingId(null);
    }
  };

  const aiReadyCount    = docs.filter(d => d.processingStatus === "ai_ready").length;
  const readyCount      = docs.filter(d => d.processingStatus === "ready").length;
  const awaitingReview  = docs.filter(d =>
    d.processingStatus === "ai_ready" &&
    (d.adminApprovalStatus === "pending_review" || !d.adminApprovalStatus),
  ).length;
  const approvedDocs    = docs.filter(d => d.adminApprovalStatus === "approved").length;

  return (
    <>
      {showUpload && (
        <DocumentUploadModal
          tasks={tasks}
          onUpload={uploadDoc}
          onClear={clearDone}
          onDismiss={dismissTask}
          onClose={() => setShowUpload(false)}
          ownerId={user?.uid}
        />
      )}

      {viewing && (
        <DocumentViewer
          doc={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">📚</span>
              <h1 className="text-xl font-black text-white">नागरिक Intelligence Library</h1>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-lg">
              यहाँ सरकारी, आर्थिक, नीतिगत वा अनुसन्धान documents upload गरिन्छ।
              AI ले पढेर Constitution Tree मा जोड्छ — जनताले सिक्न पाउँछन्।
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
          >
            + Upload Document
          </button>
        </div>

        {/* Civic intelligence pipeline explainer */}
        <CivicIntelligencePipeline
          activeDocs={aiReadyCount}
          approvedDocs={approvedDocs}
          currentPage="documents"
        />

        {/* Upload toast */}
        {uploadToast && (
          <div className={`mb-4 border rounded-2xl px-5 py-3 flex items-center justify-between gap-4 transition-all ${
            uploadToast.type === "success"
              ? "bg-green-950 border-green-800"
              : "bg-red-950 border-red-800"
          }`}>
            <p className={`text-sm font-semibold ${uploadToast.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {uploadToast.msg}
            </p>
            <button onClick={() => setUploadToast(null)} className="text-zinc-500 hover:text-white text-lg leading-none shrink-0">×</button>
          </div>
        )}

        {/* AI processing banner — amber for billing/quota, red only for real errors */}
        {processError && (() => {
          const isBilling  = processErrorCode === "BILLING_EXHAUSTED";
          const isNoConfig = processErrorCode === "NO_PROVIDERS";
          const isTimeout  = processErrorCode === "TIMEOUT";
          const isWarn     = isBilling || isNoConfig || processErrorCode === "AI_UNAVAILABLE" || isTimeout;
          return (
            <div className={`mb-6 border rounded-2xl px-5 py-4 flex items-start justify-between gap-4 ${
              isWarn ? "bg-amber-950/60 border-amber-800" : "bg-red-950/80 border-red-800"
            }`}>
              <div className="flex-1 min-w-0 space-y-1">
                <p className={`text-sm font-medium ${isWarn ? "text-amber-300" : "text-red-400"}`}>
                  {isWarn
                    ? "Document uploaded successfully. AI analysis temporarily paused."
                    : "AI analysis failed. Your document is safe — retry when ready."}
                </p>
                <p className={`text-xs ${isWarn ? "text-amber-500/80" : "text-red-500/80"}`}>
                  {processError}
                </p>
                {processErrorDetails && (
                  <p className="text-xs text-zinc-500 font-mono mt-1 break-all">
                    {processErrorDetails}
                  </p>
                )}
                {isBilling && (
                  <div className="flex gap-3 pt-1">
                    <a href="https://console.anthropic.com/billing" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-amber-400 underline hover:text-amber-300">Anthropic billing ↗</a>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-amber-400 underline hover:text-amber-300">Add Gemini key ↗</a>
                  </div>
                )}
                {isNoConfig && (
                  <a href="/vault/system" className="text-xs text-amber-400 underline hover:text-amber-300 pt-1 inline-block">
                    Configure AI providers in /vault/system →
                  </a>
                )}
                {isTimeout && (
                  <p className="text-xs text-amber-400 pt-1">
                    Document card मा "Reset गरेर फेरि Analyze" थिच्नुहोस् — document सुरक्षित छ।
                  </p>
                )}
              </div>
              <button
                onClick={() => { setProcessError(null); setProcessErrorCode(null); setProcessErrorDetails(null); }}
                className={`text-lg leading-none shrink-0 mt-0.5 ${isWarn ? "text-amber-700 hover:text-amber-500" : "text-red-600 hover:text-red-400"}`}
              >×</button>
            </div>
          );
        })()}

        {/* Learning mode guide */}
        {learn && docs.length > 0 && (
          <LearnBlock
            title="Civic Intelligence Library — कसरी काम गर्छ?"
            nepali="यहाँ सरकारी, आर्थिक, नीतिगत वा अनुसन्धान documents upload गर्नुहोस्। AI ले पढेर: topics, institutions, laws, constitutional references, citizen impact, promises, risks र opportunities निकाल्छ। त्यसपछि ती सबै Constitution Tree मा जोडिन्छन् — जनताले सिक्न पाउँछन्।"
            steps={[
              "📄 Document upload गर्नुहोस् — बजेट, NRB report, नीति, आयोग प्रतिवेदन, अदालत फैसला",
              "🤖 'AI ले Analyze' थिच्नुहोस् — AI ले topics, rights, institutions, promises निकाल्छ",
              "📜 AI ले document लाई संविधानका भाग र धारासँग जोड्छ",
              "👁 Admin Vault मा review गरेर approve गर्नुहोस्",
              "🌳 Approved document Constitution Tree मा जान्छ — जनताले explore गर्न पाउँछन्",
            ]}
          />
        )}

        {/* Civic pipeline status — where are your documents? */}
        {docs.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-2">तपाईंका documents अहिले कहाँ छन्?</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                {
                  icon:   "📄",
                  label:  "Uploaded",
                  np:     "Upload भयो",
                  value:  docs.length,
                  color:  "text-zinc-300",
                  dot:    "bg-zinc-500",
                  border: "border-zinc-800",
                  bg:     "bg-zinc-900/60",
                  href:   null,
                  tip:    "System मा आइसक्यो",
                },
                {
                  icon:   "🤖",
                  label:  "AI Analyzed",
                  np:     "AI ले पढ्यो",
                  value:  aiReadyCount,
                  color:  "text-blue-400",
                  dot:    "bg-blue-500",
                  border: "border-blue-900",
                  bg:     "bg-blue-950/20",
                  href:   null,
                  tip:    "Intelligence निकालिसक्यो",
                },
                {
                  icon:   "👁",
                  label:  "Awaiting Review",
                  np:     "समीक्षा पर्खिरहेको",
                  value:  awaitingReview,
                  color:  "text-amber-400",
                  dot:    "bg-amber-500",
                  border: "border-amber-800",
                  bg:     "bg-amber-950/20",
                  href:   "/vault/admin?tab=documents",
                  tip:    "Admin review आवश्यक",
                },
                {
                  icon:   "✅",
                  label:  "Public",
                  np:     "जनतालाई उपलब्ध",
                  value:  approvedDocs,
                  color:  "text-green-400",
                  dot:    "bg-green-500",
                  border: "border-green-900",
                  bg:     "bg-green-950/20",
                  href:   null,
                  tip:    "Constitution Tree मा गइसक्यो",
                },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-1 shrink-0">
                  <div
                    title={step.tip}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                      step.value > 0 && step.href
                        ? "border-amber-800 bg-amber-950/30"
                        : `${step.border} ${step.bg}`
                    }`}
                  >
                    <span className="shrink-0">{step.icon}</span>
                    <span className="text-zinc-500 hidden sm:inline">{step.np}</span>
                    <span className={`font-black ${step.color}`}>{step.value}</span>
                    {step.href && step.value > 0 && (
                      <Link href={step.href} className="text-amber-400 hover:text-amber-300 ml-0.5 font-black">→</Link>
                    )}
                  </div>
                  {i < arr.length - 1 && <span className="text-zinc-700 text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk hero image generator — shown when approved docs need images */}
        {(() => {
          const needsImage = docs.filter(d => d.adminApprovalStatus === "approved" && !d.heroImageUrl);
          if (needsImage.length === 0 && !bulkImageProgress) return null;
          return (
            <div className="mb-5 rounded-2xl border border-purple-900/60 bg-purple-950/30 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-purple-300">🖼 Janta Hero Images</p>
                  {bulkImageProgress ? (
                    <p className="text-xs text-purple-400 mt-0.5">
                      Generate हुँदैछ… {bulkImageProgress.done}/{bulkImageProgress.total} docs
                    </p>
                  ) : (
                    <p className="text-xs text-purple-500 mt-0.5">
                      {needsImage.length} approved doc{needsImage.length !== 1 ? "s" : ""} मा image छैन — /janta मा visual नदेखिने
                    </p>
                  )}
                </div>
                {bulkImageProgress ? (
                  <div className="shrink-0 text-right">
                    <div className="w-32 bg-purple-900/40 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((bulkImageProgress.done / bulkImageProgress.total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-purple-600 mt-1">{Math.round((bulkImageProgress.done / bulkImageProgress.total) * 100)}% done</p>
                  </div>
                ) : (
                  <button
                    onClick={handleBulkGenerateImages}
                    disabled={needsImage.length === 0}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                  >
                    सबैको Image Generate गर्नुहोस्
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Search + filter */}
        <div className="flex flex-col gap-2 mb-5">
          <input
            type="text"
            placeholder="Document खोज्नुहोस् — title, topic, वा tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          {/* Horizontal-scroll filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === cat
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {learn ? CAT_LABEL[cat].np : CAT_LABEL[cat].en}
              </button>
            ))}
          </div>
          {/* Learning mode: what to upload per category */}
          {learn && filter !== "all" && CAT_EXAMPLES[filter] && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                {CAT_LABEL[filter].np} examples:
              </span>
              {CAT_EXAMPLES[filter]!.map(ex => (
                <span key={ex} className="text-xs px-2 py-0.5 bg-cyan-950/40 border border-cyan-900/40 text-cyan-400 rounded-full">
                  {ex}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Document grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-zinc-600 text-sm">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            {docs.length === 0 ? (
              /* First-use onboarding — civic framing */
              <div className="w-full max-w-lg mx-auto space-y-4">
                <div className="text-center">
                  <p className="text-5xl mb-3">🌱</p>
                  <p className="text-white font-bold text-lg">पहिलो civic document upload गर्नुहोस्</p>
                  <p className="text-zinc-500 text-sm mt-1 leading-relaxed max-w-sm mx-auto">
                    हरेक document Constitution Tree मा intelligence थप्छ।
                    जनताले आफ्ना अधिकार र government को काम बुझ्न पाउँछन्।
                  </p>
                </div>

                {/* What to upload */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">कस्ता documents upload गर्ने?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "💰", type: "आर्थिक / बजेट",   examples: "बजेट, NRB report, EPF/SSF" },
                      { icon: "⚖️", type: "कानूनी / अदालत",  examples: "ऐन, नियमावली, फैसला" },
                      { icon: "📋", type: "नीतिगत",           examples: "नीति, कार्यक्रम, योजना" },
                      { icon: "🔬", type: "अनुसन्धान",        examples: "आयोग प्रतिवेदन, सर्वेक्षण" },
                      { icon: "📣", type: "जनगुनासा",         examples: "RTI, नागरिक निवेदन" },
                      { icon: "🏛️", type: "संसद् कार्यवाही",  examples: "सांसद प्रश्न, संसदीय बहस" },
                    ].map(d => (
                      <div key={d.type} className="flex items-start gap-2 p-2 rounded-xl bg-zinc-800/60">
                        <span className="text-base shrink-0">{d.icon}</span>
                        <div>
                          <p className="text-white text-xs font-semibold">{d.type}</p>
                          <p className="text-zinc-600 text-[10px] mt-0.5">{d.examples}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Journey steps */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                  {[
                    { icon: "📤", title: "Document Upload गर्नुहोस्",         detail: "PDF, DOCX, image — जुनसुकै format" },
                    { icon: "🤖", title: "AI ले पढेर intelligence निकाल्छ",   detail: "Topics, rights, institutions, promises, risks" },
                    { icon: "📜", title: "संविधानका धारासँग जोडिन्छ",         detail: "हरेक policy पछाडि कुन अधिकार छ — AI ले map गर्छ" },
                    { icon: "🌳", title: "Constitution Tree मा जान्छ",         detail: "जनताले explore गर्न, अधिकार बुझ्न पाउँछन्" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-800 text-sm flex items-center justify-center shrink-0 mt-0.5">{s.icon}</span>
                      <div>
                        <p className="text-white text-xs font-semibold">{s.title}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowUpload(true)}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-xl text-sm transition-colors"
                >
                  + पहिलो Document Upload गर्नुहोस्
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-zinc-500 text-sm">No documents match your search.</p>
                <button
                  onClick={() => { setSearch(""); setFilter("all"); }}
                  className="text-zinc-600 text-xs hover:text-zinc-400 mt-2"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isProcessing={processingId === doc.id}
                queueCount={queueCountByDoc[doc.id] ?? 0}
                onView={setViewing}
                onProcess={handleProcess}
                onDelete={handleDelete}
                onGenerateQueue={handleGenerateQueueItems}
                onResetStuck={handleResetStuck}
                onGenerateImage={handleGenerateImage}
                isGeneratingImage={generatingImageId === doc.id}
                onExtractPoints={handleExtractPoints}
                isExtractingPoints={extractingPointsId === doc.id}
                pointCount={pointCountByDoc[doc.id] ?? 0}
                onExtractPromises={handleExtractPromises}
                isExtractingPromises={extractingPromisesId === doc.id}
                promiseCount={promiseCountByDoc[doc.id] ?? 0}
                onExtractIntel={handleExtractIntelligence}
                isExtractingIntel={extractingIntelId === doc.id}
                isMatchingIntel={matchingIntelId === doc.id}
                intelCount={intelCountByDoc[doc.id] ?? 0}
                relCount={relCountByDoc[doc.id] ?? 0}
                onExtractConstitution={handleExtractConstitution}
                isExtractingConstitution={extractingConstitutionId === doc.id}
                constitutionBatch={extractingConstitutionId === doc.id ? constitutionBatch : 0}
                constitutionCount={constitutionCountByDoc[doc.id] ?? 0}
                onArchive={handleArchive}
                isArchiving={archivingId === doc.id}
              />
            ))}
          </div>
        )}

        {/* Content ideas summary — flywheel banner */}
        {docs.some(d => d.contentIdeas && d.contentIdeas.length > 0) && (
          <div className="mt-8 bg-zinc-900 border border-cyan-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-400 font-semibold text-sm">Content Pipeline</span>
              <span className="text-zinc-600 text-xs">— ideas surfaced from your intelligence</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {docs
                .filter(d => d.contentIdeas && d.contentIdeas.length > 0)
                .flatMap(d => d.contentIdeas!)
                .slice(0, 6)
                .map((idea, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-700 text-xs mt-0.5 shrink-0">→</span>
                    <p className="text-zinc-400 text-xs">{idea}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
