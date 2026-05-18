#!/usr/bin/env bash
# ZZC One-shot setup script
# Run once after placing serviceAccountKey-prod.json in the project root.
#
# Usage:
#   bash scripts/setup.sh
#
# What it does:
#   1. Verifies the correct Firebase project is configured
#   2. Seeds 15 signal routes into Firestore
#   3. Resolves your Firebase UID
#   4. Seeds the Nepal Policy FY 2083/84 intelligence document + 12 signals + 5 queue items
#
# Prerequisites:
#   - serviceAccountKey-prod.json in project root (for zeneration-z-chautari)
#   - node >=18 and npm packages installed (npm ci)

set -e

PROJECT="zeneration-z-chautari"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ZZC System Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verify key file
if [ ! -f "serviceAccountKey-prod.json" ]; then
  echo "❌  serviceAccountKey-prod.json not found."
  echo ""
  echo "   Get it from:"
  echo "   https://console.firebase.google.com/project/${PROJECT}/settings/serviceaccounts/adminsdk"
  echo "   → Generate new private key → save as serviceAccountKey-prod.json"
  echo ""
  exit 1
fi

PROJ=$(node -e "console.log(require('./serviceAccountKey-prod.json').project_id)" 2>/dev/null)
if [ "$PROJ" != "$PROJECT" ]; then
  echo "❌  serviceAccountKey-prod.json is for project '$PROJ', expected '$PROJECT'."
  echo "   Download the key from the correct Firebase project:"
  echo "   https://console.firebase.google.com/project/${PROJECT}/settings/serviceaccounts/adminsdk"
  exit 1
fi

echo "✓  Service account verified: $PROJECT"
echo ""

# Step 1: Seed signal routes
echo "Step 1 — Seeding signal routes..."
SA_KEY_PATH=serviceAccountKey-prod.json node scripts/seed-signal-routes.js
echo ""

# Step 2: Seed policy signals
echo "Step 2 — Seeding Nepal Policy FY 2083/84 pipeline..."
SA_KEY_PATH=serviceAccountKey-prod.json node scripts/seed-policy-signals.js
echo ""

# Step 3: Deploy Firestore + Storage rules
echo "Step 3 — Deploying Firestore and Storage security rules..."
if command -v firebase &> /dev/null; then
  firebase deploy --only firestore:rules,storage --project "$PROJECT"
  echo ""
else
  echo "⚠  Firebase CLI not found — skipping rules deploy."
  echo "   Install: npm install -g firebase-tools"
  echo "   Then run: firebase deploy --only firestore:rules,storage --project $PROJECT"
  echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo "  Setup complete."
echo ""
echo "  Next steps:"
echo "  1. Open vault: https://zzc.jeevanregmi.com.np/vault/documents"
echo "  2. You should see the Nepal Policy document"
echo "  3. Click 'Process with AI' to run Claude extraction"
echo "  4. After processing, go to Admin Vault to approve"
echo ""
echo "  For local dev without signing in:"
echo "  .env.development.local is already configured with DEV_VAULT_MODE=true"
echo "  Run: npm run dev → http://localhost:3000/vault/documents"
echo "═══════════════════════════════════════════════════════════"
echo ""
