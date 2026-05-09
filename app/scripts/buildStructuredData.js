const fs = require("fs-extra");

async function buildData() {

  const rawData = await fs.readJson(
    "cleanSchemes.json"
  );

  const structured = rawData.map((item) => {

    const title =
      item.title || "Unknown Scheme";

    const rawContent = Array.isArray(item.content)
      ? item.content.join(" ")
      : String(item.content || "");

    const lower = rawContent.toLowerCase();

    // =========================
    // ORGANIZATION
    // =========================

    let organization = "Unknown";

    if (
      lower.includes("epf") ||
      rawContent.includes("कर्मचारी सञ्चय")
    ) {
      organization = "EPF";
    }

    else if (
      lower.includes("cit") ||
      rawContent.includes("नागरिक लगानी")
    ) {
      organization = "CIT";
    }

    else if (
      lower.includes("ssf") ||
      rawContent.includes("सामाजिक सुरक्षा")
    ) {
      organization = "SSF";
    }

    // =========================
    // CATEGORY
    // =========================

    let category = "Investment";

    if (
      lower.includes("loan") ||
      rawContent.includes("सापटी") ||
      rawContent.includes("ऋण")
    ) {
      category = "Loan";
    }

    else if (
      lower.includes("pension") ||
      rawContent.includes("पेन्सन")
    ) {
      category = "Pension";
    }

    else if (
      lower.includes("insurance") ||
      rawContent.includes("बीमा")
    ) {
      category = "Insurance";
    }

    // =========================
    // SUB CATEGORY
    // =========================

    let subcategory = "General";

    if (
      lower.includes("home loan") ||
      rawContent.includes("घर सापटी")
    ) {
      subcategory = "Home Loan";
    }

    else if (
      lower.includes("education loan") ||
      rawContent.includes("शैक्षिक")
    ) {
      subcategory = "Education Loan";
    }

    else if (
      lower.includes("special loan") ||
      rawContent.includes("विशेष")
    ) {
      subcategory = "Special Loan";
    }

    else if (
      lower.includes("retirement")
    ) {
      subcategory = "Retirement";
    }

    // =========================
    // INTEREST RATE
    // =========================

    let interestRate = null;

    const ratePatterns = [
      /([0-9]+(\.[0-9]+)?)\s?%/g,
      /([0-9]+(\.[0-9]+)?) प्रतिशत/g
    ];

    for (const pattern of ratePatterns) {

      const matches = [...rawContent.matchAll(pattern)];

      if (matches.length > 0) {

        const value = Number(matches[0][1]);

        if (value > 1 && value < 25) {
          interestRate = value;
          break;
        }

      }

    }

    // =========================
    // BENEFITS
    // =========================

    const benefits = [];

    benefits.push(
      "Government backed scheme"
    );

    if (
      rawContent.includes("पेन्सन") ||
      lower.includes("pension")
    ) {

      benefits.push(
        "Retirement support"
      );

    }

    if (
      rawContent.includes("बीमा") ||
      lower.includes("insurance")
    ) {

      benefits.push(
        "Insurance protection"
      );

    }

    if (
      rawContent.includes("उपचार") ||
      lower.includes("medical")
    ) {

      benefits.push(
        "Medical support"
      );

    }

    if (
      rawContent.includes("शिक्षा") ||
      lower.includes("education")
    ) {

      benefits.push(
        "Education financing"
      );

    }

    if (
      rawContent.includes("घर") ||
      lower.includes("house")
    ) {

      benefits.push(
        "Home ownership support"
      );

    }

    // =========================
    // FEATURES
    // =========================

    const retirementSupport =
      rawContent.includes("पेन्सन") ||
      lower.includes("retirement");

    const medicalCoverage =
      rawContent.includes("उपचार");

    const insurance =
      rawContent.includes("बीमा");

    const gratuity =
      rawContent.includes("ग्रेच्युटी");

    // =========================
    // RISK
    // =========================

    const riskLevel = "Low Risk";

    // =========================
    // LIQUIDITY
    // =========================

    let liquidity = "Medium";

    if (category === "Loan") {
      liquidity = "High";
    }

    // =========================
    // SUMMARY
    // =========================

    let summary =
      "नेपालको regulated financial support scheme।";

    if (organization === "EPF") {

      summary =
        "EPF नेपालमा retirement savings र long-term financial security दिने government-backed provident fund system हो।";

    }

    if (organization === "SSF") {

      summary =
        "SSF social security system हो जसले loan, pension, insurance र contributor protection services provide गर्छ।";

    }

    if (organization === "CIT") {

      summary =
        "CIT long-term saving, retirement planning र secure investment platform हो।";

    }

    // =========================
    // RETURN OBJECT
    // =========================

    return {

      title,

      organization,

      category,

      subcategory,

      interestRate,

      riskLevel,

      liquidity,

      retirementSupport,

      medicalCoverage,

      insurance,

      gratuity,

      benefits,

      summary,

      originalContent:
        rawContent.substring(0, 10000),

      sourceFile:
        item.sourceFile || "",

      updatedAt:
        new Date().toISOString(),

    };

  });

  await fs.writeJson(
    "structuredSchemes.json",
    structured,
    { spaces: 2 }
  );

  console.log(
    "ZZC structured fintech database created 🚀"
  );

}

buildData();