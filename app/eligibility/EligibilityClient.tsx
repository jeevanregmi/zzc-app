"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

type EmploymentType =
  | "government"
  | "private_formal"
  | "self_employed"
  | "migrant"
  | "student"
  | "";

interface UserProfile {
  employmentType: EmploymentType;
  age: number;
  isEPFMember: boolean;
  isSSFMember: boolean;
}

interface EligibilityResult {
  scheme: any;
  eligible: boolean;
  reason: string;
}

function checkEligibility(scheme: any, profile: UserProfile): EligibilityResult {

  const { age, employmentType, isEPFMember, isSSFMember } = profile;

  const result = (eligible: boolean, reason: string): EligibilityResult => ({
    scheme,
    eligible,
    reason,
  });

  // --- CIT योजनाहरू ---
  if (scheme.title === "Government Employees' Term Life Insurance Fund") {
    if (employmentType === "government")
      return result(true, "अनिवार्य — सरकारी सेवामा प्रवेश गर्दा स्वत: नामांकन हुन्छ");
    return result(false, "सरकारी कर्मचारी, सेना, प्रहरी र शिक्षकका लागि मात्र");
  }

  if (scheme.title === "NARC Employees' Term Life Insurance") {
    return result(false, "NARC (कृषि अनुसन्धान केन्द्र) का स्थायी कर्मचारीका लागि मात्र");
  }

  if (
    scheme.title === "Gratuity and Pension Fund Scheme" ||
    scheme.title === "Investor's Retirement Fund Scheme"
  ) {
    return result(false, "संस्था र संगठनका लागि मात्र — व्यक्तिगत लगानीकर्ताका लागि होइन");
  }

  if (scheme.title === "Citizens Pension Scheme") {
    if (age < 18) return result(false, "नामांकनको न्यूनतम उमेर १८ वर्ष हो");
    if (age > 50) return result(false, "अधिकतम प्रवेश उमेर ५० वर्ष हो");
    return result(true, "सबै नेपाली नागरिक (उमेर १८–५०) का लागि खुला — स्वरोजगारसहित");
  }

  if (scheme.title === "Citizens Unit Scheme") {
    return result(true, "सबै नेपाली नागरिकका लागि खुला — रोजगारीको शर्त छैन");
  }

  if (scheme.title === "Employee Savings Growth Retirement Scheme") {
    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant")
      return result(false, "तपाईंको नियोक्ताले यो योजनामा दर्ता भएको हुनुपर्छ");
    return result(true, "तपाईंको नियोक्ता (निजी वा सरकारी) ले दर्ता गरेमा उपलब्ध");
  }

  // --- EPF योजनाहरू ---
  if (scheme.organization === "EPF") {
    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant") {
      return result(false, "EPF दर्ता संगठनका कर्मचारीका लागि मात्र");
    }

    if (scheme.title === "EPF Provident Fund") {
      return result(true, "नियोक्ता EPF दर्ता भएमा उपलब्ध (औपचारिक निजी क्षेत्रका लागि अनिवार्य)");
    }

    if (scheme.title === "Pension and Gratuity Scheme") {
      if (!isEPFMember)
        return result(false, "सक्रिय EPF सदस्यता र २०+ वर्षको योगदान आवश्यक");
      return result(true, "EPF मा २०+ वर्षको योगदान पूरा भएपछि उपलब्ध");
    }

    if (scheme.title === "Maternity and Child Care Benefit") {
      return result(
        isEPFMember,
        isEPFMember
          ? "महिला EPF सदस्यका लागि — २ जना बालबालिकासम्म"
          : "सक्रिय EPF सदस्यता आवश्यक"
      );
    }

    if (scheme.title === "Funeral Grants") {
      return result(
        isEPFMember,
        isEPFMember
          ? "सबै सक्रिय EPF सदस्य र तिनका तत्काल परिवारका लागि"
          : "सक्रिय EPF सदस्यता आवश्यक"
      );
    }

    if (scheme.title === "Accident Compensation Scheme") {
      return result(
        isEPFMember,
        isEPFMember
          ? "सबै सक्रिय EPF सदस्यको कार्यस्थल दुर्घटनामा लागू"
          : "सक्रिय EPF सदस्यता आवश्यक"
      );
    }

    if (scheme.title === "Employee Healthcare Plan") {
      return result(
        isEPFMember,
        isEPFMember
          ? "EPF सदस्य र दर्ता परिवारका सदस्यका लागि"
          : "सक्रिय EPF सदस्यता आवश्यक"
      );
    }

    if (!isEPFMember)
      return result(false, "ऋण पाउन सक्रिय EPF सदस्यता आवश्यक");
    return result(true, "सक्रिय EPF सदस्यका लागि ऋण — न्यूनतम योगदान अवधि लागू");
  }

  // --- SSF योजनाहरू ---
  if (scheme.organization === "SSF") {
    if (scheme.title === "Foreign Employment Security Scheme") {
      if (employmentType === "migrant")
        return result(true, "विदेशमा काम गर्ने नेपालीका लागि — स्वैच्छिक आत्म-योगदान");
      return result(false, "मुख्यतः विदेशमा काम गर्ने नेपालीका लागि");
    }

    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant") {
      return result(false, "SSF मा नियोक्ता र कर्मचारी दुवैको योगदान आवश्यक");
    }

    if (!isSSFMember) {
      return result(false, "SSF दर्ता आवश्यक — आफ्नो नियोक्तालाई दर्ता गर्न अनुरोध गर्नुस्");
    }

    return result(true, "सक्रिय SSF योगदानकर्ताका लागि उपलब्ध");
  }

  return result(false, "तपाईंको प्रोफाइलबाट योग्यता निर्धारण गर्न सकिएन");
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; desc: string }[] = [
  { value: "government", label: "सरकारी कर्मचारी", desc: "निजामती सेवक, शिक्षक, सेना, प्रहरी" },
  { value: "private_formal", label: "निजी क्षेत्र (औपचारिक)", desc: "दर्ता कम्पनी, तलब स्लिप पाउनुहुन्छ" },
  { value: "self_employed", label: "स्वरोजगार", desc: "व्यवसायी, फ्रिल्यान्सर, किसान" },
  { value: "migrant", label: "वैदेशिक रोजगार", desc: "नेपाल बाहिर काम गर्दै" },
  { value: "student", label: "विद्यार्थी / बेरोजगार", desc: "हाल रोजगारी छैन" },
];

const orgColor: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
};

export default function EligibilityPage() {

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    employmentType: "",
    age: 30,
    isEPFMember: false,
    isSSFMember: false,
  });

  const [results, setResults] = useState<EligibilityResult[] | null>(null);

  useEffect(() => {

    const fetchSchemes = async () => {

      try {
        const qs = await getDocs(collection(db, "structuredSchemes"));
        const data: any[] = [];
        qs.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setSchemes(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoadingSchemes(false);
      }

    };

    fetchSchemes();

  }, []);

  const runCheck = () => {
    if (!profile.employmentType) return;
    const r = schemes.map((s) => checkEligibility(s, profile));
    r.sort((a, b) => Number(b.eligible) - Number(a.eligible));
    setResults(r);
  };

  const eligible = results?.filter((r) => r.eligible) ?? [];
  const notEligible = results?.filter((r) => !r.eligible) ?? [];

  const selectedOption = EMPLOYMENT_OPTIONS.find((o) => o.value === profile.employmentType);

  return (

    <main className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="border-b border-zinc-900 px-4 sm:px-6 py-7 sm:py-10">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-600 mb-4">
            <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
            <span>/</span>
            <span className="text-zinc-400">योग्यता जाँच</span>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Nepal Finance Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">योग्यता जाँच</h1>
          <p className="text-zinc-500 text-sm sm:text-base">
            आफ्नो बारेमा बताउनुस् — हामी तपाईंले पाउन सक्ने योजनाहरू देखाउँछौं।
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* फारम */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 space-y-7">

          {/* रोजगारी प्रकार */}
          <div>

            <label className="block text-lg font-bold mb-4">
              तपाईंको रोजगारी प्रकार के हो?
            </label>

            <div className="grid gap-3">
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProfile((p) => ({ ...p, employmentType: opt.value }))}
                  className={`
                    flex items-center gap-4
                    px-5
                    py-4
                    rounded-2xl
                    border
                    text-left
                    transition
                    ${
                      profile.employmentType === opt.value
                        ? "border-green-500 bg-green-500/10 text-white"
                        : "border-zinc-700 bg-black text-zinc-400 hover:border-zinc-500"
                    }
                  `}
                >
                  <div
                    className={`
                      w-4 h-4 rounded-full border-2 shrink-0
                      ${
                        profile.employmentType === opt.value
                          ? "border-green-400 bg-green-400"
                          : "border-zinc-600"
                      }
                    `}
                  />
                  <div>
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-sm text-zinc-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

          </div>

          {/* उमेर */}
          <div>

            <label className="block text-lg font-bold mb-2">
              तपाईंको उमेर
            </label>

            <div className="flex items-center gap-4">

              <input
                type="number"
                min={15}
                max={70}
                value={profile.age}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, age: Number(e.target.value) }))
                }
                className="
                  bg-black
                  border
                  border-zinc-700
                  rounded-2xl
                  px-5
                  py-3
                  text-2xl
                  font-bold
                  w-28
                  focus:outline-none
                  focus:border-green-500
                "
              />

              <span className="text-zinc-500">वर्ष</span>

            </div>

          </div>

          {/* कोष सदस्यता */}
          <div>

            <label className="block text-lg font-bold mb-4">
              कोष सदस्यता (थाहा भएमा)
            </label>

            <div className="space-y-3">

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isEPFMember}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, isEPFMember: e.target.checked }))
                  }
                  className="w-5 h-5 accent-green-500"
                />
                <span className="text-zinc-300">म EPF को सक्रिय सदस्य हुँ</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isSSFMember}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, isSSFMember: e.target.checked }))
                  }
                  className="w-5 h-5 accent-green-500"
                />
                <span className="text-zinc-300">म SSF मा दर्ता योगदानकर्ता हुँ</span>
              </label>

            </div>

          </div>

          {/* जाँच बटन */}
          <button
            onClick={runCheck}
            disabled={!profile.employmentType || loadingSchemes}
            className="
              w-full
              bg-green-500
              hover:bg-green-400
              disabled:bg-zinc-800
              disabled:text-zinc-600
              text-black
              font-black
              text-lg
              py-4
              rounded-2xl
              transition
            "
          >
            {loadingSchemes ? "योजनाहरू लोड हुँदैछ..." : "मेरो योग्यता जाँच गर्नुस्"}
          </button>

        </div>

        {/* नतिजाहरू */}
        {results && (
          <div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-black text-xl">{eligible.length}</span>
                <span className="text-zinc-400 text-sm">योग्य योजना</span>
              </div>
              <div className="w-px h-4 bg-zinc-700" />
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-black text-xl">{notEligible.length}</span>
                <span className="text-zinc-600 text-sm">अयोग्य</span>
              </div>
              <div className="ml-auto text-xs text-zinc-600">
                {selectedOption?.label} · उमेर {profile.age}
              </div>
            </div>

            {/* योग्य */}
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-base font-black text-white mb-4">
                <span className="w-0.5 h-4 bg-green-500 rounded-full" />
                योग्य ({eligible.length})
              </h3>
              <div className="space-y-3">
                {eligible.map((r) => (
                  <Link
                    key={r.scheme.id}
                    href={`/scheme/${r.scheme.id}`}
                    className="flex items-start gap-4 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 hover:border-green-500 transition block group"
                  >
                    <span className="text-green-400 font-bold mt-0.5 shrink-0">✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-white text-sm group-hover:text-green-400 transition">{r.scheme.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${orgColor[r.scheme.organization] ?? "bg-zinc-700"}`}>
                          {r.scheme.organization}
                        </span>
                      </div>
                      <p className="text-xs text-green-300/80">{r.reason}</p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-green-400 transition text-sm shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* अयोग्य */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-zinc-500 mb-4">
                <span className="w-0.5 h-4 bg-zinc-700 rounded-full" />
                अयोग्य ({notEligible.length})
              </h3>
              <div className="space-y-2">
                {notEligible.map((r) => (
                  <div key={r.scheme.id} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <span className="text-zinc-700 mt-0.5 shrink-0">✕</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-zinc-500 text-xs">{r.scheme.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-600 font-bold">
                          {r.scheme.organization}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-900 flex gap-3 flex-wrap">
              <Link href="/recommend" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-3 rounded-2xl transition-colors text-sm">
                ⚡ AI सिफारिस लिनुस्
              </Link>
              <Link href="/compare" className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold px-5 py-3 rounded-2xl transition-colors text-sm">
                ⚖ सबै तुलना
              </Link>
            </div>

          </div>
        )}

      </div>

    </main>

  );

}
