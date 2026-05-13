import {
  INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES,
} from "../../lib/schemes-data";

/* ─── Types ──────────────────────────────────────────────── */
type Category = "investment" | "loan" | "insurance" | "pension";

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}

interface RequestBody {
  category: Category;
  age: number;
  income: number;
  // Investment
  risk?: "Low" | "Medium" | "High";
  // Loan
  loanPurpose?: string;
  loanAmount?: number;
  // Insurance
  dependents?: number;
  // Pension
  retirementAge?: number;
}

/* ─── Constants ──────────────────────────────────────────── */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const MODEL_ID = "claude-opus-4-7";

/* ─── Helpers ────────────────────────────────────────────── */
function formatIncome(income: number): string {
  return income >= 100_000
    ? `NPR ${(income / 100_000).toFixed(1)} लाख`
    : `NPR ${income.toLocaleString()}`;
}

function fv(monthlyContrib: number, annualRate: number, years: number): string {
  const r = annualRate / 12;
  const n = years * 12;
  const result = monthlyContrib * ((Math.pow(1 + r, n) - 1) / r);
  if (result >= 1_000_000) return `NPR ${(result / 100_000).toFixed(1)} लाख`;
  return `NPR ${Math.round(result).toLocaleString()}`;
}

function emi(principal: number, annualRate: number, years: number): string {
  const r = annualRate / 12;
  const n = years * 12;
  const result = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return `NPR ${Math.round(result).toLocaleString()}`;
}

/* ─── Prompt Builders ────────────────────────────────────── */

function buildInvestmentPrompt(
  age: number,
  income: number,
  risk: string,
  incomeFormatted: string
): string {
  const horizon = 65 - age;
  const monthly10pct = Math.round(income * 0.1);
  const epfScheme = INVESTMENT_SCHEMES.find((s) => s.id === "epf-provident-fund");
  const nepseScheme = INVESTMENT_SCHEMES.find((s) => s.id === "nepse-mutual-fund");
  const epfRate = epfScheme?.interestRate ?? 8.5;
  const nepseRate = nepseScheme?.annualReturn ?? 15;
  const projEPF   = fv(monthly10pct, epfRate / 100,   horizon);
  const projNEPSE = fv(monthly10pct, nepseRate / 100, horizon);

  const schemeList = INVESTMENT_SCHEMES.map((s, i) => {
    const rate = s.interestRate ?? s.annualReturn;
    return `${i + 1}. ${s.titleNepali} (${s.organization}) — ${rate ? `${rate}%` : "N/A"} | जोखिम: ${s.riskLevel}\n   ${s.nepaliSummary.slice(0, 130)}`;
  }).join("\n\n");

  return `तपाईं नेपालको विशेषज्ञ लगानी सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted} | जोखिम: ${risk}
- लगानी क्षितिज: ${horizon} वर्ष | मासिक लगानी क्षमता (१०%): NPR ${monthly10pct.toLocaleString()}

गणना (मासिक NPR ${monthly10pct.toLocaleString()} लगानी, ${horizon} वर्ष):
- EPF भविष्य निधि (${epfRate}%): ${projEPF}
- NEPSE म्युचुअल फन्ड (${nepseRate}%): ${projNEPSE}

नेपालका लगानी योजनाहरू (विस्तृत):

${schemeList}

${age} वर्षीय, ${incomeFormatted} आय, ${risk} जोखिम क्षमताका लागि २–३ सबैभन्दा उपयुक्त योजनाहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "investment",
  "sifaris": [
    {
      "name": "EPF",
      "nepaliName": "कर्मचारी सञ्चय कोष",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "jokhimLevel": "कम",
      "anumaanitReturn": "${epfRate}%",
      "projectedValue": "${projEPF} (${horizon} वर्षमा)"
    }
  ],
  "samgraSalah": "समग्र रणनीति (३–४ वाक्य)",
  "mukhyaSandesh": "मुख्य सन्देश (१–२ वाक्य)"
}`;
}

function buildLoanPrompt(
  age: number,
  income: number,
  loanPurpose: string,
  loanAmount: number,
  incomeFormatted: string
): string {
  const maxEMI = Math.round(income * 0.4);
  const epfAccum = Math.round(income * 0.2 * 12 * Math.max(1, age - 22));
  const epfLoanMax = Math.round(epfAccum * 0.5);
  const epfLoanEMI = emi(Math.min(epfLoanMax, loanAmount), 0.11, 3);
  const homeLoanEMI = emi(loanAmount, 0.10, 20);
  const loanFormatted = loanAmount >= 100_000
    ? `NPR ${(loanAmount / 100_000).toFixed(1)} लाख`
    : `NPR ${loanAmount.toLocaleString()}`;

  const loansByOrg: Record<string, string[]> = { EPF: [], CIT: [], SSF: [] };
  LOAN_SCHEMES.forEach((s, i) => {
    const org = s.organization as string;
    if (!loansByOrg[org]) loansByOrg[org] = [];
    const rate = s.interestRate ? `${s.interestRate}%` : "";
    const limit = s.loanLimit ? ` | ${s.loanLimit}` : "";
    loansByOrg[org].push(`  - ${s.titleNepali}${rate ? ` — ${rate}` : ""}${limit}`);
  });

  const loanSchemeList = Object.entries(loansByOrg)
    .filter(([, items]) => items.length > 0)
    .map(([org, items]) => `${org} ऋण:\n${items.join("\n")}`)
    .join("\n\n");

  return `तपाईं नेपालको विशेषज्ञ वित्तीय सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted}
- ऋण उद्देश्य: ${loanPurpose} | आवश्यक रकम: ${loanFormatted}
- अधिकतम EMI क्षमता (आयको ४०%): NPR ${maxEMI.toLocaleString()}

गणना:
- EPF संचित (अनुमानित): NPR ${epfAccum.toLocaleString()} → अधिकतम EPF ऋण: NPR ${epfLoanMax.toLocaleString()}
- EPF ऋण EMI (११%, ३ वर्ष): ${epfLoanEMI}/महिना
- गृह ऋण EMI (१०%, २० वर्ष): ${homeLoanEMI}/महिना

नेपालका ऋण योजनाहरू (${LOAN_SCHEMES.length} प्रकार):

${loanSchemeList}

${age} वर्षीय, ${incomeFormatted} आय भएको, ${loanPurpose} को लागि ${loanFormatted} ऋण चाहने व्यक्तिलाई सबैभन्दा उपयुक्त २–३ ऋण विकल्पहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "loan",
  "sifaris": [
    {
      "name": "EPF Loan",
      "nepaliName": "EPF गृह अग्रिम",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "estimatedLoan": "NPR X लाख",
      "byajDar": "९–११%",
      "avadhi": "१५ वर्ष",
      "monthlyEMI": "NPR X,XXX"
    }
  ],
  "samgraSalah": "समग्र सल्लाह (३–४ वाक्य)",
  "mukhyaSandesh": "मुख्य सन्देश (१–२ वाक्य)"
}`;
}

function buildInsurancePrompt(
  age: number,
  income: number,
  dependents: number,
  incomeFormatted: string
): string {
  const suggestedCover = income * 12 * 10;
  const coverFormatted = suggestedCover >= 100_000
    ? `NPR ${(suggestedCover / 100_000).toFixed(0)} लाख`
    : `NPR ${suggestedCover.toLocaleString()}`;
  const termRate = age < 30 ? 0.003 : age < 40 ? 0.005 : 0.008;
  const termPremium = Math.round(suggestedCover * termRate);
  const endowPremium = Math.round(suggestedCover * termRate * 2.5 + suggestedCover * 0.04);

  const insuranceList = INSURANCE_SCHEMES.map((s, i) => {
    const org = s.organization;
    const coverage = s.loanLimit ?? "";
    return `${i + 1}. ${s.titleNepali} (${org})${coverage ? ` — कभरेज: ${coverage}` : ""}\n   ${s.nepaliSummary.slice(0, 120)}`;
  }).join("\n\n");

  return `तपाईं नेपालको विशेषज्ञ बीमा सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted} | आश्रित: ${dependents} जना
- सुझावित जीवन बीमा (वार्षिक आयको १०×): ${coverFormatted}
- टर्म बीमा अनुमानित प्रिमियम: NPR ${termPremium.toLocaleString()}/वर्ष
- एन्डाउमेन्ट अनुमानित प्रिमियम: NPR ${endowPremium.toLocaleString()}/वर्ष

नेपालका बीमा योजनाहरू (${INSURANCE_SCHEMES.length} प्रकार):

${insuranceList}

${age} वर्षीय, ${incomeFormatted} आय, ${dependents} जना आश्रित परिवार भएकालाई उपयुक्त २–३ बीमा योजनाहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "insurance",
  "sifaris": [
    {
      "name": "Jeevan Beema",
      "nepaliName": "जीवन बीमा (टर्म)",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "coverageType": "जीवन सुरक्षा",
      "estimatedPremium": "NPR ${termPremium.toLocaleString()}/वर्ष",
      "suggestedCoverage": "${coverFormatted}"
    }
  ],
  "samgraSalah": "समग्र बीमा रणनीति (३–४ वाक्य)",
  "mukhyaSandesh": "मुख्य सन्देश (१–२ वाक्य)"
}`;
}

function buildPensionPrompt(
  age: number,
  income: number,
  retirementAge: number,
  incomeFormatted: string
): string {
  const years = retirementAge - age;
  const ssfMonthlyContrib = Math.round(income * 0.31);
  const epfMonthlyContrib = Math.round(income * 0.20);
  const ssfCorpus = fv(ssfMonthlyContrib, 0.085, years);
  const epfCorpus = fv(epfMonthlyContrib, 0.09, years);
  const gratuity = formatIncome(income * years);
  const ssfMonthlyPension = Math.round(income * years * 0.0133);

  const pensionList = PENSION_SCHEMES.map((s, i) => {
    const contribLine = s.contributionEmployee != null && s.contributionEmployer != null
      ? ` | योगदान: ${s.contributionEmployee}%+${s.contributionEmployer}%`
      : "";
    const pensionFormula = s.pensionFormula ? ` | फार्मुला: ${s.pensionFormula}` : "";
    return `${i + 1}. ${s.titleNepali} (${s.organization})${contribLine}${pensionFormula}\n   ${s.nepaliSummary.slice(0, 140)}`;
  }).join("\n\n");

  return `तपाईं नेपालको विशेषज्ञ पेन्सन सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted}
- सेवानिवृत्ति उमेर: ${retirementAge} वर्ष | सेवा वर्ष: ${years} वर्ष

गणना:
- SSF योगदान (कर्मचारी ११% + नियोक्ता २०% = ३१%): NPR ${ssfMonthlyContrib.toLocaleString()}/महिना
- SSF संचित कोष (${years} वर्षमा): ${ssfCorpus}
- SSF मासिक पेन्सन (तलब × ${years} × १.३३%): NPR ${ssfMonthlyPension.toLocaleString()}/महिना
- EPF संचित कोष: ${epfCorpus}
- EPF ग्राच्युटी (अनुमानित): ${gratuity}

नेपालका पेन्सन योजनाहरू (${PENSION_SCHEMES.length} प्रकार):

${pensionList}

${age} वर्षीय, ${incomeFormatted} आय, ${retirementAge} मा सेवानिवृत्त हुन चाहनेलाई उपयुक्त पेन्सन योजनाहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "pension",
  "sifaris": [
    {
      "name": "SSF",
      "nepaliName": "SSF वृद्धावस्था पेन्सन",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "estimatedMonthlyPension": "NPR ${ssfMonthlyPension.toLocaleString()}/महिना",
      "totalCorpus": "${ssfCorpus}",
      "vestingPeriod": "न्यूनतम १५ वर्ष"
    }
  ],
  "samgraSalah": "समग्र पेन्सन रणनीति (३–४ वाक्य)",
  "mukhyaSandesh": "मुख्य सन्देश (१–२ वाक्य)"
}`;
}

/* ─── Request Handlers ───────────────────────────────────── */
export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const ANTHROPIC_API_KEY = context.env.ANTHROPIC_API_KEY?.trim();

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key राखिएको छैन।" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: RequestBody;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "अनुरोध पढ्न सकिएन।" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { category, age, income } = body;

  if (!category || !age || !income) {
    return new Response(
      JSON.stringify({ error: "category, age र income आवश्यक छ।" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const incomeFormatted = formatIncome(income);
  let prompt: string;

  switch (category) {
    case "investment": {
      const risk = body.risk ?? "Medium";
      const riskNepali = risk === "Low" ? "कम" : risk === "Medium" ? "मध्यम" : "उच्च";
      prompt = buildInvestmentPrompt(age, income, riskNepali, incomeFormatted);
      break;
    }
    case "loan": {
      if (!body.loanPurpose || !body.loanAmount) {
        return new Response(
          JSON.stringify({ error: "ऋणको उद्देश्य र रकम आवश्यक छ।" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      prompt = buildLoanPrompt(age, income, body.loanPurpose, body.loanAmount, incomeFormatted);
      break;
    }
    case "insurance": {
      const dependents = body.dependents ?? 0;
      prompt = buildInsurancePrompt(age, income, dependents, incomeFormatted);
      break;
    }
    case "pension": {
      const retirementAge = body.retirementAge ?? 60;
      if (retirementAge <= age) {
        return new Response(
          JSON.stringify({ error: "सेवानिवृत्ति उमेर हालको उमेरभन्दा बढी हुनुपर्छ।" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      prompt = buildPensionPrompt(age, income, retirementAge, incomeFormatted);
      break;
    }
    default:
      return new Response(
        JSON.stringify({ error: "अमान्य category।" }),
        { status: 400, headers: CORS_HEADERS }
      );
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI सेवामा समस्या भयो। कृपया पुनः प्रयास गर्नुस्।" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const responseBody = (await anthropicRes.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = responseBody.content?.[0]?.text?.trim() ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "AI प्रतिक्रिया पढ्न सकिएन। कृपया पुनः प्रयास गर्नुस्।" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Recommend function error:", err);
    return new Response(
      JSON.stringify({ error: "अप्रत्याशित त्रुटि भयो। कृपया पुनः प्रयास गर्नुस्।" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
