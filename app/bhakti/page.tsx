import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bhakti Chautari — भक्ति ज्ञान",
  description:
    "Nepal's devotional knowledge chautari. Sanskrit shloka meaning, bhajan learning, sacred chambers — source-grounded and founder-curated.",
};

const CHAMBERS = [
  {
    icon:    "🔱",
    name:    "Shiva Chamber",
    nepali:  "शिव चैम्बर",
    desc:    "Rudrashtakam, Nirvana Shatakam, Shiva Tandava — Advaita wisdom and Shankara texts.",
    color:   "indigo",
    status:  "निर्माणाधीन",
  },
  {
    icon:    "🦚",
    name:    "Krishna Chamber",
    nepali:  "कृष्ण चैम्बर",
    desc:    "Bhagavad Gita chapters, leela stories, Srimad Bhagavatam wisdom — Sanskrit explained.",
    color:   "amber",
    status:  "निर्माणाधीन",
  },
  {
    icon:    "🪷",
    name:    "Devi Chamber",
    nepali:  "देवी चैम्बर",
    desc:    "Durga Saptashati, Lalita Sahasranama, Devi Mahatmya — Shakti intelligence.",
    color:   "rose",
    status:  "निर्माणाधीन",
  },
  {
    icon:    "🐒",
    name:    "Hanuman Chamber",
    nepali:  "हनुमान चैम्बर",
    desc:    "Hanuman Chalisa, Sundar Kanda, Ramayana leela — devotional wisdom and bhakti.",
    color:   "orange",
    status:  "निर्माणाधीन",
  },
] as const;

const colorMap = {
  indigo: {
    border: "border-indigo-800/40",
    bg:     "bg-indigo-950/10",
    icon:   "text-indigo-300",
    title:  "text-indigo-300",
    dot:    "bg-indigo-600",
    badge:  "bg-indigo-950/60 text-indigo-600 border-indigo-800/50",
  },
  amber: {
    border: "border-amber-800/40",
    bg:     "bg-amber-950/10",
    icon:   "text-amber-300",
    title:  "text-amber-300",
    dot:    "bg-amber-600",
    badge:  "bg-amber-950/60 text-amber-600 border-amber-800/50",
  },
  rose: {
    border: "border-rose-800/40",
    bg:     "bg-rose-950/10",
    icon:   "text-rose-300",
    title:  "text-rose-300",
    dot:    "bg-rose-600",
    badge:  "bg-rose-950/60 text-rose-600 border-rose-800/50",
  },
  orange: {
    border: "border-orange-800/40",
    bg:     "bg-orange-950/10",
    icon:   "text-orange-300",
    title:  "text-orange-300",
    dot:    "bg-orange-600",
    badge:  "bg-orange-950/60 text-orange-600 border-orange-800/50",
  },
};

export default function BhaktiPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
        <span>/</span>
        <span className="text-violet-500">Bhakti Chautari</span>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🛕</span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Bhakti Chautari</h1>
            <p className="text-violet-500 text-sm font-semibold">भक्ति ज्ञान चौतारी</p>
          </div>
        </div>
        <p className="text-zinc-400 text-base max-w-xl leading-relaxed">
          Sacred texts, Sanskrit shloka meanings, bhajan learning, and devotional wisdom —
          source-grounded and founder-curated. No fake guru AI.
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-700" />
          <span className="text-violet-700 text-xs font-mono">Temple Vault → Review → Approve → Publish</span>
        </div>
      </div>

      {/* Pipeline note — honest, up front */}
      <div className="rounded-2xl border border-violet-900/40 bg-violet-950/10 px-5 py-4 space-y-2">
        <p className="text-violet-300 text-sm font-bold">🛕 कसरी काम गर्छ</p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Bhakti Chautari को सबै content Temple Vault बाट आउँछ। Founder ले sacred texts upload गर्नुहुन्छ,
          shloka extract हुन्छ, character graph बन्छ, र तब मात्र approve गरेर यहाँ publish हुन्छ।
          कुनै auto-generated spiritual content छैन।
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {["sacred texts", "shloka atoms", "character graph", "founder review", "publish"].map((step, i) => (
            <div key={step} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              {i > 0 && <span className="text-zinc-800">→</span>}
              <span className="px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/40">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chambers */}
      <div className="space-y-3">
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">Chambers — आउँदैछ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHAMBERS.map(({ icon, name, nepali, desc, color, status }) => {
            const c = colorMap[color];
            return (
              <div
                key={name}
                className={`flex flex-col gap-3 p-5 rounded-2xl border ${c.border} ${c.bg} opacity-80`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-2xl`}>{icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
                    {status}
                  </span>
                </div>
                <div>
                  <p className={`font-black text-base ${c.title}`}>{name}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{nepali}</p>
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* What's coming */}
      <div className="space-y-3">
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">Coming</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-600">
          {[
            { icon: "🕉", label: "Shloka Explorer" },
            { icon: "🎵", label: "Bhajan Learning" },
            { icon: "📖", label: "Leela Stories" },
            { icon: "🔤", label: "Sanskrit Meaning" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-800/50 bg-zinc-950/30"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Back to gateway */}
      <div className="pt-4 border-t border-zinc-900">
        <Link
          href="/"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition flex items-center gap-2"
        >
          ← ZZC Gateway मा फर्कनुहोस्
        </Link>
      </div>

    </main>
  );
}
