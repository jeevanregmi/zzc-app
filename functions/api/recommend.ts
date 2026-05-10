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

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key राखिएको छैन।" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: { age?: number; income?: number; risk?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "अनुरोध पढ्न सकिएन।" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { age, income, risk } = body;
  if (!age || !income || !risk) {
    return new Response(
      JSON.stringify({ error: "उमेर, आय र जोखिम आवश्यक छ।" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const riskNepali = risk === "Low" ? "कम" : risk === "Medium" ? "मध्यम" : "उच्च";
  const incomeFormatted =
    income >= 100_000
      ? `NPR ${(income / 100_000).toFixed(1)} लाख`
      : `NPR ${income.toLocaleString()}`;

  const prompt = `तपाईं नेपालको एक विशेषज्ञ लगानी सल्लाहकार हुनुहुन्छ। तलको प्रयोगकर्ताको विवरणको आधारमा नेपालमा उपलब्ध लगानी योजनाहरू मध्ये सबैभन्दा उपयुक्त योजनाहरू सिफारिस गर्नुस्।

प्रयोगकर्ताको विवरण:
- उमेर: ${age} वर्ष
- मासिक आय: ${incomeFormatted}
- जोखिम क्षमता: ${riskNepali} जोखिम

नेपालमा उपलब्ध लगानी योजनाहरू:

१. EPF (कर्मचारी सञ्चय कोष):
- सरकारी तथा निजी क्षेत्रका कर्मचारीहरूको लागि
- हालको ब्याज दर: ८.५–११%
- नियोक्ताले पनि बराबर योगदान गर्छ (तलबको १०%)
- कर छूट उपलब्ध, सेवानिवृत्तिमा एकमुस्त भुक्तानी
- न्यूनतम जोखिम

२. CIT (नागरिक लगानी कोष):
- जो कोहीले लगानी गर्न सक्छ
- म्युचुअल फन्ड जस्तै, लाभांश मिल्छ
- हालको लाभांश: ७–१०% प्रतिवर्ष
- सरकारी सहभागिता, सुरक्षित
- कम देखि मध्यम जोखिम

३. SSF (सामाजिक सुरक्षा कोष):
- औपचारिक क्षेत्रका कर्मचारीहरूको लागि
- स्वास्थ्य बीमा, दुर्घटना बीमा, मातृत्व सुविधा
- सेवानिवृत्ति पेन्सन, नियोक्ताले पनि योगदान गर्छ
- न्यूनतम जोखिम

४. NEPSE म्युचुअल फन्ड:
- शेयर बजारमा लगानी
- उच्च जोखिम, उच्च रिटर्न सम्भव (१५–३०%+)
- दीर्घकालीन लगानीमा राम्रो, बाजार उतारचढाव हुन्छ
- उच्च जोखिम

५. जीवन बीमा (Beema):
- जीवन सुरक्षा + बचत एकसाथ
- सुरक्षित निवेश, ४–७% रिटर्न
- परिवारको भविष्य सुरक्षित, कर छूट
- न्यूनतम जोखिम

माथिको जानकारीको आधारमा, यस प्रयोगकर्ताको उमेर (${age} वर्ष), आय (${incomeFormatted}), र जोखिम क्षमता (${riskNepali})लाई ध्यानमा राखेर ३–४ वटा सबैभन्दा उपयुक्त योजनाहरू सिफारिस गर्नुस्।

केवल तलको JSON format मा जवाफ दिनुस् — अरू केही नलेख्नुस्:
{
  "sifaris": [
    {
      "name": "EPF",
      "nepaliName": "कर्मचारी सञ्चय कोष",
      "rank": 1,
      "kina": "यो प्रयोगकर्ताको लागि किन उपयुक्त छ — उमेर र आयसँग जोडेर स्पष्ट पार्नुस् (२–३ वाक्य, नेपालीमा)",
      "faida": ["मुख्य फाइदा १", "मुख्य फाइदा २", "मुख्य फाइदा ३"],
      "savdhan": "एउटा महत्वपूर्ण सावधानी वा विचार (नेपालीमा, १ वाक्य)",
      "jokhimLevel": "कम",
      "anumaanitReturn": "८.५–११%"
    }
  ],
  "samgraSalah": "समग्र लगानी रणनीति — यस उमेर र आयको लागि (३–४ वाक्य, नेपालीमा)",
  "mukhyaSandesh": "यस प्रयोगकर्ताको लागि सबैभन्दा महत्वपूर्ण सन्देश (१–२ वाक्य, नेपालीमा)"
}`;

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Claude API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI सेवामा समस्या भयो। कृपया पुनः प्रयास गर्नुस्।" }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const apiData = (await apiRes.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = apiData.content?.[0]?.text?.trim() ?? "";
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
