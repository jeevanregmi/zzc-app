import { AwsClient } from "aws4fetch";

/* ─── Types ──────────────────────────────────────────────── */
type Category = "investment" | "loan" | "insurance" | "pension";

interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
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

const MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

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
  const projEPF = fv(monthly10pct, 0.09, horizon);
  const projCIT = fv(monthly10pct, 0.085, horizon);
  const projNEPSE = fv(monthly10pct, 0.18, horizon);

  return `तपाईं नेपालको विशेषज्ञ लगानी सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted} | जोखिम: ${risk}
- लगानी क्षितिज: ${horizon} वर्ष (सेवानिवृत्तिसम्म)
- मासिक लगानी क्षमता (आयको १०%): NPR ${monthly10pct.toLocaleString()}

गणना (मासिक NPR ${monthly10pct.toLocaleString()} लगानी गर्दा):
- EPF (९% दरमा ${horizon} वर्षमा): ${projEPF}
- CIT (८.५% दरमा ${horizon} वर्षमा): ${projCIT}
- NEPSE (१८% दरमा ${horizon} वर्षमा): ${projNEPSE}

नेपालका लगानी योजनाहरू:
१. EPF — ब्याज ८.५–११%, नियोक्ता योगदान (तलबको १०%), कर छूट, सेवानिवृत्तिमा एकमुस्त। न्यूनतम जोखिम।
२. CIT — लाभांश ७–१०%, जो कोहीले लगानी गर्न सक्छ, सरकारी सहभागिता, स्थिर। कम जोखिम।
३. NEPSE म्युचुअल फन्ड — सम्भावित रिटर्न १५–३०%+, बाजार उतारचढाव, दीर्घकालीन। उच्च जोखिम।

माथिको जानकारीको आधारमा ${age} वर्षीय, ${incomeFormatted} आय र ${risk} जोखिम क्षमता भएको व्यक्तिको लागि २–३ उपयुक्त योजनाहरू सिफारिस गर्नुस्।

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
      "anumaanitReturn": "८.५–११%",
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
  const epfLoanEstimate = Math.round(income * 12 * 0.5);
  const epfLoanEMI = emi(epfLoanEstimate, 0.11, 3);
  const homeLoanEMI = emi(loanAmount, 0.10, 20);
  const loanFormatted = loanAmount >= 100_000
    ? `NPR ${(loanAmount / 100_000).toFixed(1)} लाख`
    : `NPR ${loanAmount.toLocaleString()}`;

  return `तपाईं नेपालको विशेषज्ञ वित्तीय सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted}
- ऋण उद्देश्य: ${loanPurpose} | आवश्यक रकम: ${loanFormatted}
- अधिकतम EMI क्षमता (आयको ४०%): NPR ${maxEMI.toLocaleString()}

गणना:
- EPF ऋण (अनुमानित): NPR ${epfLoanEstimate.toLocaleString()} → EMI: ${epfLoanEMI}/महिना (३ वर्ष, ११%)
- गृह ऋण (बैंक): ${loanFormatted} → EMI: ${homeLoanEMI}/महिना (२० वर्ष, १०%)

नेपालका ऋण विकल्पहरू:
१. EPF ऋण — संचित EPF को ५०% सम्म, ब्याज ~११%, अवधि ३ वर्ष। छिटो र सजिलो।
२. गृह ऋण (बैंक) — सम्पत्तिको ६०–७०% सम्म, ब्याज ८.५–१२%, अवधि २०–२५ वर्ष।
३. SSF आपतकालीन ऋण — SSF सदस्यको लागि, योगदानको केही प्रतिशत।

${age} वर्षीय, ${incomeFormatted} आय भएको, ${loanPurpose} को लागि ${loanFormatted} ऋण चाहने व्यक्तिलाई उपयुक्त ऋण विकल्पहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "loan",
  "sifaris": [
    {
      "name": "EPF Loan",
      "nepaliName": "EPF ऋण",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "estimatedLoan": "NPR X लाख",
      "byajDar": "११%",
      "avadhi": "३ वर्ष",
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
  const termPremiumLow = Math.round(suggestedCover * 0.003);
  const termPremiumHigh = Math.round(suggestedCover * 0.006);

  return `तपाईं नेपालको विशेषज्ञ बीमा सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted}
- आश्रित परिवार: ${dependents} जना
- सुझावित जीवन बीमा रकम (वार्षिक आयको १०×): ${coverFormatted}
- अनुमानित टर्म बीमा प्रिमियम: NPR ${termPremiumLow.toLocaleString()}–${termPremiumHigh.toLocaleString()}/वर्ष

नेपालका बीमा योजनाहरू:
१. जीवन बीमा (Term) — शुद्ध सुरक्षा, कम प्रिमियम, उच्च कभरेज। Nepal Life, National Life.
२. जीवन बीमा (Endowment) — बचत + सुरक्षा, ४–७% रिटर्न, परिपक्वतामा एकमुस्त।
३. स्वास्थ्य बीमा (सरकारी) — NPR १ लाख परिवार कभरेज, NPR २,५०० मात्र/वर्ष।
४. स्वास्थ्य बीमा (निजी) — NPR १–५ लाख कभरेज, NPR ५,०००–१५,०००/वर्ष।

${age} वर्षीय, ${incomeFormatted} आय, ${dependents} जना आश्रित परिवार भएको व्यक्तिलाई उपयुक्त बीमा योजनाहरू सिफारिस गर्नुस्।

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
      "estimatedPremium": "NPR X,XXX/वर्ष",
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
  const monthlyContrib = Math.round(income * 0.31); // 11% employee + 20% employer (SSF)
  const totalContrib = fv(monthlyContrib, 0.085, years);
  const monthlyPension = Math.round(income * years * 0.0133);
  const pensionFormatted = `NPR ${monthlyPension.toLocaleString()}/महिना`;

  return `तपाईं नेपालको विशेषज्ञ पेन्सन सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted}
- लक्षित सेवानिवृत्ति उमेर: ${retirementAge} वर्ष
- सेवा वर्ष: ${years} वर्ष

SSF गणना (${years} वर्ष योगदान):
- मासिक कुल योगदान (कर्मचारी ११% + नियोक्ता २०%): NPR ${monthlyContrib.toLocaleString()}
- संचित कोष (अनुमानित): ${totalContrib}
- अनुमानित मासिक पेन्सन (${pensionFormatted}): तलब × ${years} × १.३३%

नेपालका पेन्सन विकल्पहरू:
१. SSF पेन्सन — कर्मचारी ११% + नियोक्ता २०%, ६० वर्षमा मासिक पेन्सन, न्यूनतम १५ वर्ष सेवा।
२. EPF + ग्राच्युटी — सेवानिवृत्तिमा एकमुस्त, पेन्सनको लागि annuity मा रूपान्तरण गर्न सकिन्छ।
३. CIT थप लगानी — पेन्सन पूरकको लागि, जो कोहीले गर्न सक्छ।

${age} वर्षीय, ${incomeFormatted} आय, ${retirementAge} मा सेवानिवृत्त हुन चाहने व्यक्तिलाई उपयुक्त पेन्सन योजनाहरू सिफारिस गर्नुस्।

केवल यो JSON format मा जवाफ दिनुस्:
{
  "category": "pension",
  "sifaris": [
    {
      "name": "SSF",
      "nepaliName": "सामाजिक सुरक्षा कोष",
      "rank": 1,
      "kina": "किन उपयुक्त (२–३ वाक्य, नेपालीमा)",
      "faida": ["फाइदा १", "फाइदा २", "फाइदा ३"],
      "savdhan": "एउटा सावधानी (१ वाक्य)",
      "estimatedMonthlyPension": "${pensionFormatted}",
      "totalCorpus": "${totalContrib}",
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
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = context.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
    return new Response(
      JSON.stringify({ error: "AWS credentials राखिएको छैन।" }),
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
    const aws = new AwsClient({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region: AWS_REGION,
      service: "bedrock",
    });

    const bedrockUrl = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/invoke`;

    const bedrockRes = await aws.fetch(bedrockUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!bedrockRes.ok) {
      const errText = await bedrockRes.text();
      console.error("Bedrock error:", bedrockRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI सेवामा समस्या भयो। कृपया पुनः प्रयास गर्नुस्।" }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const responseBody = (await bedrockRes.json()) as {
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
