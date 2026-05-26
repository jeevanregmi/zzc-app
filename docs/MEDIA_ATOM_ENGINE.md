# ZZC Media Atom Engine — Architecture Design

> Status: Designed, not yet built.
> Priority: After QA sprint + stable intelligence pipeline.
> Core rule: Media is an EXPRESSION LAYER, not a separate product.

---

## The ONE Brain Principle

**Every media output must trace back to a single atomic source of truth.**

```
constitutional_framework  ─┐
janta_intelligence        ─┼──► media_atoms (expression layer)
janta_relationships       ─┘
civic_signals             ──►  media_atoms (signal → media pipeline)
```

Media atoms do not store intelligence. They **reference** it.
If an article's content changes, the media atom regenerates from the same source.
No duplicate data. No disconnected pipelines.

The intelligence question is always: "Does this atom already exist?"
If yes — reference it. Never re-extract.

---

## What a Media Atom Is

A media atom is a **publication wrapper** around an existing intelligence atom.
It answers: "How do we express this civic fact to a Nepali citizen in 60 seconds?"

```
Intelligence atom (source of truth)
       │
       ▼
Media atom (expression layer)
├── Script in Nepali
├── Narration text
├── Visual prompt (for AI image/animation)
├── Caption (for social media)
├── Emotional tone
├── Target audience
└── Source citation (back-references the atom)
```

---

## Firestore Schema

### Collection: `media_atoms`

Must be added to `firestore.rules` before writing. All queries require `where("ownerId", "==", uid)`.

```typescript
interface MediaAtom {
  id?:             string;       // Firestore doc ID
  ownerId:         string;       // security rule field

  // ── Source reference (ONE of these, never both) ──
  sourceCollection: "constitutional_framework" | "janta_intelligence";
  sourceAtomId:    string;       // doc ID in the source collection

  // ── Derived from source (denormalized for query efficiency, NOT duplicated) ──
  linkedBranch:   number;        // partNumber (from constitutional_framework)
  linkedArticle?: string;        // e.g. "धारा ३१" (from constitutional_framework)
  linkedTopic?:   string;        // topic from janta_intelligence

  // ── Media content (AI-generated, admin-editable) ──
  scriptNepali:   string;        // 60–150 word Nepali script
  narrationText:  string;        // cleaned narration (TTS-ready)
  visualPrompt:   string;        // prompt for AI image/video generation
  captionText:    string;        // social media caption with hashtags

  // ── Metadata ──
  mediaType:      "short" | "reel" | "explainer" | "scene";
  emotionalTone:  "informative" | "urgent" | "hopeful" | "critical";
  targetAudience: "general" | "youth" | "rural" | "urban";
  sourceRefs:     string[];      // citations: article IDs, document URLs

  // ── Status state machine ──
  status: "draft" | "script_ready" | "approved" | "published";

  // ── Timestamps ──
  createdAt:    string;
  approvedAt?:  string;
  publishedAt?: string;

  // ── Publishing targets (filled when publishing) ──
  platforms?:    ("tiktok" | "facebook_reels" | "youtube_shorts" | "instagram")[];
  publishedUrls?: Record<string, string>;  // platform → URL
}
```

### Status State Machine

```
draft
  │
  │  (AI generates script + narration + visualPrompt)
  ▼
script_ready
  │
  │  (admin reviews script, edits if needed, approves)
  ▼
approved
  │
  │  (admin triggers video generation — NOT automatic)
  │  (video is AI-generated or assembled from safe sources)
  ▼
published
  │
  └── platforms[]: tiktok | facebook_reels | youtube_shorts
```

**Critical rule:** Video generation runs ONLY after admin approves the script.
Never auto-generate video from draft.

---

## AI Pipeline — Script Generation Only (Phase 1)

When an admin selects an atom and clicks "Generate Script":

```
Input: constitutional_framework doc OR janta_intelligence doc
       ↓
AI prompt (Gemini Flash):
  "You are a Nepali civic educator. Based on this constitutional article:
   [originalText + plainNepaliSummary + rights[] + obligations[]]
   
   Generate:
   1. scriptNepali: 60-150 word educational script in simple Nepali
   2. narrationText: cleaned version for TTS (no punctuation issues)
   3. visualPrompt: English prompt for AI image generation (describe scene, no faces)
   4. captionText: social media caption in Nepali with relevant hashtags
   5. emotionalTone: one of [informative, urgent, hopeful, critical]"
       ↓
AI response parsed and saved as media_atom { status: "script_ready" }
```

Cost: ~1 Gemini Flash call per atom. No video cost until admin approves.

---

## Safe Media Sources (Legal)

| Type | Examples | Notes |
|---|---|---|
| AI-generated visuals | Stable Diffusion, DALL-E, Ideogram | No copyrighted faces/logos |
| Own animations | CSS animations, SVG, canvas | Zero cost |
| Government footage | Nepal Government press releases | Verify license per source |
| Public domain | Pixabay, Pexels (free tier) | Check license per clip |
| Creative Commons | CC0, CC-BY | Attribution required in sourceRefs |
| Stock licensed | Envato Elements, Storyblocks | Must have active subscription |

**Never use:** YouTube clips, movie scenes, news footage without explicit license.

---

## Integration Map

```
constitutional_framework
  └── Article: "Right to Education (धारा ३१)"
        └── media_atom: "शिक्षा अधिकार — 60-second reel"
              ├── scriptNepali: "संविधानले शिक्षा अधिकार भनेको छ..."
              ├── visualPrompt: "school, child reading, glowing branch..."
              └── sourceRefs: ["constitutional_framework/[docId]"]

janta_intelligence
  └── Policy: "Education Budget 2081 allocation"
        └── media_atom: "शिक्षा बजेट — के बाँडियो?"
              ├── scriptNepali: "सरकारले शिक्षामा X अर्ब विनियोजन गर्यो..."
              └── sourceRefs: ["janta_intelligence/[docId]", "vault_documents/[docId]"]

civic_signals
  └── New signal: "Education ministry circular"
        └── Suggested media_atom (draft created, awaiting admin review)
```

---

## Backend Page: `/vault/media-atoms`

### Views:

**1. Atom Library** — list of all media atoms with status badges

| Column | Field |
|---|---|
| Status | draft / script_ready / approved / published |
| Source | Linked atom title + branch + article |
| Type | short / reel / explainer |
| Tone | emotional tone |
| Actions | View script / Approve / Export caption / Mark published |

**2. Generate New Atom**
- Search/select from constitutional_framework or janta_intelligence
- One-click "Generate Script" (Gemini Flash call)
- Script preview + edit inline
- Approve → moves to approved status

**3. Approved Atoms**
- Ready for video generation
- "Generate Visual" → sends visualPrompt to image API
- "Mark Published" → enter platform URL

**4. Published Atoms**
- Full library with platform links
- Caption copy button

---

## Example: Right to Education

```
Source: constitutional_framework — धारा ३१ (Right to Education)

scriptNepali:
"संविधानको धारा ३१ ले हरेक नागरिकलाई शिक्षाको हक दिएको छ।
तर के यो हक वास्तविकतामा पुगेको छ?
सरकारले नि:शुल्क आधारभूत शिक्षा दिनुपर्छ — यो संवैधानिक दायित्व हो।
जनताले यो जान्नु जरुरी छ।"

narrationText:
"संविधानको धारा एकतिस ले हरेक नागरिकलाई शिक्षाको हक दिएको छ।
तर के यो हक वास्तविकतामा पुगेको छ?..."

visualPrompt:
"Nepali child reading a book under a glowing constitutional tree, 
warm morning light, simple flat animation style, no text overlay,
school building background, hopeful atmosphere"

captionText:
"शिक्षा तपाईंको संवैधानिक हक हो 📚
धारा ३१ — नेपालको संविधान २०७२
#ZZC #Nepal #संविधान #ShikshaAdhikar"

mediaType: "reel"
emotionalTone: "hopeful"
targetAudience: "youth"
status: "script_ready"
```

---

## Firestore Rules (to add when building)

```javascript
match /media_atoms/{id} {
  allow read:   if request.auth != null
                && resource.data.ownerId == request.auth.uid;
  allow write:  if request.auth != null
                && request.resource.data.ownerId == request.auth.uid;
}
```

---

## Build Prerequisites (before starting)

These must be true before building this:

- [ ] QA sprint: 10 real documents through full pipeline (ROADMAP #4)
- [ ] `janta_intelligence` pipeline stable and tested
- [ ] `constitutional_framework` Branch Health confirmed working
- [ ] Signal Intelligence pipeline working reliably (ROADMAP #6)
- [ ] AI cost tracking dashboard live (ROADMAP #8)

**Reasoning:** Media atoms are worthless if the underlying intelligence atoms are incomplete or unreliable. Build the brain first. Then give it a voice.

---

## Phase Plan

### Phase 1 — Script Engine (build after QA sprint)
- `media_atoms` collection + Firestore rules
- `/vault/media-atoms` admin page
- Script generation (Gemini Flash) from constitutional_framework
- Admin approve/reject workflow
- Caption export

### Phase 2 — Visual Prompts + Image Generation
- Visual prompt generation
- Integration with image API (DALL-E or Stable Diffusion)
- Image preview + approval
- Safe source library

### Phase 3 — Video Assembly + Publishing
- Combine narration (TTS) + images → short clip
- Multi-platform publish (TikTok, YouTube Shorts, Facebook Reels)
- Analytics: views, reach per atom

### Phase 4 — Signal → Media Pipeline
- New civic_signal → auto-suggest media atom draft
- Branch decay → trigger media update for affected atoms

---

## What NOT to Build

| Temptation | Why Not |
|---|---|
| Separate media database | Breaks ONE brain principle |
| Auto-generate video on script approval | Cost explosion, quality risk |
| Store intelligence in media_atom | Always reference, never duplicate |
| Generic video creator tool | ZZC media must always trace to a civic atom |
| Movie/news clip scraper | Copyright violation |
