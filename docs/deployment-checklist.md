# ZZC Deployment Validation Checklist

Run after every deploy to `zzc.jeevanregmi.com.np`.

---

## 1. Build Validation

Before deploying:

```powershell
npm run build
```

Expected: zero TypeScript errors, all routes listed in output, no missing module warnings.

Critical routes to see in build output:
- `○ /` (homepage)
- `○ /calculator`
- `○ /compare`
- `○ /eligibility`
- `○ /recommend`
- `● /scheme/[id]` (SSG with 28 static paths)
- `○ /vault` and all `/vault/*` subroutes

---

## 2. Post-Deploy Route Check

Fetch each route after deploy. Expected: HTTP 200, page loads correctly.

### Public Routes

| Route | Expected Content | Status |
|-------|-----------------|--------|
| `/` | Scheme grid, category filter cards | ✅ / ❌ |
| `/calculator` | Tab bar with 6 tabs, SIP tab default | ✅ / ❌ |
| `/compare` | 28 scheme comparison table | ✅ / ❌ |
| `/eligibility` | Employment type selector | ✅ / ❌ |
| `/recommend` | Category selection (4 options) | ✅ / ❌ |
| `/scheme/52hlCrPlU3Ba1OsosHxg` | Scheme detail page | ✅ / ❌ |
| `/robots.txt` | Plaintext robots file | ✅ / ❌ |
| `/sitemap.xml` | XML sitemap | ✅ / ❌ |

### Vault Routes (auth-gated — shows login form when unauthenticated)

| Route | Expected | Status |
|-------|----------|--------|
| `/vault` | Login form or Command Center | ✅ / ❌ |
| `/vault/content` | Content Pipeline page | ✅ / ❌ |
| `/vault/content/ai-studio` | AI Studio with two generators | ✅ / ❌ |
| `/vault/media` | Media grid + upload button | ✅ / ❌ |
| `/vault/business` | BI dashboard | ✅ / ❌ |
| `/vault/analytics` | Stub with roadmap | ✅ / ❌ |
| `/vault/tasks` | Stub with roadmap | ✅ / ❌ |
| `/vault/calendar` | Stub with roadmap | ✅ / ❌ |
| `/vault/finance` | Stub with roadmap | ✅ / ❌ |
| `/vault/deploy` | Stub with roadmap | ✅ / ❌ |

---

## 3. Navigation Verification

Test these click flows:

```
Homepage → scheme card → /scheme/[id]        (SPA route, no full reload)
/scheme/[id] → ← button → /                 (SPA route)
/scheme/[id] → Calculator CTA → /calculator  (SPA route)
/scheme/[id] → AI CTA → /recommend          (SPA route)
Public nav → Dashboard → → /vault            (SPA route)
/vault (logged in) → sidebar item → sub-page (SPA route, sidebar stays)
```

All of these must be SPA navigations (no full page reload, URL changes in address bar without white flash).

---

## 4. API Function Health Check

```powershell
# /api/recommend — expects 200 with JSON
Invoke-WebRequest -Uri "https://zzc.jeevanregmi.com.np/api/recommend" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"category":"investment","age":25,"income":37500,"risk":"Medium"}'

# /api/generate-script — expects 200 with JSON
Invoke-WebRequest -Uri "https://zzc.jeevanregmi.com.np/api/generate-script" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"topic":"EPF basics","format":"short","targetMinutes":1}'
```

Expected: `StatusCode 200`, response body contains valid JSON.

---

## 5. Firebase Connectivity Check

Open browser devtools → Network tab on homepage:
- `structuredSchemes` Firestore request → status 200
- Scheme cards populate within 2 seconds on good connection

---

## 6. Mobile UX Check (360px viewport)

- Homepage: category cards 2-column grid ✅
- Scheme cards: single column ✅
- Navbar: horizontal scroll row visible ✅
- Calculator: tab bar scrollable ✅
- Vault: hamburger menu opens full nav ✅

---

## 7. Domain & SSL Check

```powershell
Invoke-WebRequest -Uri "https://zzc.jeevanregmi.com.np" -Method HEAD
```

Expected: `StatusCode 200`, `X-Cloudflare-Cache` header present.

If `StatusCode 521` or `522`: Cloudflare origin error — check Pages deployment status.
If `StatusCode 404`: Custom domain not configured — go to Cloudflare Pages → Custom Domains.

---

## 8. Deploy Commands

```powershell
# Build
npm run build

# Deploy (creates preview URL)
npx wrangler pages deploy out --project-name=zeneration-z-chautari

# Push to GitHub (triggers any future CI)
git push origin main
```

Production domain (`zzc.jeevanregmi.com.np`) serves the **latest deployment** automatically once custom domain is configured in Cloudflare Pages.

---

## Known Issues Log

| Date | Issue | Status | Fix |
|------|-------|--------|-----|
| 2026-05-12 | Custom domain not yet mapped in Cloudflare | ⚠️ Pending | Manual step: Cloudflare Pages → Custom Domains → Add `zzc.jeevanregmi.com.np` |
