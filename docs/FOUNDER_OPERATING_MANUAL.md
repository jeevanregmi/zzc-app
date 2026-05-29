# ZZC Founder Operating Manual
## Vault Backend — Complete Guide for Non-Technical Founder

**Version:** 1.0 · May 2026
**Owner:** Jeevan Regmi
**Language:** Nepali + light English
**Audience:** Founder/admin only — not for developers

---

> यो manual पढेपछि तपाईंले कुनै code नजानीकन ZZC vault operate गर्न सक्नुहुन्छ।
> हरेक page, हरेक button, हरेक decision — सब explain गरिएको छ।

---

## PART 1: ZZC को ठूलो चित्र

### ZZC भनेको के हो?

ZZC (Zeneration Z Chautari) Nepal को **civic intelligence infrastructure** हो।
यसको काम: सरकारी documents, नीति, बजेट, संविधान — यी सबैलाई नागरिकहरूले बुझ्ने format मा रूपान्तरण गर्नु।

तपाईं = sole founder, sole admin।
AI = तपाईंको assistant worker।
Public = documents कहिले publish हुन्छन् भनेर decide गर्ने तपाईं हुनुहुन्छ, AI होइन।

### दुई मुख्य Side

**Public Side (नागरिकहरूले देख्ने):**
- `/janta` — नीति र governance को story cards (नागरिकहरूको लागि)
- `/constitution` — Constitution Tree, article search
- `/finance` — EPF, SSF, calculator tools
- `/promises` — Government Promise Tracker (आउँदो)

**Vault/Backend Side (केवल तपाईंले देख्ने):**
- Documents upload, AI analysis, intelligence extraction, quality review, approval — सबै यहाँ हुन्छ
- URL: `zzc.jeevanregmi.com.np/vault`
- Password: केवल तपाईंको Google account (jeevanregmi15@gmail.com)

### तीन Roles

| Role | को काम | Example |
|---|---|---|
| **तपाईं (Founder)** | Upload, approve, review, final decision | "यो document publish गर्न मिल्छ" |
| **AI** | Analyze, extract, summarize, suggest | "यो document बारे यस्तो intelligence निकालेँ" |
| **Public User** | Read, search, learn | "EPF कति काट्छ?" |

**Rule:** AI recommends. Founder decides. Public sees only what founder approves.

---

## PART 2: One Brain Principle

### एउटै Brain, धेरै Chautaris

ZZC को सबैभन्दा महत्वपूर्ण architecture rule:

```
One Atom Pool → Many Public Views
```

**Atom** = ZZC मा एउटा verified fact/intelligence record।
Example: "Budget 2083/84 मा शिक्षा बजेट ४५ अर्ब छ।" — यो एउटा atom हो।

यो एउटै atom ले:
- Civic Chautari मा देखिन सक्छ ("शिक्षा बजेट increased")
- Economy Chautari मा देखिन सक्छ (budget comparison chart)
- Constitution link मा देखिन सक्छ (Article 31 - शिक्षाको अधिकार)

**यो किन important छ:**
तपाईंले एउटा document upload गर्दा data एक पटक मात्र store हुन्छ।
ती data multiple public pages मा automatically appear हुन सक्छन्।
Duplicate knowledge छैन।

### Chautaris = Views, not separate brains

| Chautari | हेर्ने data |
|---|---|
| Civic Chautari | Constitution, janta_intelligence records |
| Economy Chautari | economy_atoms (budget, monetary policy, economic data) |
| Promise Tracker | promise_atoms (government commitments) |
| Bhakti Chautari | spiritual atoms (temple vault बाट) |

**याद राख्नुस्:** एउटा fact एक पटक store, धेरै ठाउँमा देखाउन सकिन्छ।

---

## PART 3: Core Data Flow

### Document कसरी Public हुन्छ?

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1: UPLOAD
  Official PDF document
  → /vault/documents मा Upload गर्नुस्
  → R2 cloud storage मा safe हुन्छ (permanently)

STAGE 2: AI ANALYSIS (सस्तो, छिटो)
  → "AI Analyze" click
  → AI ले 1-3 minutes मा summary निकाल्छ
  → Title, key insights, Nepali explainer generate हुन्छ
  ⚠ यो DRAFT हो — public ready होइन

STAGE 3: ADMIN REVIEW & APPROVAL
  → /vault/admin मा review गर्नुस्
  → "Approve" वा "Needs Revision" click
  → Approved भएपछि मात्र intelligence extract गर्न सकिन्छ
  ⚠ यो gate हो — approve नगरी intelligence extract हुँदैन

STAGE 4: INTELLIGENCE EXTRACT (moderate cost)
  → /vault/documents मा "Extract Intelligence" click
  → AI ले deep intelligence records निकाल्छ
  → 10-100+ records जान्छन् (document को depth अनुसार)
  ✓ यहाँदेखि public civic cards बन्न थाल्छन्

STAGE 5: ATOMIC DEEP EXTRACT (expensive, optional)
  → /vault/documents मा Atomic Queue बाट run गर्नुस्
  → Page-by-page, paragraph-level evidence सहित extraction
  → Constitution, Budget, Major Reports मात्र गर्नुस्
  ✓ यसपछि quality + evidence सबैभन्दा बलियो हुन्छ

STAGE 6: QUALITY REVIEW
  → /vault/quality मा review गर्नुस्
  → प्रत्येक intelligence record को quality check
  → Weak records improve गर्नुस् वा reject गर्नुस्

STAGE 7: KNOWLEDGE CLASSIFICATION
  → /vault/knowledge मा Scan गर्नुस्
  → AI ले suggest गर्छ: "यो fact civic card हो? economy atom हो?"
  → तपाईंले approve/reject गर्नुस्

STAGE 8: PUBLIC
  → Approved atoms → /janta, /constitution, /finance मा appear
  ✓ Pipeline पूरा
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key rule:** हरेक stage मा तपाईंको approval चाहिन्छ। AI ले आफैं कुनै पनि step public मा push गर्न सक्दैन।

---

## PART 4: Main Backend Pages — Page-by-Page Guide

---

### `/vault/documents` — Document Library
**यो page किन छ?**
ZZC मा हुने सबै काम यो page बाट सुरु हुन्छ। यहाँ documents upload हुन्छन् र pipeline का stages track गर्न सकिन्छ।

**कहिले प्रयोग गर्ने:**
नयाँ document upload गर्दा, AI analysis गर्दा, intelligence extract गर्दा, Atomic Extract run गर्दा।

**मुख्य Buttons:**

| Button | काम | कहाँ देखिन्छ |
|---|---|---|
| **Upload** | नयाँ document थप्नुस् | माथि दायाँ |
| **AI Analyze** | AI ले document को summary बनाउँछ | Document card मा |
| **Extract Intelligence** | Deep intelligence records निकाल्नुस् | Approved documents मा |
| **Atomic Queue** | Budget वा constitution-grade documents को detailed extraction | Page को तल |
| **Archive** | Document hide गर्नुस् (delete होइन) | Card मा |

**Upload गर्दा के भर्ने:**
- **Title** — Document को पूरा नाम (Nepali वा English)
- **Gov Folder** — बजेट हो? संसद हो? Constitution हो? Folder छान्नुस्
- **Source URL** — PDF कहाँबाट download गर्नुभयो त्यो link
- **Document Year** — कुन fiscal year को हो (2082/83?)
- **Institution** — कसले बनाएको? (Ministry of Finance, NRB, etc.)

**Success कस्तो देखिन्छ:**
- Document list मा नयाँ card देखिन्छ
- Status: "Upload भयो — AI Analysis बाँकी"
- /vault/system मा pipeline count बढ्छ

**Common Problems:**

| Problem | अर्थ | के गर्ने |
|---|---|---|
| Upload error | Internet slow वा file too big | Retry गर्नुस्, file size check गर्नुस् |
| AI stuck at "processing" | AI provider busy | 10 min wait, /vault/system हेर्नुस् |
| "ai_paused" status | Billing limit पुग्यो | /vault/system → AI Providers → Top up |
| "error" status | AI failed | Document safe छ, Retry click गर्नुस् |

---

### `/vault/admin` — Intelligence Admin Hub
**यो page किन छ?**
AI ले analyze गरेका documents यहाँ Review queue मा आउँछन्। तपाईंले approve वा reject गर्नुहुन्छ।

**यो Gate किन important छ:**
- Approved भएपछि मात्र Intelligence Extract गर्न सकिन्छ
- Approve नगरी public intelligence बन्दैन
- यो step skip गर्न मिल्दैन

**Tabs:**
- **Documents** — AI-analyzed documents को review queue
- **Signals** — Source monitoring बाट आएका updates
- **Queue** — Content queue items

**Document Review गर्दा:**
1. Document card खोल्नुस्
2. AI Summary पढ्नुस् — सही छ?
3. Nepali Explainer पढ्नुस् — नागरिकले बुझ्छ?
4. Source credibility हेर्नुस् — official source हो?

**Buttons:**
- **Approve** — सबै ठीक छ, intelligence extract गर्न ready
- **Needs Revision** — AI summary गलत छ, फेरि analyze गर्नुपर्छ
- **Flag** — source uncertain छ, थप investigation चाहिन्छ

**Success:**
Document "Approved" भएपछि /vault/documents मा "Extract Intelligence" button appear हुन्छ।

---

### `/vault/qa` — QA Document Kit
**यो page किन छ?**
Stabilization sprint को लागि — ZZC ले test गर्नका लागि 10 वटा serious official documents को curated list। नयाँ random documents upload गर्नु सट्टा यी specific documents मात्र upload गर्नुस्।

**Golden Documents (यही मात्र upload गर्नुस् अहिले):**
1. Constitution of Nepal (constitutionofnepal.gov.np)
2. NHRC Annual Report
3. CIAA Annual Report
4. Budget Speech 2083/84 (mof.gov.np)
5. Budget Speech 2082/83
6. Monetary Policy 2083/84 (nrb.org.np)
7. Policy and Program 2083/84
8. Education Policy

**कसरी upload गर्ने यहाँबाट:**
1. Document को row मा "Upload URL" button click गर्नुस्
2. Upload form automatically भरिन्छ (title, folder, source URL सहित)
3. Confirm गरी upload गर्नुस्

**Confidence Score:**
प्रत्येक document को छेउमा "confidence" percentage देखिन्छ। यो ZZC ले similar existing documents match गर्ने attempt हो।
- 90%+ = Almost certain match found
- 60–89% = Likely match, verify गर्नुस्
- Below 60% = Low confidence, manual check गर्नुस्

---

### `/vault/quality` — Quality Score Review
**यो page किन छ?**
Intelligence extract भएपछि प्रत्येक record को quality check यहाँ हुन्छ। Weak records fix गर्न वा reject गर्न सकिन्छ।

**Quality Score भनेको के हो?**
0 देखि 100 सम्मको score। प्रत्येक intelligence record को quality यसरी measure गरिन्छ:
- Source cited छ? (+points)
- Page number छ? (+points)
- Evidence text छ? (+points)
- Contradiction छैन? (+points)

**Color Coding:**
- 🟢 Green (80+) — public-safe, publish गर्न मिल्छ
- 🟡 Yellow (50–79) — review गर्नुस्, improve गर्नुस्
- 🔴 Red (below 50) — weak, publish गर्न मिल्दैन

**Verification Pipeline:**
```
AI Extracted → Founder Reviewed → Human Verified
```
- **AI Extracted** = AI ले निकालेको, review बाँकी
- **Founder Reviewed** = तपाईंले check गर्नुभयो
- **Human Verified** = Fully verified, strongest confidence

**Buttons:**
- **Advance Verification** — verification stage बढाउनुस्
- **Add Refs** — कुन Constitutional article लाई यो record relevant छ? (1, 31, 51 — comma separated)
- **Save** — changes save गर्नुस्

**"Public Safe" badge:**
- Green ● Public = यो record public card मा जान ready छ
- No badge = अझै review चाहिन्छ

**Common Problems:**

| Problem | अर्थ | के गर्ने |
|---|---|---|
| सबै records red/low score | Document गलत extract भयो | Archive document, नयाँ upload गर्नुस् |
| Missing page number | AI ले page detect गरेन | Advance Verification skip गर्नुस् |
| "Weak" badge | Evidence text छैन | Atomic Extract run गरेमा improve हुन्छ |

---

### `/vault/knowledge` — Knowledge Classification Queue
**यो page किन छ?**
Intelligence records र economy atoms लाई classify गर्ने ठाउँ — यो fact कुन public product मा देखाउने? Civic card? Economy chart? Promise tracker?

**कसरी काम गर्छ:**
1. **Scan** button click गर्नुस् — AI ले नयाँ atoms classify गर्छ
2. Cards आउँछन् — प्रत्येक card एउटा potential public item हो
3. तपाईंले हेरेर Approve वा Reject गर्नुस्

**Card मा के छ:**
- **Summary Preview** — fact को छोटो description
- **Evidence** — source document बाट quote (यो proof हो)
- **Object Type** — civic_fact / economic_atom / government_promise / etc.
- **Domain** — कुन sector? (finance, health, education, etc.)
- **Source Document** — कुन document बाट आयो?
- **Page Number** — कुन page मा छ?

**Buttons:**
- **Approve** — यो fact सही छ, classify गर्नुस्
- **Edit** — subject वा category change गर्नुस्, अनि approve
- **Reject** — यो fact गलत वा irrelevant छ
- **Later** — अहिले decide नगर्नुस्, queue मा राख्नुस्

**Evidence हेर्नु किन important छ:**
Evidence बिना approve नगर्नुस्। Evidence = source proof।
"Budget 45 अर्ब" claim गर्दा कुन page मा लेखेको छ भन्ने देखाउनु पर्छ।
Evidence box खाली छ भने reject गर्नुस् वा source check गर्नुस्।

**Subject Chips:**
Card मा subject tags (budget, education, health, etc.) assign गर्न सकिन्छ।
यी tags ले public page मा filter गर्न मद्दत गर्छन्।

---

### `/vault/economy` — Economy Intelligence
**यो page किन छ?**
Budget Speech, Monetary Policy, Economic Survey — यस्ता documents बाट economy atoms निकाल्ने specialized pipeline। Normal intelligence extract भन्दा अलग।

**Economy Atom भनेको के हो?**
Budget data को structured form। Example:
- "कृषि बजेट 2083/84: ₹45.2 अर्ब (+12% from 2082/83)"
- "Monetary Policy 2083/84: Interest rate 5.5%"

**कसरी use गर्ने:**
1. Document list बाट budget वा monetary policy document छान्नुस्
2. "Economy Extract" button click गर्नुस्
3. Modal मा:
   - **Document Type** छान्नुस् (Budget / Monetary Policy / Economic Survey)
   - **Fiscal Year** enter गर्नुस् (2083/84)
4. Extract start हुन्छ — 5-10 minutes लाग्न सक्छ

**Compare Years:**
- दुई fiscal year को budget data side-by-side compare गर्न सकिन्छ
- Example: 2082/83 vs 2083/84 — कुन sector बढ्यो, कुन घट्यो

**Progress bar:**
Extract running हुँदा progress bar देखिन्छ। यो band:
- Extracting page 1/45...
- Writing atoms...
- Done: 127 atoms saved

**Success:**
Document card मा atom count देखिन्छ: "127 atoms"
Economy atoms /vault/knowledge मा classification को लागि आउँछन्

**Common Problems:**

| Problem | अर्थ | के गर्ने |
|---|---|---|
| "Job stuck" — घण्टौं loading | Extraction failed midway | Page refresh, retry गर्नुस् |
| "0 atoms" after extraction | Document type mismatch | Document type correct छ? Budget मात्र select गर्नुस् |
| Fiscal year missing | Year field blank | 2083/84 format मा enter गर्नुस् |
| Duplicate doc warning | Already extracted | Re-extract गर्नु नपरोस् — cost guard confirm |

---

### `/vault/sources` — Source Monitoring
**यो page किन छ?**
Nepal का official government websites (NRB, MoF, NHRC, etc.) automatically monitor हुन्छन्। नयाँ PDF आए यो page मा notification आउँछ।

**कसरी काम गर्छ:**
- Background मा ZZC ले government sites poll गर्छ
- नयाँ PDF detect भयो भने यो page मा card आउँछ
- तपाईंले 5-step pipeline follow गरी त्यो document ZZC मा ल्याउनुस्

**5-Step Pipeline (प्रत्येक detected update को लागि):**
1. **PDF Download** — original PDF link खोल्नुस्, verify गर्नुस् real document हो
2. **Vault Upload** — /vault/documents मा upload गर्नुस्
3. **Extract Intelligence** — AI analyze गरेपछि intel extract
4. **Add Constitutional Refs** — कुन constitutional article relevant छ?
5. **Publish Knowledge Cards** — /vault/knowledge मा approve गर्नुस्

**Buttons:**
- **Check Now** — manually check गर्नुस् नयाँ update छ कि छैन
- **Watch** — नयाँ source थप्नुस् (monitoring list मा)
- **Reviewed** — यो update हेरिसकेँ, अहिले process गर्दिनँ
- **Processed** — यो update ZZC मा ल्याइसकेँ, dismiss

**Success:**
Card "Processed" भएर disappear हुन्छ।
Document /vault/documents मा देखिन्छ।

---

### `/vault/management` — Operations Dashboard
**यो page किन छ?**
ZZC को overall operational health हेर्ने ठाउँ। System कहाँ-कहाँ stuck छ, कुन department मा problem छ — bird's eye view।

**यो page तपाईंले कहिले हेर्ने:**
- कुनै pipeline stuck देखिन्छ
- नयाँ feature launch अघि
- Weekly review को समयमा

**Status Meanings:**
- 🔴 **Critical** — तुरुन्त fix गर्नुपर्छ
- 🟡 **Needs Attention** — यो हप्ता गर्नुपर्छ
- 🟢 **On Track** — राम्रो छ
- ⚪ **Idle** — यो department अहिले active छैन

**CTO Summary:**
Technical system status को founder-friendly summary। Code जानु नपरी system health बुझ्न सकिन्छ।

---

### `/vault/temple` — Temple Vault (Private Sanctuary)
**यो page किन छ?**
Personal spiritual notes, Sanskrit shlokas, mantra research — founder को private space। यहाँ लेखेको केही पनि automatically public हुँदैन।

**Chambers (Tabs):**
- **Mantra** — mantra research, audio notes
- **Charitra** — divine characters (Shiva, Krishna, Devi, etc.)
- **Granth** — sacred text excerpts, shloka study
- **Sugjhav** — AI-generated spiritual suggestions

**Visibility States:**
- 🔴 **Private** (default) — केवल तपाईंले देख्ने, forever
- 🟡 **Review** — Bhakti Chautari मा eventually publish गर्ने सोचिरहेको
- 🟢 **Published** — Bhakti Chautari मा visible (future feature)

**Rule:** Temple बाट Bhakti Chautari मा केही पनि automatically publish हुँदैन। प्रत्येक transition founder-initiated हो।

---

### `/vault/system` — Vault Health Dashboard
**यो page किन छ?**
System को overall health — pipeline state, AI providers, infrastructure। Daily check-in को लागि।

**Pipeline Health Section (माथि):**
- **Pipeline पूरा** (green) — documents fully processed
- **Action चाहिन्छ** (amber) — कुनै document तपाईंको action चाहन्छ
- **अड्किएको** (red) — error state, investigate गर्नुस्
- **संदिग्ध** (gray) — source वा content missing

Stuck/needs_action documents को list देखिन्छ साथमा "Fix →" link।

**Infrastructure Section:**
- Firebase Auth ✓/✗
- R2 Storage ✓/✗
- AI Provider status (Gemini / Bedrock / Anthropic)

**Technical Details (collapsible):**
AI workers, scheduled jobs — developer information।

---

### `/vault/system-cleanup` — Data Cleanup
**यो page किन छ?**
सबै documents को pipeline state हेर्ने र cleanup गर्ने। Test documents delete गर्नुस्, stuck documents fix गर्नुस्।

**प्रत्येक Document Card मा:**
- Health badge (पूरा / Action चाहिन्छ / अड्किएको / संदिग्ध)
- Nepali status sentence: "AI Analysis भयो — Atomic Extract बाँकी"
- Counts: Intel records, Atomic atoms, Economy atoms
- Auto cleanup suggestion: राख्नुहोस् / हेर्नुहोस् / Archive / Delete

**Action Buttons:**
- **राख्नुहोस्** — यो document real data हो, keep गर्नुस् (permanently mark)
- **Archive** — Intel records हटाउनुस्, file safe रहन्छ
- **Reset** — AI analysis हटाउनुस्, फेरि analyze गर्न सकिन्छ
- **Delete** — सबै records permanently हटाउनुस् (confirm dialog आउँछ)

**Filter:**
- "Action चाहिन्छ" filter click — तत्काल attention चाहिने documents मात्र
- "अड्किएको" filter click — error state documents

---

## PART 5: Workflows — Step-by-Step

### Workflow 1: Official Government PDF → Public Civic Card

**Use case:** Budget speech, NHRC report, CIAA report → Janta page मा story card

```
Step 1: Upload
  → /vault/documents
  → Upload button
  → Gov Folder: "budget-economy" (budget को लागि)
  → Source URL: mof.gov.np/... (original PDF link)
  → Submit

Step 2: AI Analyze
  → Document card मा "AI Analyze" click
  → Wait 2-3 minutes
  → Status: "AI Analysis भयो — Review बाँकी"
  ✓ Verify: aiSummary makes sense

Step 3: Admin Review
  → /vault/admin → Documents tab
  → Document find गरी review गर्नुस्
  → Summary सही छ? → "Approve" click
  ✓ Status: "Approved"

Step 4: Intelligence Extract
  → /vault/documents
  → Document card मा "Extract Intelligence" click
  → Wait 3-5 minutes
  ✓ Success: Intel count बढ्छ (e.g., "82 records")

Step 5: Quality Review (optional but recommended)
  → /vault/quality
  → Record list हेर्नुस्
  → Low quality records: reject वा improve
  ✓ Green records = public ready

Step 6: Knowledge Classification
  → /vault/knowledge
  → "Scan" click
  → Cards आउँछन् — Approve गर्नुस्
  ✓ Approved atoms /janta मा appear हुन्छन्

SUCCESS: /janta page मा document बाट story cards देखिन्छन्
```

---

### Workflow 2: Budget Document → Economy Atoms → Compare Years

**Use case:** Budget 2083/84 र 2082/83 compare गर्नु

```
Step 1: Upload both budget documents
  → /vault/documents
  → Gov Folder: "budget-economy"
  → Year: 2083/84 (र separately 2082/83)

Step 2: AI Analyze both
  → दुवै documents "AI Analyze" गर्नुस्

Step 3: Economy Extract
  → /vault/economy
  → First document select
  → "Economy Extract" click
  → Document Type: "Budget Speech"
  → Fiscal Year: "2083/84"
  → Wait 5-10 minutes
  → दोस्रो document को लागि repeat (2082/83)
  ✓ Each document shows atom count

Step 4: Compare Years
  → /vault/economy → "Compare Years" section
  → 2082/83 vs 2083/84 select
  → Sector-by-sector breakdown देखिन्छ

SUCCESS: "Education budget ₹45.2B (+12% YoY)" — यस्तो data देखिन्छ
```

---

### Workflow 3: Constitution Article → Reader / Meaning Search

**Use case:** संविधानको Article 31 (Right to Education) को intelligence थप्नु

```
Step 1: Constitution PDF upload
  → /vault/documents
  → Gov Folder: "constitution"
  → Institution: "Government of Nepal"

Step 2: AI Analyze
  → "AI Analyze" click

Step 3: Constitution-specific extraction
  → Admin approve गर्नुस्
  → Intelligence Extract run गर्नुस्
  → Constitution records automatically constitutional_framework मा जान्छन्

Step 4: Verify on public page
  → /constitution → Article search
  → "Article 31" search गर्नुस्
  → Related intelligence records देखिन्छन् कि देखिँदैन

SUCCESS: Constitution Tree मा article click गर्दा related janta_intelligence records देखिन्छन्
```

---

### Workflow 4: Government Promise → Promise Tracker

**Use case:** Policy and Programs 2083/84 बाट government promises extract गर्नु

```
Step 1: Upload Policy and Programs document
  → /vault/documents
  → Gov Folder: "policy-planning"

Step 2: Analyze + Approve

Step 3: Intelligence Extract
  → Extract Intelligence click
  → Promise-type records automatically tag हुन्छन्

Step 4: Verify in Knowledge Queue
  → /vault/knowledge
  → "promise" type atoms approve गर्नुस्

SUCCESS: /promises page मा government commitments देखिन्छन्
```

---

### Workflow 5: Sacred Text → Temple Vault → Bhakti Chautari (Future)

**Use case:** Bhagavad Gita shlokas → Personal study → Eventually public

```
Step 1: Add to Temple Vault
  → /vault/temple
  → "Granth" tab
  → New note: shloka text + personal reflection
  → Visibility: "Private" (default)

Step 2: When ready to share
  → Note को visibility "Review" मा change गर्नुस्
  → यो founder को consideration queue हो

Step 3: Publish (Future — Bhakti Chautari launch पछि)
  → Visibility "Published" → bhakti_atom बन्छ
  → Bhakti Chautari public page मा appear हुन्छ

NOTE: Bhakti Chautari अहिले build भएको छैन।
Temple notes अहिले private मात्र राख्नुस्।
```

---

### Workflow 6: Atom → Classification → Route to Products

**Use case:** Intelligence extract भएपछि कहाँ देखाउने decide गर्नु**

```
Step 1: Knowledge Scan
  → /vault/knowledge
  → "Scan" button click
  → AI ले atoms classify गर्छ

Step 2: Review Cards
  → प्रत्येक card:
    - Object Type हेर्नुस् (civic_fact? economic_atom?)
    - Evidence हेर्नुस् (source proof छ?)
    - Domain confirm गर्नुस् (health? education? finance?)

Step 3: Decision
  → Approve → Public routes मा जान्छ
  → Edit → Category change गरेर approve
  → Reject → Public हुँदैन
  → Later → Queue मा रहन्छ

Step 4: Verify
  → Approved civic facts → /janta
  → Approved economy atoms → economy charts
  → Approved promises → /promises

SUCCESS: Correct public page मा fact appear भयो
```

---

## PART 6: Button Dictionary

**हरेक important button को meaning:**

---

### AI Analyze
**के गर्छ:** Document को fast summary, title cleaning, Nepali explainer, key insights।
**कहिले use गर्ने:** Upload गरेपछि पहिलो step।
**Cost:** सस्तो (~$0.01-0.05 per document)।
**Warning:** यो DRAFT हो। Public intelligence होइन। Approve नगरी extract गर्न मिल्दैन।
**Confuse नगर्नुस्:** Intelligence Extract सँग — दुवै अलग stages हुन्।

---

### Intelligence Extract
**के गर्छ:** Approved document बाट 10-100+ intelligence records निकाल्छ। Civic cards बन्छन्।
**कहिले use गर्ने:** Admin Approve भएपछि।
**Cost:** Moderate (~$0.10-0.50 per document)।
**Warning:** Cost guard: पहिले intel count check गर्नुस् — 0 छ भने मात्र extract गर्नुस्।
**Confuse नगर्नुस्:** Atomic Extract सँग — Intel Extract Tier 1, Atomic Tier 2।

---

### Atomic Deep Extract
**के गर्छ:** Page-by-page, paragraph-level extraction। हरेक fact को page number र verbatim evidence सहित।
**कहिले use गर्ने:** Constitution, National Budget, NHRC/CIAA reports — serious official documents मात्र।
**Cost:** Expensive (~$0.50-2.00 per document)।
**Warning:** Budget limit set गर्नुस् पहिले। Random documents मा use नगर्नुस्।
**Confuse नगर्नुस्:** Intelligence Extract सँग — Atomic Extract सधैं पछि आउँछ।

---

### Economy Extract
**के गर्छ:** Budget, Monetary Policy, Economic Survey बाट structured economy atoms निकाल्छ। Sector-wise breakdown।
**कहिले use गर्ने:** Economic documents मात्र (Budget Speech, NRB Monetary Policy, Economic Survey)।
**Cost:** Moderate to expensive।
**Warning:** Document Type सही select गर्नुस् — wrong type ले 0 atoms दिन्छ।
**Confuse नगर्नुस्:** Intelligence Extract सँग — Economy Extract अलग pipeline, अलग data।

---

### Compare Years
**के गर्छ:** दुई fiscal year को economy atoms side-by-side compare।
**कहिले use गर्ने:** दुवै years का documents extract भएपछि।
**Cost:** Free (no AI call, just data comparison)।

---

### Approve (Admin Vault)
**के गर्छ:** Document लाई Intelligence Extract को लागि unlock गर्छ।
**कहिले use गर्ने:** AI Summary review गरेपछि — सही छ भने।
**Warning:** Approve गरेपछि intelligence extract गर्न सकिन्छ — cost starts here।
**Confuse नगर्नुस्:** Knowledge Queue Approve सँग — दुवै अलग stages।

---

### Approve (Knowledge Queue)
**के गर्छ:** Intelligence atom लाई public products मा route गर्छ।
**कहिले use गर्ने:** /vault/knowledge मा card review गरेपछि।
**Warning:** Evidence बिना approve नगर्नुस्।

---

### Quality Review / Advance Verification
**के गर्छ:** Intelligence record को verification stage बढाउँछ (AI Extracted → Founder Reviewed → Human Verified)।
**कहिले use गर्ने:** /vault/quality मा record हेरेपछि।
**Cost:** Free।

---

### Public Ready
**के गर्छ:** Record लाई "public safe" mark गर्छ।
**कहिले use गर्ने:** Quality 80+ भएपछि, verification complete भएपछि।

---

### Human Verified
**के गर्छ:** Strongest verification badge। तपाईंले personally verify गर्नुभयो।
**कहिले use गर्ने:** Constitution articles, legal claims — highest stakes facts।

---

### New Scan (Knowledge Queue)
**के गर्छ:** नयाँ extracted atoms लाई classification suggest गर्छ।
**कहिले use गर्ने:** Intelligence Extract run भएपछि।
**Cost:** Free (rule-based, no AI call)।

---

### Edit (Knowledge Queue)
**के गर्छ:** Classification suggestion बदल्नुस् अनि approve।
**कहिले use गर्ने:** AI ले गलत classify गर्यो।

---

### Reject (Knowledge Queue)
**के गर्छ:** यो atom public हुँदैन।
**कहिले use गर्ने:** Fact गलत छ, source नछ, evidence छैन।

---

### Later (Knowledge Queue)
**के गर्छ:** Decision defer — queue मा रहन्छ।
**कहिले use गर्ने:** अहिले decide गर्न नसक्दा।

---

### Watch (Sources)
**के गर्छ:** नयाँ government source monitoring list मा थप्छ।
**कहिले use गर्ने:** New government website monitor गर्नुपर्यो।

---

### Check Now (Sources)
**के गर्छ:** Manually trigger करेर नयाँ PDFs check गर्छ।
**कहिले use गर्ने:** Background polling को लागि wait गर्न नभएमा।

---

### Archive (Documents)
**के गर्छ:** Document hide गर्छ, delete गर्दैन। Intelligence records हट्छन्।
**कहिले use गर्ने:** Document outdated भयो, तर history राख्नुपर्छ।
**Warning:** Intel records permanently हट्छन्।

---

### Delete (System Cleanup)
**के गर्छ:** Firestore बाट सबै records permanently हट्छन्।
**कहिले use गर्ने:** Test data, duplicate, clearly wrong documents।
**Warning:** UNDO हुँदैन। R2 file manually delete गर्नुपर्छ।

---

### Reset (System Cleanup)
**के गर्छ:** AI analysis हटाउँछ, document फेरि analyze गर्न ready हुन्छ।
**कहिले use गर्ने:** AI summary गलत थियो वा error state मा stuck छ।
**Warning:** Existing intel records remain (reset ले intel delete गर्दैन)।

---

### Re-analyze
**के गर्छ:** AI Analysis फेरि run गर्छ।
**कहिले use गर्ने:** पहिलो analysis गलत वा incomplete थियो।
**Cost:** AI cost again। Cost warning modal देखिन्छ — confirm गर्नुस्।

---

## PART 7: Quality Rules

**Rule 1 — No public content without source**
हरेक public fact को original source URL हुनुपर्छ। "कस्को report बाट?" भन्न सक्नुपर्छ।

**Rule 2 — No public card without evidence**
Knowledge Queue मा approve गर्दा evidence box empty छ भने reject गर्नुस्।

**Rule 3 — No public economic claim without year and page**
"EPF contribution rate X% हो" — यो claim मा fiscal year र page number हुनुपर्छ।

**Rule 4 — No Gen Z causal claim without explicit source support**
"Budget ले youth employment बढाउँछ" — source explicitly यो कुरा भन्नुपर्छ।
AI ले infer गरेको claim public गर्न मिल्दैन।

**Rule 5 — AI recommends, founder decides**
AI ले extract गर्छ। तपाईंले approve गर्नुस्। AI को decision final होइन।

**Rule 6 — Public Ready only after founder review**
Quality Review बिना "Public Ready" mark नगर्नुस्।

**Rule 7 — Official documents only for serious extraction**
Random blog posts, social media — extract गर्नु नपरोस्।
Official sources: NRB, MoF, Parliament, NHRC, CIAA, Supreme Court।

**Rule 8 — No random uploads during stabilization sprint**
Stabilization sprint सकिनु अघि: Golden dataset (10 docs) मात्र upload गर्नुस्।
Sprint done भनेको: ती 10 docs सबैको full pipeline pass भयो।

---

## PART 8: Status Meanings

**Document Statuses (processingStatus):**

| Status | Nepali Meaning | के गर्ने |
|---|---|---|
| **ready** | Upload भयो, AI analysis बाँकी | AI Analyze click गर्नुस् |
| **processing_ai** | AI analysis चल्दैछ | Wait 2-3 min |
| **ai_ready** | AI analysis सकियो, review बाँकी | /vault/admin मा review गर्नुस् |
| **ai_paused** | Billing limit पुग्यो, document safe छ | AI provider top up, retry |
| **error** | AI failed, document safe छ | Retry वा /vault/system हेर्नुस् |

**Admin Approval Statuses:**

| Status | Nepali Meaning | के गर्ने |
|---|---|---|
| **pending_review** | Review बाँकी | /vault/admin मा approve/reject |
| **approved** | Approved, extract गर्न ready | Intelligence Extract गर्नुस् |
| **needs_revision** | AI summary गलत, फेरि analyze | Re-analyze गर्नुस् |

**Pipeline Health (System page):**

| Status | Nepali Meaning | Action |
|---|---|---|
| **healthy** | Pipeline पूरा | — |
| **in_progress** | प्रक्रियामा | Wait |
| **needs_action** | तपाईंको action चाहिन्छ | Notification follow गर्नुस् |
| **stuck** | Error, अड्किएको | /vault/system → fix |
| **suspect** | Source missing वा incomplete | /vault/system-cleanup → review |

**Quality/Verification Statuses:**

| Status | Nepali Meaning | |
|---|---|---|
| **ai_extracted** | AI ले निकालेको, review बाँकी | Advance Verification |
| **founder_reviewed** | तपाईंले review गर्नुभयो | Good for most cases |
| **human_verified** | Highest confidence | Constitution, legal claims |
| **public_safe** | Public मा show गर्न safe | Approved automatically |

**Cleanup Suggestions:**

| Suggestion | Nepali Meaning | |
|---|---|---|
| **keep** | Real data हो, राख्नुस् | Approved docs |
| **review** | Founder judgment चाहिन्छ | Incomplete pipeline |
| **archive** | Hide गर्नुस्, data keep | Old documents |
| **delete** | Remove गर्नुस् | Test data |

---

## PART 9: Cost / Budget Explanation

### कुन Actions मा AI Cost लाग्छ?

| Action | Cost Level | Notes |
|---|---|---|
| AI Analyze | $ (सस्तो) | Per document: ~$0.01-0.05 |
| Intelligence Extract | $$ (moderate) | Per document: ~$0.10-0.50 |
| Atomic Deep Extract | $$$ (expensive) | Per document: ~$0.50-2.00 |
| Economy Extract | $$ (moderate) | Per document: ~$0.20-0.80 |
| Re-analyze | $ (same as Analyze) | Again cost लाग्छ |
| Knowledge Scan | FREE | Rule-based, no AI |
| Quality Review | FREE | No AI call |
| Compare Years | FREE | Data comparison only |
| Upload | FREE | File storage only |

### Budget Estimate कसरी पढ्ने (Atomic Queue)

Atomic Queue मा: "अनुमानित cost: ~$1.20"
- यो estimate हो, exact होइन (±20%)
- Budget limit set गर्नुस् — limit पुग्दा queue automatically रोकिन्छ
- "Budget ~$X बढी हुन्छ" देखियो भने: budget limit बढाउनुस् वा केही docs skip गर्नुस्

### Background Jobs किन time लाग्छ?

AI processing:
- AI Analyze: 1-3 minutes
- Intelligence Extract: 3-7 minutes  
- Atomic Extract: 5-20 minutes (document size अनुसार)
- Economy Extract: 5-10 minutes

**Job timeout भयो भने:**
1. Page refresh गर्नुस्
2. /vault/economy मा "Job stuck" warning देखिन्छ
3. Retry click गर्नुस्
4. Still stuck → /vault/system-cleanup मा document हेर्नुस् → Reset

---

## PART 10: Testing SOP (Founder Checklist)

### Pre-Test: System Check
**Location:** /vault/system

- [ ] Firebase Auth: Signed in ✓
- [ ] R2 Storage: OK ✓  
- [ ] AI Provider: At least one green ✓
- [ ] Pipeline: Zero "अड्किएको" documents

### Test A: Document Pipeline Test
**Location:** /vault/documents

1. Upload a golden dataset document (e.g., Budget Speech 2083/84)
2. AI Analyze → wait 3 min → summary sensible? ✓
3. /vault/admin → Approve ✓
4. Extract Intelligence → wait 5 min → intel count > 0? ✓
5. /vault/system → this doc shows "healthy"? ✓
6. /janta → story cards from this document appear? ✓

**Screenshot if broken:** Document card का status + browser console (F12 → Console)

---

### Test B: Atomic Extraction Test
**Location:** /vault/documents → Atomic Queue

1. Set budget limit: $3
2. Constitution/Budget document select (knowledgeTier: foundation/national)
3. Run Queue
4. Wait 10-20 min
5. /vault/system-cleanup → document shows "Atomic atoms: XX" > 0? ✓
6. /vault/quality → records have evidence text? ✓

**Screenshot if broken:** Atomic Queue error message + atom count (0?)

---

### Test C: Economy Extraction Test
**Location:** /vault/economy

1. Budget Speech 2083/84 document select
2. Economy Extract click
3. Document Type: Budget Speech, Fiscal Year: 2083/84
4. Wait 10 min
5. Atom count > 50? ✓
6. Compare Years with 2082/83? ✓

**Screenshot if broken:** Economy extraction progress bar (stuck?) + atom count

---

### Test D: Knowledge Classification Test
**Location:** /vault/knowledge

1. "Scan" click after intel extract
2. Cards appear? ✓
3. Cards have evidence text? ✓
4. Approve 5+ cards
5. /janta → approved civic facts appear? ✓

**Screenshot if broken:** Empty knowledge queue + source document name

---

### Test E: Quality Gate Test
**Location:** /vault/quality

1. Records appear for recently extracted document? ✓
2. Some records have green "● Public" badge? ✓
3. Low score records — can Advance Verification click? ✓
4. Add constitutional ref (e.g., "31") → save works? ✓

**Screenshot if broken:** Quality score distribution + record count

---

### Test F: Public Civic Page Test
**Location:** /janta (public page, not vault)

1. Story cards load? ✓
2. TTS (text-to-speech) works on at least one card? ✓
3. Timeline view shows dates correctly? ✓
4. Sector filter works? ✓
5. No test/garbage data visible? ✓

**Screenshot if broken:** Exact card showing wrong content + sector shown

---

### Test G: Constitution Reader Test
**Location:** /constitution (public page)

1. Constitution tree loads? ✓
2. Part 1 → Articles visible? ✓
3. Search: "शिक्षा" → results appear? ✓
4. Article click → related intelligence sidebar shows? ✓

**Screenshot if broken:** Which part is broken + search term used

---

### Test H: Source Monitoring Test
**Location:** /vault/sources

1. "Check Now" click for any active source
2. Wait 30 seconds
3. New updates detected? (may be none if no new PDFs on government site)
4. Existing update cards show correctly? ✓
5. "Processed" button hides card? ✓

**Screenshot if broken:** Source name + error message shown

---

## PART 11: Golden Dataset for Testing

**Stabilization sprint सकिनु अघि यी documents मात्र upload गर्नुस्:**

| # | Document | Source | Gov Folder | Year |
|---|---|---|---|---|
| 1 | Constitution of Nepal | constitutionofnepal.gov.np | constitution | 2072 |
| 2 | NHRC Annual Report 2079/80 | nhrcnepal.org | citizen-intelligence | 2079/80 |
| 3 | CIAA Annual Report 2079/80 | ciaa.gov.np | policy-planning | 2079/80 |
| 4 | Budget Speech 2083/84 | mof.gov.np | budget-economy | 2083/84 |
| 5 | Budget Speech 2082/83 | mof.gov.np | budget-economy | 2082/83 |
| 6 | Monetary Policy 2083/84 | nrb.org.np | budget-economy | 2083/84 |
| 7 | Policy and Program 2083/84 | opmcm.gov.np | policy-planning | 2083/84 |
| 8 | Education Policy | moe.gov.np | policy-planning | latest |

**Sprint Complete = यी 10 documents सबैको:**
- ✓ Upload done
- ✓ AI Analysis done
- ✓ Admin Approved
- ✓ Intelligence Extracted (intelCount > 0)

**Random documents upload नगर्नुस् अहिले।**
Pipeline test गर्न real official documents मात्र।

---

## PART 12: Troubleshooting Guide

### Problem 1: Extraction Stuck / Loading
**Symptoms:** Progress bar hours सम्म loading, no completion

**What happened:** AI job midway fail भयो।

**Founder action:**
1. Page refresh गर्नुस्
2. /vault/system-cleanup → document find → Reset click
3. फेरि Extract Intelligence run गर्नुस्
4. Still stuck → /vault/system → AI Provider status check

---

### Problem 2: Job Timeout
**Symptoms:** "Timed out" वा "Job stuck" warning

**What happened:** AI call server तर्फबाट failed।

**Founder action:**
1. /vault/economy (economy jobs को लागि) → Retry
2. /vault/documents → Re-extract
3. 3 times retry गरेपछि पनि fail → developer contact

---

### Problem 3: 0 Atoms Generated
**Symptoms:** Extract भयो तर count = 0

**What happened:** Document type mismatch, या document unreadable।

**Founder action:**
1. Document type सही छ? (Economy Extract मा Budget Speech select गर्नुस्)
2. PDF scanned image हो? (OCR fail हुन सक्छ)
3. Document too short? (2 pages below — meaningful extraction हुँदैन)
4. Developer लाई: document ID र document type बताउनुस्

---

### Problem 4: Public Card Not Showing
**Symptoms:** Intelligence extract भयो तर /janta मा केही देखिँदैन

**What happened:** Knowledge Queue मा approve भएको छैन।

**Founder action:**
1. /vault/knowledge → Scan click
2. Cards आए? Approve गर्नुस्
3. Cards नआए? Intelligence records "publishToJanta" flag नभएको हुन सक्छ
4. Quality score 80+ छ? (/vault/quality)

---

### Problem 5: Classification Suggestion Missing
**Symptoms:** /vault/knowledge मा Scan गरेपछि पनि cards आएनन्

**What happened:** Intel records छैन, वा already classified छन्।

**Founder action:**
1. /vault/system-cleanup → document को Intel count हेर्नुस्
2. Intel count = 0 → Extract Intelligence पहिले run गर्नुस्
3. Intel count > 0 तर no cards → Already scanned हुनसक्छ (green "Approved" status)

---

### Problem 6: Economy Document Not Found
**Symptoms:** /vault/economy मा document list मा देखिँदैन

**What happened:** Document upload हुँदा "economy" metadata सही set भएन।

**Founder action:**
1. /vault/documents → document find
2. Gov Folder: "budget-economy" छ? (edit गर्नुस् यदि होइन)
3. Category correct छ?
4. /vault/economy refresh गर्नुस्

---

### Problem 7: Fiscal Year Missing
**Symptoms:** Economy Extract modal मा year field blank हुँदा extract fail

**Founder action:**
Budget Speech 2083/84 → Year field: `2083/84` (dash with slash format)
Format: YYYY/YY (Nepali fiscal year format)

---

### Problem 8: Duplicate Document
**Symptoms:** Same document twice upload भयो

**Founder action:**
1. /vault/system-cleanup → दुवै documents हेर्नुस्
2. कुन पुरानो हो, कुन नयाँ — intel count हेरेर decide
3. Empty/no-intel one → Delete
4. Full pipeline one → Keep

---

### Problem 9: Already Extracted Doc Appears Again in Queue
**Symptoms:** Atomic Queue मा already done document फेरि देखिन्छ

**Explanation:** यो bug fix भएको छ। Atomic Queue ले Firestore truth check गर्छ।
यदि पनि देखिन्छ:
1. /vault/system-cleanup → document को "Atomic atoms" count हेर्नुस्
2. Count > 0 छ → Queue automatically hide गर्नेछ (page refresh गर्नुस्)
3. Count = 0 → Extract सँच्चै भएको छैन — run गर्नुस्

---

### Problem 10: Source Watcher Finds Nothing
**Symptoms:** /vault/sources → Check Now → No new updates

**Explanation:** यो normal हुन सक्छ — government site मा नयाँ PDF छैन।

**Founder action:**
1. Manual check: mof.gov.np, nrb.org.np — नयाँ PDF release भयो?
2. Release भयो → Manual upload गर्नुस् /vault/documents बाट
3. Source monitoring सबै sites cover गर्दैन — manual vigilance चाहिन्छ

---

## PART 13: ZZC as a Factory — Business Language Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAW MATERIAL    → Official government documents
                  (Constitution, Budget, Reports)

INTAKE          → /vault/documents Upload
                  (Documents safely stored in R2 cloud)

MACHINE 1       → AI Analyze
(Fast, cheap)     Summary, metadata, Nepali explainer

QUALITY GATE 1  → /vault/admin Review
                  (Founder approves before production)

MACHINE 2       → Intelligence Extract
(Core machine)    10-100+ intelligence records per document

MACHINE 3       → Atomic Deep Extract
(Premium machine) Page-level evidence, strongest proof
(Optional)        Only for foundation-tier documents

MACHINE 4       → Economy Extract
(Specialized)     Budget data, sector breakdown, year comparison

QUALITY CONTROL → /vault/quality Review
                  Quality score, verification, evidence check

PACKAGING       → /vault/knowledge Classification
                  "This fact goes to Civic Chautari"
                  "This data goes to Economy section"

CERTIFICATE     → Evidence box = Certificate of Authenticity
                  Every claim must show its source

SHOWROOM        → Public pages: /janta, /constitution, /finance
(Customer view)   Citizens read, search, learn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOUNDER ROLE    → Final Quality Approver
                  (Stage 2, 4, 6, 7 — all require founder action)

AI ROLE         → Production Worker
                  (Fast, consistent, but not perfect)
                  (Recommends — never decides alone)

PUBLIC USER     → Customer
                  (Reads finished product only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## PART 14: Most Important Rules — Quick Reference

### Before clicking any AI button, ask yourself:

1. **Document real छ?** Official source URL छ?
2. **Already done छैन?** System-cleanup मा intel count हेर्नुस्
3. **Budget set छ?** Atomic Extract को लागि limit set गर्नुस्
4. **Evidence छ?** Knowledge Queue approve गर्दा evidence हेर्नुस्
5. **Approve गरिसकेँ?** Intelligence Extract को लागि admin approve गर्नुस् पहिले

### After every work session:

- [ ] /vault/system-cleanup — नयाँ "Delete" suggestions handle गर्नुस्
- [ ] /vault/system — कुनै "अड्किएको" docs छन् कि?
- [ ] /vault/knowledge — pending classification approve गर्नुस्
- [ ] /janta — public page preview गर्नुस्

### Emergency: Something broke

1. **Document delete नगर्नुस्** — document always safe छ R2 मा
2. /vault/system-cleanup → Reset (gentle fix)
3. Still broken → screenshot लिनुस् + developer contact
4. **Force-push/force-delete नगर्नुस्** — data loss हुन सक्छ

---

*ZZC Founder Operating Manual v1.0*
*तपाईंको हरेक action Nepal को civic intelligence मा योगदान हो।*
*— Jeevan Regmi*
