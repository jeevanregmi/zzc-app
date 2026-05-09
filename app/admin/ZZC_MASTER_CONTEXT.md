# Zeneration Z Chautari (ZZC)

---

# PROJECT VISION

Mission:

Nepali beginners लाई सरल भाषामा investment,
saving, pension, insurance, retirement education दिने platform।

Goal:

नेपालको सबैभन्दा beginner-friendly fintech education platform बनाउने।

---

# CURRENT FEATURES

Completed Features:

- Search Feature
- Filter Feature
- Scheme Details Page
- Daily Compounding Calculator
- Monthly Saving Calculator
- Graph Feature
- Compare Feature
- Advanced Compare UI
- Firebase Integration
- Dynamic Scheme Pages

---

# DATABASE STRUCTURE

Collection Name:

structuredSchemes

Main Fields:

- title
- organization
- category
- subcategory
- summary
- nepaliSummary
- interestRate
- benefits
- eligibility
- documents
- loanLimit
- medicalCoverage
- pension
- insurance
- riskLevel
- compareTags
- calculatorEnabled
- graphEnabled

---

# CURRENT UI STYLE

Theme:

- Black background
- Green fintech neon design
- Mobile first
- Gen Z Nepali style
- Simple Nepali explanation
- Beginner friendly

---

# CURRENT FILE STRUCTURE

Main Files:

app/page.tsx
→ Homepage

app/scheme/[id]/page.tsx
→ Scheme Details Page

app/admin/page.tsx
→ Admin Panel

firebase.ts
→ Firebase Configuration

app/scripts/buildStructuredData.js
→ Structured JSON Builder

app/scripts/uploadStructured.js
→ Firestore Upload Script

---

# CURRENT FEATURES INSIDE SCHEME PAGE

- Overview
- Benefits
- Nepali Explanation
- Daily Interest Calculator
- Monthly SIP Calculator
- Graph Projection
- Compare Engine

---

# CURRENT ORGANIZATIONS

- EPF
- CIT
- SSF

---

# CURRENT CATEGORIES

- Investment
- Pension
- Loan
- Healthcare
- Insurance
- Retirement
- Social Security

---

# EPF SCHEMES ADDED

Loan Services:

- Special Loan
- House Loan
- Education Loan
- Easy Loan
- House Maintenance Loan
- Land Purchase Loan

Social Security Services:

- Maternity and Child Care
- Funeral Grants
- Accident Compensation Scheme
- Healthcare Plan

Other:

- Provident Fund
- Pension and Gratuity

---

# NEXT TASKS

- Admin Upload Panel
- JSON Paste Upload System
- EPF Full Database
- CIT Full Database
- SSF Full Database
- AI Recommendation Engine
- Eligibility Checker
- Smart Compare
- Retirement Projection
- User Dashboard
- Bookmark Feature

# IMPORTANT COMMANDS

Run Development Server:

```bash
npm run dev
```
---

# DATA PIPELINE FLOW

Raw HTML/PDF Files:

Documents/44

↓

cleanImporter.js

↓

cleanSchemes.json

↓

buildStructuredData.js

↓

structuredSchemes.json

↓

uploadStructured.js

↓

Firebase Firestore

↓

Frontend Render

↓

ZZC Website Live

---

# HOW TO IMPORT NEW SCHEMES

STEP 1:

Save HTML files inside:

Documents/44

STEP 2:

Run:

```bash
node app/scripts/cleanImporter.js