"use client";

import { createContext, useContext, useState, useEffect } from "react";

// ─── Glossary — technical term → plain Nepali explanation ─────────────────────

export interface GlossaryEntry {
  plain:   string;   // shorter plain-English label
  nepali:  string;   // Nepali label
  explain: string;   // one-sentence Nepali explanation
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  "AI Summary": {
    plain:   "AI Summary",
    nepali:  "AI ले बुझेको कुरा",
    explain: "AI ले document पढेर आफ्नै भाषामा संक्षेप लेखेको — मूल document को ठ्याक्कै अनुवाद होइन।",
  },
  "Key Insights": {
    plain:   "Key Points",
    nepali:  "मुख्य कुराहरू",
    explain: "AI ले document बाट निकालेका सबभन्दा महत्वपूर्ण जानकारी — content बनाउन सजिलो होस् भनेर।",
  },
  "Content Ideas": {
    plain:   "Content Ideas",
    nepali:  "Content बनाउने ideas",
    explain: "यो document बाट YouTube, Instagram, Facebook मा के-के बनाउन सकिन्छ भनेर AI ले सुझाव दिएको।",
  },
  "Source Trace": {
    plain:   "Source",
    nepali:  "स्रोत",
    explain: "यो content कुन document बाट आयो? Accountability का लागि record राखिन्छ।",
  },
  "Admin Vault": {
    plain:   "Review Center",
    nepali:  "Admin Review",
    explain: "AI ले बनाएको content publish गर्नु अघि तपाईंले approve/reject गर्ने ठाउँ।",
  },
  "Confidence": {
    plain:   "Reliability Score",
    nepali:  "भरोसाको score",
    explain: "AI लाई यो document कति reliable लाग्यो — 80%+ = भरोसायोग्य, 50% तल = सावधानी।",
  },
  "Trust Score": {
    plain:   "Trust Score",
    nepali:  "भरोसा score",
    explain: "Source कति official छ, AI कति confident छ, र review status — सबै मिलाएर बनेको score।",
  },
  "Content Queue": {
    plain:   "Content List",
    nepali:  "Content Queue",
    explain: "Publish गर्नु अघिको approved ideas को list — यहाँबाट AI Studio मा script बनाउन जाने।",
  },
  "Signal Feed": {
    plain:   "News Feed",
    nepali:  "Signal Feed",
    explain: "Nepal को latest financial र government news — AI ले automatically collect गर्छ।",
  },
  "AI Paused": {
    plain:   "Analysis Stopped",
    nepali:  "AI analysis रोकिएको",
    explain: "Document upload भयो तर AI analysis सकिएन — quota सकियो वा network error। Document सुरक्षित छ।",
  },
  "ai_ready": {
    plain:   "Analysis Done",
    nepali:  "AI analysis सकियो",
    explain: "AI ले document पढिसक्यो — अब admin review गर्नुपर्छ।",
  },
  "pending_review": {
    plain:   "Waiting for Approval",
    nepali:  "Review को पर्खाइमा",
    explain: "AI analysis सकिसक्यो — तपाईंले Admin Vault मा गएर approve/reject गर्नुपर्छ।",
  },
  "Hook": {
    plain:   "Opening line",
    nepali:  "शुरुआतको line",
    explain: "Video को पहिलो 3 seconds — यही line ले viewer लाई रोक्छ। सबभन्दा महत्वपूर्ण भाग।",
  },
  "Brief": {
    plain:   "Content Plan",
    nepali:  "Content को plan",
    explain: "Video बनाउनु अघिको plan — के भन्ने, कसलाई भन्ने, किन भन्ने।",
  },
  "CTA": {
    plain:   "End Message",
    nepali:  "अन्तिम message",
    explain: "Video को अन्तमा viewers लाई के गर्न भन्ने — Subscribe, Comment, वा website visit।",
  },
  "Long-form": {
    plain:   "Long Video",
    nepali:  "लामो video",
    explain: "5 मिनेट वा बढी को video — YouTube मा राम्रो हुन्छ।",
  },
  "Shorts": {
    plain:   "Short Video",
    nepali:  "छोटो video",
    explain: "60 second सम्मको vertical video — YouTube Shorts, Instagram Reels, TikTok।",
  },
  "Carousel": {
    plain:   "Image Series",
    nepali:  "image series",
    explain: "एकपछि अर्को image — Instagram मा swipe गर्ने post।",
  },
  "Taxonomy": {
    plain:   "Categories",
    nepali:  "Categories",
    explain: "AI ले signal वा document लाई कुन topic मा classify गर्यो — Finance, Youth, Policy जस्ता।",
  },
  "Explainer": {
    plain:   "Teaching Video",
    nepali:  "सिकाउने video",
    explain: "कुनै जटिल topic सजिलो भाषामा explain गर्ने video।",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface LearningModeCtx {
  on:     boolean;
  toggle: () => void;
  label:  (term: string) => string;
}

const LearningModeContext = createContext<LearningModeCtx>({
  on:     false,
  toggle: () => {},
  label:  (t) => t,
});

export function LearningModeProvider({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(localStorage.getItem("zzc-learn") === "1");
  }, []);

  const toggle = () => {
    setOn(prev => {
      const next = !prev;
      localStorage.setItem("zzc-learn", next ? "1" : "0");
      return next;
    });
  };

  // Returns the plain Nepali label when Learning Mode is on
  const label = (term: string): string =>
    on ? (GLOSSARY[term]?.nepali ?? term) : term;

  return (
    <LearningModeContext.Provider value={{ on, toggle, label }}>
      {children}
    </LearningModeContext.Provider>
  );
}

export function useLearningMode() {
  return useContext(LearningModeContext);
}
