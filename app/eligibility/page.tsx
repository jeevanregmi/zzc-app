"use client";

import { useEffect, useState } from "react";
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

  // --- CIT schemes ---
  if (scheme.title === "Government Employees' Term Life Insurance Fund") {
    if (employmentType === "government")
      return result(true, "Mandatory — auto-enrolled when you join government service");
    return result(false, "Only for government employees, army, police, and teachers");
  }

  if (scheme.title === "NARC Employees' Term Life Insurance") {
    return result(false, "Only for permanent NARC (Agricultural Research Council) employees");
  }

  if (
    scheme.title === "Gratuity and Pension Fund Scheme" ||
    scheme.title === "Investor's Retirement Fund Scheme"
  ) {
    return result(false, "For organizations and institutions only — not individuals");
  }

  if (scheme.title === "Citizens Pension Scheme") {
    if (age < 18) return result(false, "Minimum enrollment age is 18 years");
    if (age > 50) return result(false, "Maximum entry age is 50 years");
    if (employmentType === "student" && age < 18)
      return result(false, "Must be at least 18 years old");
    return result(true, "Open to all Nepali citizens aged 18–50, including self-employed");
  }

  if (scheme.title === "Citizens Unit Scheme") {
    return result(true, "Open to any Nepali citizen — no employment condition");
  }

  if (scheme.title === "Employee Savings Growth Retirement Scheme") {
    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant")
      return result(false, "Requires your employer to be enrolled in the scheme");
    return result(true, "Available if your employer (private or government) has enrolled");
  }

  // --- EPF schemes ---
  if (scheme.organization === "EPF") {
    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant") {
      return result(false, "EPF is for employees of EPF-registered organizations");
    }

    if (scheme.title === "EPF Provident Fund") {
      return result(true, "Available if your employer is EPF-registered (mandatory for formal private sector)");
    }

    if (scheme.title === "Pension and Gratuity Scheme") {
      if (!isEPFMember)
        return result(false, "Requires active EPF membership with 20+ years of contribution");
      return result(true, "Available after 20 years of EPF contributions");
    }

    if (scheme.title === "Maternity and Child Care Benefit") {
      return result(
        isEPFMember,
        isEPFMember
          ? "Available to female EPF members — up to 2 children"
          : "Requires active EPF membership"
      );
    }

    if (scheme.title === "Funeral Grants") {
      return result(
        isEPFMember,
        isEPFMember
          ? "Available to all active EPF members and their immediate family"
          : "Requires active EPF membership"
      );
    }

    if (scheme.title === "Accident Compensation Scheme") {
      return result(
        isEPFMember,
        isEPFMember
          ? "Covers all active EPF members for workplace accidents"
          : "Requires active EPF membership"
      );
    }

    if (scheme.title === "Employee Healthcare Plan") {
      return result(
        isEPFMember,
        isEPFMember
          ? "Available to EPF members and registered dependents"
          : "Requires active EPF membership"
      );
    }

    // All other EPF loan schemes
    if (!isEPFMember)
      return result(false, "Requires active EPF membership to access loans");
    return result(true, "Available to active EPF members — minimum contribution period applies");
  }

  // --- SSF schemes ---
  if (scheme.organization === "SSF") {
    if (scheme.title === "Foreign Employment Security Scheme") {
      if (employmentType === "migrant")
        return result(true, "Designed for Nepali migrant workers abroad — voluntary self-contribution");
      return result(false, "Primarily for Nepali migrant workers abroad");
    }

    if (employmentType === "self_employed" || employmentType === "student" || employmentType === "migrant") {
      return result(false, "SSF requires contributions from both employer and employee");
    }

    if (!isSSFMember) {
      return result(false, "Requires SSF registration — ask your employer to register");
    }

    return result(true, "Available to active SSF contributors");
  }

  return result(false, "Unable to determine eligibility from your profile");
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; desc: string }[] = [
  { value: "government", label: "Government Employee", desc: "Civil servant, teacher, army, police" },
  { value: "private_formal", label: "Private Sector (Formal)", desc: "Registered company, receives payslip" },
  { value: "self_employed", label: "Self-Employed", desc: "Business owner, freelancer, farmer" },
  { value: "migrant", label: "Migrant Worker", desc: "Working outside Nepal" },
  { value: "student", label: "Student / Unemployed", desc: "No current employment" },
];

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

  const orgColor: Record<string, string> = {
    EPF: "bg-blue-600",
    CIT: "bg-purple-600",
    SSF: "bg-orange-600",
  };

  return (

    <main className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-3xl mx-auto">

        <h1 className="text-5xl font-black text-green-400 mb-3">
          Eligibility Checker
        </h1>

        <p className="text-zinc-400 text-lg mb-10">
          Tell us about yourself — we'll show you exactly which schemes you qualify for.
        </p>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10 space-y-8">

          {/* Employment Type */}
          <div>

            <label className="block text-lg font-bold mb-4">
              What is your employment type?
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

          {/* Age */}
          <div>

            <label className="block text-lg font-bold mb-2">
              Your age
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

              <span className="text-zinc-500">years old</span>

            </div>

          </div>

          {/* EPF / SSF membership */}
          <div>

            <label className="block text-lg font-bold mb-4">
              Fund memberships (if known)
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
                <span className="text-zinc-300">I am an active EPF member</span>
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
                <span className="text-zinc-300">I am a registered SSF contributor</span>
              </label>

            </div>

          </div>

          {/* Submit */}
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
            {loadingSchemes ? "Loading schemes..." : "Check My Eligibility"}
          </button>

        </div>

        {/* Results */}
        {results && (

          <div>

            <h2 className="text-3xl font-black text-white mb-2">
              Your Results
            </h2>

            <p className="text-zinc-500 mb-8">
              Based on: {EMPLOYMENT_OPTIONS.find((o) => o.value === profile.employmentType)?.label}, age {profile.age}
              {profile.isEPFMember ? ", EPF member" : ""}
              {profile.isSSFMember ? ", SSF contributor" : ""}
            </p>

            {/* Eligible */}
            <div className="mb-10">

              <h3 className="text-xl font-black text-green-400 mb-4">
                Eligible ({eligible.length})
              </h3>

              <div className="space-y-3">
                {eligible.map((r) => (
                  <a
                    key={r.scheme.id}
                    href={`/scheme/${r.scheme.id}`}
                    className="
                      flex items-start gap-4
                      bg-green-500/10
                      border
                      border-green-500/30
                      rounded-2xl
                      p-5
                      hover:border-green-500
                      transition
                      block
                    "
                  >
                    <span className="text-green-400 text-xl mt-0.5 shrink-0">✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-white">{r.scheme.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${orgColor[r.scheme.organization] ?? "bg-zinc-700"}`}>
                          {r.scheme.organization}
                        </span>
                      </div>
                      <p className="text-sm text-green-300">{r.reason}</p>
                    </div>
                  </a>
                ))}
              </div>

            </div>

            {/* Not Eligible */}
            <div>

              <h3 className="text-xl font-black text-zinc-500 mb-4">
                Not Eligible ({notEligible.length})
              </h3>

              <div className="space-y-2">
                {notEligible.map((r) => (
                  <div
                    key={r.scheme.id}
                    className="
                      flex items-start gap-4
                      bg-zinc-900
                      border
                      border-zinc-800
                      rounded-2xl
                      p-4
                    "
                  >
                    <span className="text-zinc-700 text-lg mt-0.5 shrink-0">✕</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-zinc-500 text-sm">{r.scheme.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-600 font-bold">
                          {r.scheme.organization}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

        )}

      </div>

    </main>

  );

}
