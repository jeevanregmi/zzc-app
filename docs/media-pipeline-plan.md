# ZZC AI-Native Media Generation Pipeline
**Version:** 1.0 | **Date:** 2026-05-12 | **Owner:** CTO

---

## Infrastructure Readiness Assessment

### Already Deployed (Use Now)
| Capability | Tool | Status | Location |
|---|---|---|---|
| AI text generation | AWS Bedrock (Claude 3.5 Sonnet) | ✓ Live | `functions/api/recommend.ts` |
| Asset storage | Firebase Storage | ✓ Live | `/vault/{userId}/...` |
| Asset metadata | Firestore | ✓ Live | `vault_*` collections |
| Prompt architecture | In-code (Vault Thumbnails) | ✓ Live | `vault/content/youtube/thumbnails` |
| Type contracts | `lib/types/content.ts` | ✓ Live | `VideoIdea`, `ThumbnailPrompt`, etc. |
| Delivery | Cloudflare Pages Functions | ✓ Live | `functions/api/` |

### Missing (Need API Keys / Build)
| Capability | Gap | Recommended Tool | Cost/Unit |
|---|---|---|---|
| Image generation | No API | Ideogram v2 | $0.08/img |
| Image generation (alt) | No API | Together AI + FLUX.1 | $0.003/img |
| Voice narration | No API | ElevenLabs | $0.18/1k chars |
| Voice (cheap alt) | No API | AWS Polly | $0.004/1k chars |
| Video generation | No API | Runway Gen-3 | $0.05/sec |
| Auto-subtitles | No API | Whisper (OpenAI) | $0.006/min |
| YouTube publish | No OAuth | YouTube Data API v3 | Free (quota) |

---

## Pipeline Architecture

```
USER COMMAND
    │
    ▼
/vault/content/youtube/[pipeline page]
    │
    ├─► generate-script.ts ──────────► AWS Bedrock (Claude 3.5)
    │        (deployed now)                    │
    │                                          ▼
    ├─► generate-thumbnail-prompt.ts ──► text prompt
    │        (deployed now)                    │
    │                                          ▼
    ├─► generate-image.ts ──────────────► Ideogram/FLUX API     [tier 2]
    │        (needs key)                       │
    │                                          ▼
    ├─► generate-voice.ts ──────────────► ElevenLabs/Polly       [tier 2]
    │        (needs key)                       │
    │                                          ▼
    ├─► generate-subtitles.ts ──────────► Whisper API             [tier 3]
    │        (needs key)                       │
    └─► YouTube publish ─────────────────► YouTube Data API v3   [tier 3]
                                               │
                                               ▼
                                    Firebase Storage (/vault/{uid}/generated/)
                                    Firestore (vault_generated collection)
```

---

## Tier 1 — Immediate (Zero New Keys, This Week)

### `functions/api/generate-script.ts`
- Input: topic, format (long-form/short), target length, tone, CTA
- Output: full structured script JSON with sections, hook, timestamps
- Engine: AWS Bedrock (existing key)
- Cost: ~$0.01/script
- **Status: DEPLOYED**

### `functions/api/generate-thumbnail-prompt.ts`
- Input: video title, pillar, style variant, palette
- Output: optimized prompt string ready for Midjourney / DALL-E / Ideogram
- Engine: AWS Bedrock (existing key)
- Cost: ~$0.003/prompt
- **Status: DEPLOYED**

### Vault Pipeline UI
- `/vault/content/youtube/[ideas|scripts|thumbnails|published]`
- **Status: DEPLOYED**

---

## Tier 2 — Medium Term (1–4 weeks, Need New API Keys)

### Image Generation
**Recommended: Together AI + FLUX.1-schnell**
- Cost: ~$0.003/image (cheapest viable quality)
- API: `https://api.together.xyz/v1/images/generations`
- Key: `TOGETHER_API_KEY` → add to Cloudflare Pages env
- Build: `functions/api/generate-image.ts`

**Alternative: Ideogram v2**
- Cost: $0.08/image (higher quality, better text rendering)
- Best for thumbnails with Nepali text
- Key: `IDEOGRAM_API_KEY` → add to Cloudflare Pages env

### Voice Narration
**Recommended: ElevenLabs**
- Free tier: 10,000 chars/month (≈5 scripts)
- Paid: $5/month for 30k chars
- Key: `ELEVENLABS_API_KEY` → Cloudflare Pages env
- Build: `functions/api/generate-voice.ts`

**Alternative: AWS Polly**
- Already in AWS account (same credentials)
- Cost: $0.004/1k chars (neural voice)
- No new key needed — just add Polly permissions to existing IAM user

### What to Build
```
functions/api/
  generate-image.ts           ← FLUX or Ideogram
  generate-voice.ts           ← ElevenLabs or Polly
app/vault/content/
  ai-studio/page.tsx          ← unified generation UI
```

---

## Tier 3 — Enterprise Scale (1–3 months)

### Video Generation
- Tool: Runway Gen-3 Alpha Turbo
- Cost: $0.05/sec video output (~$1.50 for 30-sec short)
- Quality: sufficient for explainer-style shorts
- Integration: `functions/api/generate-video.ts`

### Auto-Subtitles
- Tool: OpenAI Whisper API
- Cost: $0.006/min audio
- Build: upload audio → Whisper → SRT/VTT → embed in video export

### YouTube Auto-Publish
- Tool: YouTube Data API v3 (free, 10k units/day quota)
- Setup: OAuth2 service account for ZZC channel
- Build: `functions/api/publish-youtube.ts`
- Stores publish record in Firestore → `/vault/content/youtube/published`

---

## Reusable Prompt Architecture

### Script Prompts (Bedrock)
Template variables: `{topic}`, `{format}`, `{audience}`, `{duration}`, `{cta}`, `{pillar}`
Base system: ZZC brand voice — Gen Z, Nepali-first, data-backed, fintech authority

### Thumbnail Prompts (Ideogram/FLUX)
5 style variants (in vault UI):
1. `calculator-screen` — ZZC tool UI + big Nepali headline
2. `talking-head` — face + green rim light + text
3. `data-viz` — dramatic chart/graph + stat
4. `split-screen` — comparison (SSF vs EPF, SIP vs Lump Sum)
5. `text-only` — bold Nepali typography, minimal

### Voice Prompts (ElevenLabs)
- Voice character: confident Nepali male/female, 25–30 yrs, clear diction
- Speed: 1.0x normal, slight formal-casual mix
- Language: Nepali primary, English terms preserved

---

## Storage Strategy

```
Firebase Storage:
/vault/{userId}/
  generated/
    scripts/     ← script-{ideaId}-{timestamp}.json
    thumbnails/  ← thumb-{ideaId}-{timestamp}.png
    voice/       ← voice-{scriptId}-{timestamp}.mp3
    videos/      ← video-{ideaId}-{timestamp}.mp4
    subtitles/   ← sub-{videoId}-{timestamp}.srt

Firestore:
vault_generated → {
  id, userId, type, ideaId, status,
  storageUrl, prompt, model, cost, createdAt
}
```

---

## Cost Model (Per Video)

| Phase | Component | Tool | Cost |
|---|---|---|---|
| Pre-prod | Script (AI) | Bedrock | ~$0.01 |
| Pre-prod | Thumbnail prompt | Bedrock | ~$0.003 |
| Pre-prod | Thumbnail image | Together/FLUX | ~$0.003 |
| Production | Voice narration (5 min) | ElevenLabs | ~$0.09 |
| Post | Subtitles | Whisper | ~$0.03 |
| Publish | YouTube upload | Free | $0.00 |
| **Total** | **Per video** | | **~$0.14** |

At 4 videos/month = **~$0.56/month** in AI costs for full pipeline (excluding storage).
Storage (Firebase): ~$0.026/GB/month — negligible at current scale.

---

## Automation Opportunities

1. **"One-command short"** — input: topic → output: script + thumbnail prompt + voice + upload-ready package
2. **Batch thumbnail generation** — generate 3 A/B variants per video from same prompt template
3. **Auto-caption from voice** — voice → Whisper → SRT → embed
4. **Content calendar automation** — ideas → scheduled queue → reminder webhook
5. **Performance ingestion** — YouTube Studio CSV → Firestore → `/vault/content/youtube/published` analytics

---

## Immediate Next Actions (Priority Order)

1. ✓ Script generator (`functions/api/generate-script.ts`) — Bedrock, zero new keys
2. ✓ Thumbnail prompt generator (`functions/api/generate-thumbnail-prompt.ts`) — Bedrock
3. ☐ Add `TOGETHER_API_KEY` to Cloudflare Pages env → unlock image generation
4. ☐ Add `ELEVENLABS_API_KEY` to Cloudflare Pages env → unlock voice
5. ☐ Build `/vault/content/ai-studio` — unified generation UI
6. ☐ Grant AWS Polly permissions to `zzc-bedrock-user` IAM role → free Nepali TTS
7. ☐ Set up YouTube Data API → auto-publish flow
