"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatNPR(n: number): string {
  if (n >= 10_000_000) return `NPR ${(n / 10_000_000).toFixed(2)} करोड`;
  if (n >= 100_000) return `NPR ${(n / 100_000).toFixed(2)} लाख`;
  return `NPR ${Math.round(n).toLocaleString()}`;
}

function projectFund(
  monthlyContribution: number,
  annualRate: number,
  startAge: number,
  retirementAge: number
): { year: number; age: number; fund: number; totalContributed: number }[] {

  const years = retirementAge - startAge;
  if (years <= 0 || monthlyContribution <= 0) return [];

  const monthlyRate = annualRate / 100 / 12;
  const data = [];
  let fund = 0;
  let totalContributed = 0;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      fund = fund * (1 + monthlyRate) + monthlyContribution;
      totalContributed += monthlyContribution;
    }
    data.push({
      year: y,
      age: startAge + y,
      fund: Math.round(fund),
      totalContributed: Math.round(totalContributed),
    });
  }

  return data;

}

export default function CalculatorPage() {

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [monthlyContribution, setMonthlyContribution] = useState(3000);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(60);

  useEffect(() => {

    const fetchSchemes = async () => {

      try {
        const qs = await getDocs(collection(db, "structuredSchemes"));
        const data: any[] = [];
        qs.forEach((d) => data.push({ id: d.id, ...d.data() }));
        const calculable = data.filter((s) => s.calculatorEnabled);
        setSchemes(calculable);
        if (calculable.length > 0) {
          setSelectedSchemeId(calculable[0].id);
          if (calculable[0].interestRate) setAnnualRate(calculable[0].interestRate);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }

    };

    fetchSchemes();

  }, []);

  const handleSchemeChange = (id: string) => {
    setSelectedSchemeId(id);
    const s = schemes.find((x) => x.id === id);
    if (s?.interestRate) setAnnualRate(s.interestRate);
  };

  const selectedScheme = schemes.find((s) => s.id === selectedSchemeId);

  const projectionData = useMemo(
    () => projectFund(monthlyContribution, annualRate, currentAge, retirementAge),
    [monthlyContribution, annualRate, currentAge, retirementAge]
  );

  const finalRow = projectionData[projectionData.length - 1];
  const totalFund = finalRow?.fund ?? 0;
  const totalContributed = finalRow?.totalContributed ?? 0;
  const totalInterest = totalFund - totalContributed;
  const yearsInRetirement = 80 - retirementAge;
  const monthlyPension = yearsInRetirement > 0
    ? Math.round(totalFund / (yearsInRetirement * 12))
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm">
        <p className="font-bold text-white mb-1">उमेर {label}</p>
        <p className="text-green-400">कोष: {formatNPR(payload[0]?.value)}</p>
        <p className="text-zinc-400">योगदान: {formatNPR(payload[1]?.value)}</p>
      </div>
    );
  };

  return (

    <main className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-green-400 mb-3">
          सेवानिवृत्ति क्यालकुलेटर
        </h1>

        <p className="text-zinc-400 text-lg mb-10">
          तपाईंको बचत चक्रवृद्धि ब्याजसँग कसरी बढ्छ हेर्नुस्।
        </p>

        {/* नियन्त्रण */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">

          {/* योजना छनोट */}
          <div className="mb-6">

            <label className="block font-bold text-lg mb-2">योजना</label>

            {loading ? (
              <p className="text-zinc-600 text-sm">योजनाहरू लोड हुँदैछ...</p>
            ) : (
              <select
                value={selectedSchemeId}
                onChange={(e) => handleSchemeChange(e.target.value)}
                className="
                  w-full
                  bg-black
                  border
                  border-zinc-700
                  rounded-2xl
                  px-5
                  py-3
                  text-white
                  focus:outline-none
                  focus:border-green-500
                  text-base
                "
              >
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.organization})
                  </option>
                ))}
              </select>
            )}

            {selectedScheme && (
              <p className="text-zinc-500 text-sm mt-2">
                {selectedScheme.subcategory} · {selectedScheme.riskLevel}
              </p>
            )}

          </div>

          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <label className="block font-bold mb-2">मासिक योगदान (NPR)</label>
              <input
                type="number"
                min={100}
                step={500}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="
                  w-full bg-black border border-zinc-700 rounded-2xl
                  px-5 py-3 text-xl font-bold
                  focus:outline-none focus:border-green-500
                "
              />
            </div>

            <div>
              <label className="block font-bold mb-2">वार्षिक ब्याज दर (%)</label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="
                  w-full bg-black border border-zinc-700 rounded-2xl
                  px-5 py-3 text-xl font-bold
                  focus:outline-none focus:border-green-500
                "
              />
            </div>

            <div>
              <label className="block font-bold mb-2">हालको उमेर</label>
              <input
                type="number"
                min={15}
                max={59}
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="
                  w-full bg-black border border-zinc-700 rounded-2xl
                  px-5 py-3 text-xl font-bold
                  focus:outline-none focus:border-green-500
                "
              />
            </div>

            <div>
              <label className="block font-bold mb-2">सेवानिवृत्ति उमेर</label>
              <input
                type="number"
                min={40}
                max={70}
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="
                  w-full bg-black border border-zinc-700 rounded-2xl
                  px-5 py-3 text-xl font-bold
                  focus:outline-none focus:border-green-500
                "
              />
            </div>

          </div>

        </div>

        {/* सारांश कार्डहरू */}
        {projectionData.length > 0 && (

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-500 text-sm mb-1">सेवानिवृत्तिमा कोष</p>
              <p className="text-green-400 font-black text-xl">{formatNPR(totalFund)}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-500 text-sm mb-1">कुल योगदान</p>
              <p className="text-blue-400 font-black text-xl">{formatNPR(totalContributed)}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-500 text-sm mb-1">आर्जित ब्याज</p>
              <p className="text-purple-400 font-black text-xl">{formatNPR(totalInterest)}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-500 text-sm mb-1">अनुमानित मासिक पेन्सन</p>
              <p className="text-orange-400 font-black text-xl">{formatNPR(monthlyPension)}</p>
              <p className="text-zinc-700 text-xs mt-1">{yearsInRetirement} वर्षमा</p>
            </div>

          </div>

        )}

        {/* ग्राफ */}
        {projectionData.length > 0 && (

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">

            <h2 className="text-2xl font-black mb-2">कोष वृद्धि</h2>

            <p className="text-zinc-500 text-sm mb-6">
              उमेर {currentAge} → {retirementAge} · {retirementAge - currentAge} वर्ष · {annualRate}% प्रतिवर्ष
            </p>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={projectionData.map((d) => ({
                  age: d.age,
                  fund: d.fund,
                  contributed: d.totalContributed,
                }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="age"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  label={{ value: "उमेर", position: "insideBottom", offset: -2, fill: "#52525b" }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickFormatter={(v) => {
                    if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`;
                    if (v >= 100_000) return `${(v / 100_000).toFixed(0)}L`;
                    return `${(v / 1000).toFixed(0)}K`;
                  }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="fund"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={false}
                  name="कुल कोष"
                />
                <Line
                  type="monotone"
                  dataKey="contributed"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                  name="योगदान रकम"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="flex gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2 text-zinc-400">
                <span className="w-4 h-0.5 bg-green-400 inline-block" /> कुल कोष
              </span>
              <span className="flex items-center gap-2 text-zinc-400">
                <span className="w-4 h-0.5 bg-blue-500 inline-block border-t border-dashed" /> योगदान रकम
              </span>
            </div>

          </div>

        )}

        {projectionData.length === 0 && !loading && (
          <div className="text-center text-zinc-600 py-16">
            <p className="text-xl font-bold">माथि योगदान र उमेर भर्नुस्</p>
          </div>
        )}

      </div>

    </main>

  );

}
