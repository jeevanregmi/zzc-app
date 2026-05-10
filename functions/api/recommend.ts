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
  const projEPF   = fv(monthly10pct, 0.09,  horizon);
  const projCIT   = fv(monthly10pct, 0.085, horizon);
  const projNEPSE = fv(monthly10pct, 0.18,  horizon);

  return `तपाईं नेपालको विशेषज्ञ लगानी सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted} | जोखिम: ${risk}
- लगानी क्षितिज: ${horizon} वर्ष | मासिक लगानी क्षमता (१०%): NPR ${monthly10pct.toLocaleString()}

गणना (मासिक NPR ${monthly10pct.toLocaleString()} लगानी, ${horizon} वर्ष):
- EPF PF (९%): ${projEPF}
- CIT एकाइ (८.५%): ${projCIT}
- NEPSE म्युचुअल फन्ड (१८%): ${projNEPSE}

नेपालका लगानी योजनाहरू (विस्तृत):

१. EPF कर्मचारी सञ्चय कोष (Employee Provident Fund):
   - ब्याज दर: ८.५–११% प्रतिवर्ष, नियोक्ता योगदान: तलबको १०%
   - कर छूट, सेवानिवृत्तिमा एकमुस्त। सरकारी तथा निजी क्षेत्रका कर्मचारी। न्यूनतम जोखिम।

२. CIT साधारण एकाइ (Regular Unit):
   - लाभांश: ७–१०% प्रतिवर्ष। जो कोहीले NPR ५०० देखि लगानी गर्न सक्छ।
   - सरकारी सहभागिता, स्थिर रिटर्न। कम जोखिम।

३. CIT विशेष एकाइ (Special Unit):
   - सरकारी कर्मचारीहरूको लागि। उच्च लाभांश सम्भव। कम जोखिम।

४. NEPSE म्युचुअल फन्डहरू:
   - Nabil Balanced Fund, Siddhartha Equity Fund, NMB Sulav, Global IME Samunnat, आदि
   - सम्भावित रिटर्न: १५–३०%+। बाजार उतारचढाव। दीर्घकालीन लगानीका लागि। उच्च जोखिम।

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
  const epfAccum = Math.round(income * 0.2 * 12 * Math.max(1, age - 22));
  const epfLoanMax = Math.round(epfAccum * 0.5);
  const epfLoanEMI = emi(Math.min(epfLoanMax, loanAmount), 0.11, 3);
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
- EPF संचित (अनुमानित): NPR ${epfAccum.toLocaleString()} → अधिकतम EPF ऋण: NPR ${epfLoanMax.toLocaleString()}
- EPF ऋण EMI (११%, ३ वर्ष): ${epfLoanEMI}/महिना
- गृह ऋण EMI (१०%, २० वर्ष): ${homeLoanEMI}/महिना

नेपालका ऋण योजनाहरू (विस्तृत):

EPF ऋण/अग्रिम (५ प्रकार):
१. EPF गृह अग्रिम — गृह खरिद/निर्माणका लागि, NPR ३० लाखसम्म, ९–११%, १५ वर्षसम्म
२. EPF व्यक्तिगत अग्रिम — संचित रकमको ५०%सम्म, ११%, ३ वर्ष
३. EPF शिक्षा अग्रिम — उच्च शिक्षाका लागि, NPR ५ लाखसम्म, १०%, ५ वर्ष
४. EPF चिकित्सा अग्रिम — गम्भीर बिमारी, NPR ३ लाखसम्म, १०%, २ वर्ष
५. EPF व्यवसाय अग्रिम — साना व्यवसाय, NPR १० लाखसम्म, ११%, ५ वर्ष

CIT ऋण (३ प्रकार):
१. CIT आवास ऋण — CIT एकाइ धितोमा, NPR ५० लाखसम्म, १०%, २० वर्ष
२. CIT व्यक्तिगत ऋण — NPR ५ लाखसम्म, ११%, ५ वर्ष
३. CIT शिक्षा ऋण — NPR १० लाखसम्म, १०%, ७ वर्ष

SSF अग्रिम (३ प्रकार):
१. SSF आवास अग्रिम — NPR २५ लाखसम्म, ९%, १५ वर्ष
२. SSF आपतकालीन अग्रिम — NPR २ लाखसम्म, ८%, २ वर्ष
३. SSF चाडपर्व अग्रिम — NPR ५०,०००सम्म, ८%, १ वर्ष

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

  return `तपाईं नेपालको विशेषज्ञ बीमा सल्लाहकार हुनुहुन्छ।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष | मासिक आय: ${incomeFormatted} | आश्रित: ${dependents} जना
- सुझावित जीवन बीमा (वार्षिक आयको १०×): ${coverFormatted}
- टर्म बीमा अनुमानित प्रिमियम: NPR ${termPremium.toLocaleString()}/वर्ष
- एन्डाउमेन्ट अनुमानित प्रिमियम: NPR ${endowPremium.toLocaleString()}/वर्ष

नेपालका बीमा योजनाहरू (विस्तृत):

जीवन बीमा (Jeevan Beema):
१. टर्म बीमा — शुद्ध जीवन सुरक्षा, कम प्रिमियम, उच्च कभरेज। Nepal Life, National Life, Prime Life।
२. एन्डाउमेन्ट — बचत + जीवन सुरक्षा, ४–७% रिटर्न, परिपक्वतामा एकमुस्त भुक्तानी।
३. CIT नागरिक बीमा (CICI) — सरकारी/अर्धसरकारी कर्मचारीहरूको लागि समूह बीमा। प्रतिस्पर्धात्मक दर।

स्वास्थ्य बीमा (Swasthya Beema):
४. सरकारी स्वास्थ्य बीमा — NPR १ लाख परिवार कभरेज (NPR २,५०० मात्र/वर्ष)। सरकारी अस्पतालमा।
५. निजी स्वास्थ्य बीमा — NPR १–५ लाख कभरेज, NPR ५,०००–१५,०००/वर्ष। निजी अस्पतालमा पनि।

SSF बीमा सुविधाहरू (औपचारिक क्षेत्रका कर्मचारी):
६. SSF स्वास्थ्य बीमा — SSF योगदानमा समावेश, अस्पताल खर्च कभरेज।
७. SSF दुर्घटना बीमा — NPR १४ लाखसम्म दुर्घटना/अपांगता।
८. SSF मातृत्व सुविधा — प्रसूति खर्च NPR ३०,०००सम्म।

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

नेपालका पेन्सन योजनाहरू (विस्तृत):

१. SSF वृद्धावस्था पेन्सन (Old Age Pension):
   - कर्मचारी ११% + नियोक्ता २०% = ३१% मासिक योगदान
   - न्यूनतम १५ वर्ष सेवा पछि ६० वर्षमा मासिक पेन्सन
   - फार्मुला: औसत तलब × सेवा वर्ष × १.३३%
   - स्वास्थ्य बीमा, दुर्घटना बीमा पनि समावेश

२. EPF पेन्सन + ग्राच्युटी:
   - EPF संचित रकम (कर्मचारी + नियोक्ता योगदान + ब्याज) सेवानिवृत्तिमा एकमुस्त
   - ग्राच्युटी: प्रत्येक सेवा वर्षको लागि एक महिनाको तलब
   - एकमुस्त रकम पेन्सन annuity मा लगाउन सकिन्छ

३. CIT पेन्सन पूरक:
   - CIT एकाइमा थप लगानी, ७–१०% वार्षिक लाभांश
   - EPF/SSF को पूरकको रूपमा प्रयोग
   - जो कोहीले गर्न सक्छ, न्यूनतम रकम NPR ५००

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
