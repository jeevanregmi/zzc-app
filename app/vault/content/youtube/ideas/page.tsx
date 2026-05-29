"use client";

import Link from "next/link";
import type { VideoIdea } from "../../../../../lib/types/content";

const IDEAS: VideoIdea[] = [
  {
    id: "epf-explained-v1",
    title: "नेपालमा EPF कसरी काम गर्छ? | Complete Guide",
    hook: "तपाईंको तलबबाट काटिने पैसा कहाँ जान्छ — र 20 वर्षमा कति हुन्छ?",
    pillar: "epf-ssf",
    format: "long-form",
    estimatedMin: 12,
    cta: "ZZC Calculator → EPF projection",
    priority: "high",
    status: "scripting",
    tags: ["EPF", "retirement", "नेपाल", "salary"],
    createdAt: "2026-05-11",
  },
  {
    id: "ssf-vs-epf-v1",
    title: "SSF vs EPF — नेपालको कुन Pension राम्रो?",
    hook: "दुईवटा pension fund — तपाईंले कुन रोज्ने? AI ले भन्छ।",
    pillar: "epf-ssf",
    format: "long-form",
    estimatedMin: 10,
    cta: "ZZC AI Recommend → Pension category",
    priority: "high",
    status: "idea",
    tags: ["SSF", "EPF", "pension", "comparison"],
    createdAt: "2026-05-11",
  },
  {
    id: "sip-power-v1",
    title: "SIP: ₹5000/महिना → 20 वर्षमा कति? Nepal Scenario",
    hook: "₹5000 महिनाको SIP — नेपालको inflation मा real return कति हुन्छ?",
    pillar: "calculator-demo",
    format: "long-form",
    estimatedMin: 11,
    cta: "ZZC SIP Calculator (5 Nepal scenarios)",
    priority: "high",
    status: "idea",
    tags: ["SIP", "investment", "calculator", "compound interest"],
    createdAt: "2026-05-11",
  },
  {
    id: "cit-for-genz-v1",
    title: "CIT Tax नेपालमा — Gen Z को लागि सरल गाइड",
    hook: "Freelancer हो? First job? CIT कसरी compute हुन्छ जान्नुस्।",
    pillar: "cit-tax",
    format: "long-form",
    estimatedMin: 13,
    cta: "ZZC Scheme Browser → CIT",
    priority: "medium",
    status: "idea",
    tags: ["CIT", "tax", "Nepal", "income tax", "freelancer"],
    createdAt: "2026-05-11",
  },
  {
    id: "ai-recommend-demo-v1",
    title: "AI ले मेरो लागि Nepal investment छान्यो — देख्नुस् के भन्यो",
    hook: "मैले ZZC AI लाई सोधेँ: 26 वर्षमा best investment के हो Nepal मा?",
    pillar: "calculator-demo",
    format: "long-form",
    estimatedMin: 9,
    cta: "Try ZZC AI Recommend (free)",
    priority: "high",
    status: "idea",
    tags: ["AI", "recommendation", "ZZC", "fintech", "demo"],
    createdAt: "2026-05-11",
  },
  {
    id: "nepse-beginner-v1",
    title: "NEPSE मा कसरी Invest गर्ने? 2026 Beginner Guide",
    hook: "NEPSE account खोल्नेदेखि पहिलो share किन्नेसम्म — step by step",
    pillar: "finance",
    format: "long-form",
    estimatedMin: 15,
    cta: "ZZC Portfolio tab → NEPSE allocation",
    priority: "medium",
    status: "idea",
    tags: ["NEPSE", "stocks", "investing", "beginner", "Nepal"],
    createdAt: "2026-05-11",
  },
  {
    id: "emergency-fund-v1",
    title: "Emergency Fund: नेपालमा कति राख्ने? ZZC Health Calculator",
    hook: "Job गयो भने 6 महिना कसरी बाँच्ने — exact calculation",
    pillar: "calculator-demo",
    format: "long-form",
    estimatedMin: 10,
    cta: "ZZC Health Calculator → Emergency fund",
    priority: "medium",
    status: "idea",
    tags: ["emergency fund", "financial health", "savings", "Nepal"],
    createdAt: "2026-05-11",
  },
  {
    id: "loan-emi-v1",
    title: "Home Loan Nepal: EMI Calculator + DTI Ratio Guide",
    hook: "₹50 lakh loan लिँदा total कति तिर्नुपर्छ? Bank ले नभन्ने कुरा",
    pillar: "calculator-demo",
    format: "long-form",
    estimatedMin: 11,
    cta: "ZZC Loan Calculator → Amortization",
    priority: "medium",
    status: "idea",
    tags: ["loan", "EMI", "home loan", "Nepal", "DTI"],
    createdAt: "2026-05-11",
  },
  {
    id: "portfolio-optimizer-v1",
    title: "नेपाली Gen Z को लागि Perfect Portfolio | AI Allocation",
    hook: "25 वर्षमा ₹10,000/महिना — EPF, NEPSE, CIT, SSF कसरी बाँड्ने?",
    pillar: "calculator-demo",
    format: "long-form",
    estimatedMin: 14,
    cta: "ZZC Portfolio tab → AI allocation",
    priority: "high",
    status: "idea",
    tags: ["portfolio", "allocation", "Gen Z", "Nepal", "AI"],
    createdAt: "2026-05-11",
  },
  {
    id: "inflation-real-returns-v1",
    title: "Nepal Inflation vs Your Savings: Are You Actually Losing Money?",
    hook: "FD मा 8% return छ — तर inflation 6% छ। Real return कति?",
    pillar: "finance",
    format: "long-form",
    estimatedMin: 10,
    cta: "ZZC SIP → Real/Nominal toggle",
    priority: "medium",
    status: "idea",
    tags: ["inflation", "real return", "FD", "Nepal economics"],
    createdAt: "2026-05-11",
  },
];

const PRIORITY_COLOR: Record<string, string> = {
  high:   "bg-green-900/40 text-green-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  low:    "bg-zinc-800 text-zinc-500",
};

const STATUS_COLOR: Record<string, string> = {
  idea:       "bg-zinc-800 text-zinc-500",
  scripting:  "bg-blue-900/40 text-blue-400",
  production: "bg-purple-900/40 text-purple-400",
  editing:    "bg-orange-900/40 text-orange-400",
  ready:      "bg-yellow-900/40 text-yellow-400",
  published:  "bg-green-900/40 text-green-400",
  archived:   "bg-zinc-900 text-zinc-600",
};

export default function IdeasPage() {
  const highPriority = IDEAS.filter(i => i.priority === "high");
  const rest = IDEAS.filter(i => i.priority !== "high");

  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <Link href="/vault/content/youtube" className="text-zinc-600 hover:text-zinc-400 text-sm">YouTube</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Ideas</h1>
          <span className="ml-auto text-xs text-zinc-600">{IDEAS.length} ideas</span>
        </div>

        {/* High priority */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            High Priority — Ship First
          </h2>
          <div className="space-y-2">
            {highPriority.map(idea => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </section>

        {/* Rest */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Backlog</h2>
          <div className="space-y-2">
            {rest.map(idea => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </section>

      </div>

  );
}

function IdeaCard({ idea }: { idea: VideoIdea }) {
  return (
    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <span className="font-semibold text-sm text-white flex-1 min-w-0">{idea.title}</span>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[idea.priority]}`}>{idea.priority}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[idea.status]}`}>{idea.status}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400 mb-2 italic">"{idea.hook}"</p>
      <div className="flex gap-4 text-xs text-zinc-600 flex-wrap">
        <span>⏱ {idea.estimatedMin} min</span>
        <span>📌 {idea.pillar.replace(/-/g, " ")}</span>
        <span className="text-green-500">→ {idea.cta}</span>
      </div>
    </div>
  );
}
