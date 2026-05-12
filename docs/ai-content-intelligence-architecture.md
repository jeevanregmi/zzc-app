# AI Content Intelligence + Media Generation Engine
## ZZC Vault — Architecture Design
Last Updated: May 12, 2026

---

## Vision

An AI-assisted media research and publishing operating system for ZZC. The system helps discover, organize, summarize, and suggest — with the human (Jeevan) as the final verifier before anything is published.

**Not spam automation. Quality and credibility are the brand.**

---

## Principles

1. Quality over quantity
2. Human verification required before any publish
3. Avoid misinformation — prefer primary sources
4. Never auto-publish
5. Maintain long-term media brand credibility
6. Nepal-focused intelligence (NRB, EPF, SSF, NEPSE, economic news)

---

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Source Collection                             │
│  (what information exists in the world?)                │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Layer 2: Intelligence Analysis                         │
│  (what matters? cluster, score, summarize)              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Layer 3: Content Suggestion                            │
│  (video ideas, titles, hooks, scripts, shorts)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Layer 4: Admin Verification                            │
│  (human reviews, edits, approves, rejects)              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Layer 5: Publishing (future)                           │
│  (scheduled posting, cross-platform, analytics loop)    │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Source Collection

### Nepal Finance Sources (Priority)
| Source | Type | Update Frequency |
|--------|------|-----------------|
| NRB (Nepal Rastra Bank) press releases | PDF/HTML | Monthly |
| EPF official circulars | PDF | Quarterly |
| SSF rate announcements | PDF | Quarterly |
| NEPSE weekly market reports | HTML | Weekly |
| Sharesansar, Mero Lagani | Web | Daily |
| Nepal Economic Forum | PDF reports | Occasional |
| Ministry of Finance budget docs | PDF | Annual |
| Nepal government gazette (rajpatra) | PDF | As published |

### Collection Methods
1. **Manual upload** (NOW LIVE — Phase 1): Admin drags PDFs into `/vault/documents`
2. **RSS ingestion** (Phase 3): Automated worker fetches RSS feeds
3. **PDF scraper** (Phase 3): Cloudflare Worker fetches + archives official PDFs
4. **Web snapshot** (Phase 4): Capture public web pages for key news sources

### Firestore Collection: `source_signals`
```typescript
interface SourceSignal {
  id: string;
  ownerId: string;
  sourceType: "rss" | "pdf" | "manual" | "web";
  sourceUrl: string;
  sourceName: string;           // "NRB Press Release", "EPF Circular"
  rawContent: string;           // extracted text
  fetchedAt: string;
  processingStatus: "raw" | "analyzed" | "consumed" | "discarded";
  linkedDocId?: string;         // if uploaded as intelligence doc
  createdAt: string;
}
```

---

## Layer 2: Intelligence Analysis

### What AI Does
- Extracts key facts, figures, percentages from raw sources
- Clusters related topics (e.g., "interest rate changes", "EPF policy update")
- Scores by audience relevance for ZZC users (young Nepali investors)
- Detects freshness (is this breaking news vs. archive material?)
- Estimates credibility (primary source vs. secondhand)
- Translates Nepali source documents to extract structured data

### Firestore Collection: `intelligence_topics`
```typescript
interface IntelligenceTopic {
  id: string;
  ownerId: string;
  topicTitle: string;           // "EPF raises housing loan limit to Rs 2Cr"
  topicSummary: string;         // AI-generated 3-sentence summary
  keyFacts: string[];           // bullet points with specific data
  relatedSchemes: string[];     // scheme IDs this topic touches
  audienceRelevance: number;    // 0-1 score (young investor focus)
  credibility: "primary" | "secondary" | "unverified";
  freshness: "breaking" | "current" | "evergreen" | "archive";
  sourceSignalIds: string[];    // which source signals contributed
  linkedDocIds: string[];       // intelligence library docs
  contentPotential: number;     // 0-1 score (can this become content?)
  status: "new" | "reviewed" | "converted" | "archived";
  createdAt: string;
  reviewedAt?: string;
}
```

### AI Processing Entry Points
1. `POST /api/process-document` — analyze uploaded intelligence doc → extract topic
2. `POST /api/analyze-source-signal` — analyze raw RSS/PDF → extract topic
3. `POST /api/cluster-topics` — find connections across existing topics

---

## Layer 3: Content Suggestion

### Content Idea Pipeline
AI reads `intelligence_topics` with high `contentPotential` and generates content proposals.

### Content Types Supported
| Type | Platform | Format |
|------|----------|--------|
| Long-form video | YouTube | 5-12 min explainer |
| Shorts | YouTube Shorts / Instagram Reels | 15-60s |
| Educational post | Facebook | 200-500 word + graphic |
| Carousel | Instagram | 5-8 slide explanation |
| Finance explainer | All | Infographic-style |

### Firestore Collection: `content_ideas`
```typescript
interface ContentIdea {
  id: string;
  ownerId: string;
  sourceTopicIds: string[];     // which intelligence_topics this came from
  contentType: "youtube-long" | "shorts" | "facebook-post" | "carousel";
  platform: "youtube" | "shorts" | "facebook" | "instagram" | "all";
  title: string;                // AI-suggested title
  hook: string;                 // opening hook (first 15 seconds / first line)
  outline: string[];            // section-by-section breakdown
  scriptDraft?: string;         // full draft (if generated via AI Studio)
  thumbnailPrompt?: string;     // DALL-E/Midjourney prompt for thumbnail
  seoKeywords: string[];
  estimatedDuration?: number;   // seconds for video content
  aiModel: string;              // which model generated this
  generatedAt: string;
  status: "draft" | "approved" | "in-production" | "published" | "rejected";
  adminNotes: string;
  approvedAt?: string;
  publishedAt?: string;
  linkedMediaId?: string;       // once produced and uploaded to /vault/media
}
```

### AI Studio Integration (existing)
- `/vault/content/ai-studio` already has Script Generator + Thumbnail Prompt Generator
- Phase 4: Feed `content_ideas.outline` into AI Studio as pre-filled context
- AI Studio generates full script → `content_ideas.scriptDraft` populated

---

## Layer 4: Admin Verification (Vault UX)

### Intelligence Dashboard (`/vault/content/intelligence` — planned)
Three-column layout:

```
┌────────────────┬─────────────────────┬──────────────────────┐
│  Source        │  Intelligence       │  Content Ideas       │
│  Signals       │  Topics             │                      │
│  (raw inbox)   │  (analyzed)         │  (proposals)         │
│                │                     │                      │
│  • NRB release │  • EPF rate change  │  • "EPF vs SSF 2026" │
│  • EPF circular│  • SSF budget news  │  • "Housing loan     │
│  • Manual PDF  │  • NEPSE weekly     │     for first-timers"│
│                │                     │                      │
│  [Process →]   │  [Generate Idea →]  │  [Review] [Approve]  │
└────────────────┴─────────────────────┴──────────────────────┘
```

### Admin Actions
- **Discard**: Mark signal as irrelevant
- **Process**: Send to AI analysis → creates intelligence_topic
- **Generate Idea**: From topic → creates content_idea
- **Edit**: Modify AI-generated title, hook, outline
- **Approve**: Move to `in-production` status → show in Content Pipeline
- **Reject**: Archive with reason

---

## Layer 5: Future Publishing (Phase 5+)

Not to be built until Phases 1-4 are stable. Concepts only:

- **Scheduled publishing**: YouTube Data API, Facebook Graph API
- **Cross-platform posting**: Single content → adapted for each platform
- **Analytics feedback loop**: View counts → feed back into `audienceRelevance` scoring
- **Content calendar**: Planned publish dates visible in `/vault/calendar`

---

## Phased Roadmap

### Phase 1 — COMPLETE (May 12, 2026)
Intelligence Documents Library live:
- Drag-drop upload to Firebase Storage
- Real-time Firestore grid with search + filter by category
- DocumentCard with status badges, DocumentViewer (PDF/image/text)
- `processingStatus` field ready for AI processing

### Phase 2 — AI Processing Worker (Next)
**Goal**: Click "Process with AI" on a document → Claude analyzes it → `ai_ready`

New files:
- `functions/api/process-document.ts` — POST endpoint
  - Input: `{ docId, downloadUrl, mimeType }`
  - Calls Claude (via Anthropic API or Bedrock)
  - Extracts: summary, keyInsights, topics mentioned
  - Updates Firestore: `processingStatus: "ai_ready"`, `aiSummary`, `aiKeyInsights`
- Update `DocumentCard.tsx` — add "Process with AI" button

Estimated effort: 1 session

### Phase 3 — Intelligence Topics Dashboard
**Goal**: View analyzed topics, score them, link to content ideas

New files:
- `lib/types/intelligence.ts` — IntelligenceTopic, SourceSignal types
- `lib/vault/firestore.ts` — CRUD for `intelligence_topics`, `source_signals`
- `app/vault/content/intelligence/` — Intelligence dashboard (3-column UI)
- `functions/api/generate-content-idea.ts` — topic → content idea

Estimated effort: 2-3 sessions

### Phase 4 — Content Idea Generator + AI Studio Integration
**Goal**: One-click from intelligence topic → pre-filled AI Studio → full script

Changes:
- `app/vault/content/ai-studio/` — accept `ideaId` query param → pre-fill from content_idea
- `lib/types/intelligence.ts` — ContentIdea type
- `functions/api/generate-content-idea.ts` — intelligent proposal generator

Estimated effort: 1-2 sessions

### Phase 5 — Publishing Layer (future)
When audience and content volume justify it:
- YouTube Data API integration
- Scheduled content calendar
- Analytics → relevance feedback loop

---

## Reusable Infrastructure

| Existing System | How It's Reused |
|----------------|-----------------|
| `VaultGate` + `VaultShell` | Auth + nav for all intelligence pages |
| `VaultStub` component | Placeholder for unbuilt phases |
| `lib/vault/firestore.ts` CRUD pattern | Template for new collections |
| `lib/vault/storage.ts` upload pattern | Source PDF archiving |
| `functions/api/` Cloudflare Functions | All AI processing endpoints |
| `useVaultAuth` hook | Owner check for all intelligence operations |
| `IntelligenceDocument` Phase 1 | Documents become source signals |
| `content_ideas` → AI Studio | Feed outline into existing script generator |

---

## What NOT to Build

- Auto-publishing without admin approval
- Bulk scraping of non-public sources
- Fabricated or AI-hallucinated "news"
- Content without a verifiable primary source
- Engagement bait over educational value

---

## Key Design Decision: Why This Architecture

The ZZC brand is credibility. Nepal's fintech education space has a trust problem — much content is inaccurate. By building a **human-in-the-loop** intelligence system, ZZC can:
1. Produce more content (AI does research/drafting)
2. Produce better content (primary sources, AI summaries, fact-checked)
3. Move faster (intelligence → idea → script in one workflow)
4. Build audience trust (visibly sourced, Jeevan-verified)

The goal is not to automate away the human — it's to amplify what one person can produce to the level of a small media team.
