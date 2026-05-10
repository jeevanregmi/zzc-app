export type SchemeCategory = "Investment" | "Loan" | "Insurance" | "Pension";
export type Org = "EPF" | "CIT" | "SSF" | "NEPSE" | "Beema";
export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";
export type Liquidity = "Low" | "Medium" | "High";

export interface Scheme {
  id: string;
  title: string;
  titleNepali: string;
  organization: Org;
  category: SchemeCategory;
  subcategory: string;
  summary: string;
  nepaliSummary: string;
  interestRate: number | null;
  annualReturn?: number | null;
  riskLevel: RiskLevel;
  liquidity: Liquidity;
  benefits: string[];
  eligibility: string[];
  documents: string[];
  loanLimit: string | null;
  retirementSupport: boolean;
  medicalCoverage: boolean;
  hasInsurance: boolean;
  gratuity: boolean;
  calculatorEnabled: boolean;
  contributionEmployee?: number;
  contributionEmployer?: number;
  minContribution?: number;
  pensionAge?: number;
  pensionFormula?: string;
  compareTags: string[];
}

export const SCHEMES: Scheme[] = [

  // ─────────────────────── INVESTMENT ────────────────────────────────────────

  {
    id: "epf-provident-fund",
    title: "EPF Provident Fund",
    titleNepali: "कर्मचारी सञ्चय कोष",
    organization: "EPF",
    category: "Investment",
    subcategory: "Retirement Savings",
    summary: "Nepal's largest government-backed retirement savings scheme. Employee and employer each contribute 10% of basic salary monthly. Funds earn compound interest at 8.5% and are returned as lump sum at retirement.",
    nepaliSummary: "नेपालको सबैभन्दा ठूलो सरकारी निवृत्तिभरण बचत योजना। कर्मचारी र नियोक्ता दुवैले मासिक आधार तलबको १०% योगदान गर्छन्। पैसा ८.५% वार्षिक ब्याजसहित जम्मा हुन्छ र अवकाशमा एकमुष्ट फिर्ता हुन्छ।",
    interestRate: 8.5,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Government backed",
      "8.5% compound interest p.a.",
      "Tax exemption on contribution",
      "Retirement lump sum payout",
      "Employer matches 10% of salary",
    ],
    eligibility: [
      "Permanent employee (govt or registered private sector)",
      "Employer must be registered with EPF",
      "Age 16–58 years",
    ],
    documents: [
      "Citizenship certificate",
      "Employee appointment letter",
      "PAN card",
      "Bank account details",
      "Employer registration certificate",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    contributionEmployee: 10,
    contributionEmployer: 10,
    compareTags: ["savings", "retirement", "government", "compound-interest", "tax-benefit"],
  },

  {
    id: "cit-citizens-unit-scheme",
    title: "CIT Citizens Unit Scheme",
    titleNepali: "नागरिक एकांक योजना",
    organization: "CIT",
    category: "Investment",
    subcategory: "Mutual Fund",
    summary: "CIT's flagship open-ended mutual fund. Buy and redeem units at NAV price anytime. CIT provides on-premises buyback facility. Also accepts investment from Nepali diaspora.",
    nepaliSummary: "CIT को प्रमुख खुला म्युचुअल फण्ड। NAV मूल्यमा जुनसुकै बेला एकाइ किन्न र बेच्न सक्छन्। CIT ले आफ्नै परिसरमा बायब्याक सुविधा दिन्छ। विदेशमा रहेका नेपालीहरूले पनि लगानी गर्न सक्छन्।",
    interestRate: null,
    annualReturn: 9,
    riskLevel: "Moderate Risk",
    liquidity: "High",
    benefits: [
      "Open-ended — buy/sell anytime",
      "NAV-based transparent pricing",
      "Buyback at CIT premises",
      "Diaspora investment accepted",
      "Expert trust committee oversight",
    ],
    eligibility: [
      "Any Nepali citizen (resident or non-resident)",
      "Minimum investment per current NAV",
      "Valid citizenship or passport",
    ],
    documents: [
      "Unit purchase application form",
      "Citizenship certificate or passport",
      "Passport-size photograph",
      "Bank account details",
      "PAN card (if applicable)",
      "KYC form",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["mutual-fund", "investment", "open-ended", "NAV", "liquidity", "diaspora"],
  },

  {
    id: "cit-esgrs",
    title: "CIT Employee Savings Growth Retirement Scheme",
    titleNepali: "कर्मचारी बचत वृद्धि अवकाश योजना",
    organization: "CIT",
    category: "Investment",
    subcategory: "Retirement Savings",
    summary: "Voluntary defined-contributory individual account retirement scheme. Monthly salary deductions via commercial banks. Tax deduction up to contribution amount or 33% of total remuneration.",
    nepaliSummary: "स्वैच्छिक, परिभाषित अंशदान, पूर्णरूपमा सञ्चित, व्यक्तिगत खाता आधारित अवकाश योजना। मासिक तलबबाट काटिएको रकम वाणिज्य बैंक मार्फत जम्मा हुन्छ। योगदान रकम वा कुल पारिश्रमिकको ३३% सम्म कर छुट पाइन्छ।",
    interestRate: 9,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "9% annual interest",
      "Tax deduction up to 33% of remuneration",
      "Individual account transparency",
      "Fully funded — no pension deficit risk",
      "Collected via banks nationwide",
    ],
    eligibility: [
      "Employees in organizations enrolled in the scheme",
      "Voluntary participation",
      "Employer must be registered with CIT for this scheme",
    ],
    documents: [
      "Enrollment application form",
      "Citizenship certificate",
      "Employee appointment letter",
      "Bank account details",
      "Salary certificate",
      "PAN card",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["savings", "retirement", "tax-benefit", "voluntary", "individual-account"],
  },

  {
    id: "nepse-mutual-fund",
    title: "NEPSE Mutual Fund",
    titleNepali: "नेप्से म्युचुअल फण्ड",
    organization: "NEPSE",
    category: "Investment",
    subcategory: "Stock Market / Mutual Fund",
    summary: "Invest in Nepal Stock Exchange through SEBON-registered mutual funds (NMB, Nabil, Laxmi, etc.). Higher potential returns with higher market risk. Units purchased through banks or fund houses.",
    nepaliSummary: "SEBON दर्ता म्युचुअल फण्डहरू (NMB, नबिल, लक्ष्मी आदि) मार्फत नेपाल शेयर बजारमा लगानी। बढी सम्भावित प्रतिफल तर बढी बजार जोखिम। बैंक वा फण्ड हाउसबाट एकाइ खरिद।",
    interestRate: null,
    annualReturn: 15,
    riskLevel: "High Risk",
    liquidity: "High",
    benefits: [
      "Market-linked higher returns (avg 12–20% p.a.)",
      "Diversified stock portfolio",
      "Professional fund management",
      "Liquid — units can be sold anytime",
      "SEBON regulated",
    ],
    eligibility: [
      "Any Nepali citizen with DEMAT account",
      "Minimum purchase per current NAV",
      "Valid citizenship or passport",
      "DEMAT account via bank/broker",
    ],
    documents: [
      "DEMAT account opening form",
      "Citizenship certificate",
      "Passport-size photograph",
      "PAN card",
      "Bank account details",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["NEPSE", "mutual-fund", "stock-market", "high-return", "liquid", "DEMAT"],
  },

  // ─────────────────────── LOAN ──────────────────────────────────────────────

  {
    id: "epf-house-loan",
    title: "EPF House Loan",
    titleNepali: "EPF घर सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Home Loan",
    summary: "EPF members can purchase, construct, or buy a house using their EPF fund as collateral. Higher loan limit and lower rate than commercial banks.",
    nepaliSummary: "EPF सदस्यहरूले घर किन्न, बनाउन वा खरिद गर्न आफ्नो कोष धितो राखेर ऋण लिन सक्छन्। व्यावसायिक घर ऋणभन्दा बढी रकम र कम ब्याजदर।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to NPR 60 lakhs",
      "10% interest — lower than banks",
      "No external collateral needed",
      "Home ownership support",
      "Government backed",
    ],
    eligibility: [
      "Active EPF member for minimum 3 years",
      "First home preferred",
      "Sufficient fund balance",
      "Property within Nepal",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Land ownership certificate (lalpurja)",
      "Blueprint / construction plan",
      "EPF fund statement",
      "Employer recommendation letter",
      "Property valuation report",
    ],
    loanLimit: "Up to NPR 60 lakhs or 90% of fund balance (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "home-loan", "housing", "construction", "property"],
  },

  {
    id: "epf-special-loan",
    title: "EPF Special Loan",
    titleNepali: "EPF विशेष सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Personal Loan",
    summary: "Borrow up to 90% of accumulated provident fund balance for any personal purpose. Low interest with fund balance as collateral.",
    nepaliSummary: "जम्मा रकमको ९०% सम्म कुनै पनि व्यक्तिगत कामको लागि ऋण। आफ्नै कोष धितो राखेर कम ब्याजदरमा।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 90% of fund balance",
      "Any personal purpose",
      "10% interest — lower than banks",
      "No external collateral",
      "Quick processing",
    ],
    eligibility: [
      "Active EPF member for minimum 1 year",
      "Sufficient fund balance",
      "No existing EPF loan default",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "EPF passbook / fund statement",
      "Employer recommendation letter",
      "Recent payslip",
    ],
    loanLimit: "Up to 90% of accumulated provident fund balance",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "personal-loan", "low-interest", "quick", "fund-backed"],
  },

  {
    id: "epf-education-loan",
    title: "EPF Education Loan",
    titleNepali: "EPF शैक्षिक सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Education Loan",
    summary: "Fund higher education for yourself or dependent children at recognized institutions inside and outside Nepal. Covers tuition, living, and study materials.",
    nepaliSummary: "आफ्नो वा आश्रित सन्तानको उच्च शिक्षाको लागि। नेपाल वा विदेशमा मान्यताप्राप्त शिक्षण संस्थामा ट्युशन, बसोबास र पुस्तकहरूको खर्च समेट्छ।",
    interestRate: 9,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to NPR 30 lakhs",
      "9% interest — lowest EPF rate",
      "Covers foreign universities",
      "Grace period during study",
      "Covers dependents",
    ],
    eligibility: [
      "Active EPF member for minimum 1 year",
      "Admission letter from recognized institution",
      "Sufficient fund balance",
    ],
    documents: [
      "Loan application form",
      "Admission/enrollment letter",
      "Citizenship certificate",
      "Relationship proof (for dependent)",
      "EPF fund statement",
      "Employer recommendation letter",
    ],
    loanLimit: "Up to NPR 30 lakhs or 90% of fund balance (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "education", "study", "university", "children"],
  },

  {
    id: "epf-easy-loan",
    title: "EPF Easy Loan",
    titleNepali: "EPF सहज सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Personal Loan",
    summary: "Simplified fast-processing loan for immediate personal needs. Minimal documentation. Up to 50% of accumulated fund balance.",
    nepaliSummary: "तत्काल व्यक्तिगत आवश्यकताको लागि सरलीकृत, छिटो प्रशोधन हुने ऋण। कम कागजात। जम्मा कोषको ५०% सम्म।",
    interestRate: 11,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 50% of fund balance",
      "Fast processing",
      "Minimal documentation",
      "No external collateral",
      "Flexible repayment",
    ],
    eligibility: [
      "Active EPF member",
      "Minimum 6 months of contributions",
      "No existing loan default",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "EPF passbook",
      "Recent payslip",
      "Employer recommendation letter",
    ],
    loanLimit: "Up to 50% of accumulated fund balance",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "easy", "quick", "personal", "minimal-docs"],
  },

  {
    id: "epf-house-maintenance-loan",
    title: "EPF House Maintenance Loan",
    titleNepali: "EPF घर मर्मत सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Home Repair",
    summary: "Funds for repairing, renovating, or maintaining an existing home. Ideal for earthquake repair and structural improvements. Up to NPR 20 lakhs.",
    nepaliSummary: "भइरहेको घरको मर्मत, नवीकरण वा रखरखावको लागि। भूकम्प मर्मत र संरचनागत सुधारको लागि उपयुक्त। २० लाख सम्म।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to NPR 20 lakhs",
      "10% interest",
      "Covers renovation and repair",
      "Earthquake rehabilitation eligible",
      "Government backed",
    ],
    eligibility: [
      "Active EPF member for minimum 2 years",
      "Must own the property being repaired",
      "Property within Nepal",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Land ownership certificate (lalpurja)",
      "Repair/renovation estimate from engineer",
      "EPF fund statement",
      "Employer recommendation letter",
    ],
    loanLimit: "Up to NPR 20 lakhs or 70% of fund balance (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "home-repair", "renovation", "maintenance", "earthquake"],
  },

  {
    id: "epf-land-loan",
    title: "EPF Land Purchase Loan",
    titleNepali: "EPF जग्गा खरिद सापटी",
    organization: "EPF",
    category: "Loan",
    subcategory: "Property Loan",
    summary: "Finance the purchase of residential land using provident fund as collateral. Up to NPR 40 lakhs. Land must be within Municipality or Sub-Metropolitan area.",
    nepaliSummary: "आवासीय जग्गा खरिद गर्न आफ्नो सञ्चय कोष धितो राखेर। ४० लाख सम्म। जग्गा नगरपालिका वा उपमहानगरपालिका क्षेत्रभित्र हुनुपर्छ।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to NPR 40 lakhs",
      "10% interest",
      "Residential land purchase",
      "Lower rate than banks",
      "Property serves as collateral",
    ],
    eligibility: [
      "Active EPF member for minimum 3 years",
      "Land within Municipality/Sub-Metro area",
      "Residential purpose only",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Sale deed (rajinama) of land",
      "Land survey map (napi naksha)",
      "EPF fund statement",
      "Employer recommendation letter",
      "Land valuation certificate",
    ],
    loanLimit: "Up to NPR 40 lakhs or 80% of fund balance (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "land", "property", "residential", "real-estate"],
  },

  {
    id: "ssf-home-loan",
    title: "SSF Home Loan",
    titleNepali: "SSF घर सापटी",
    organization: "SSF",
    category: "Loan",
    subcategory: "Home Loan",
    summary: "SSF contributors borrow from accumulated individual fund for house purchase or construction. Secured against own SSF balance. 9% interest — lower than commercial banks. Repayment via salary deduction.",
    nepaliSummary: "SSF योगदानकर्ताहरूले घर खरिद वा निर्माणको लागि आफ्नो जम्मा व्यक्तिगत कोषबाट सापटी लिन सक्छन्। ९% ब्याज — बैंकभन्दा कम। मासिक तलब कट्टाबाट तिर्न पाइन्छ।",
    interestRate: 9,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 70% of SSF fund balance",
      "9% interest — lowest home loan rate",
      "No external collateral needed",
      "Salary deduction repayment",
      "Government backed",
    ],
    eligibility: [
      "Active SSF contributor for minimum 2 years",
      "Sufficient accumulated fund balance",
      "Property within Nepal",
      "No existing SSF loan default",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Land ownership certificate (lalpurja)",
      "Construction plan or sale agreement",
      "SSF account statement",
      "Employer recommendation",
      "Property valuation report",
    ],
    loanLimit: "Up to 70% of accumulated individual SSF fund balance",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "home-loan", "housing", "property", "low-interest", "fund-backed"],
  },

  {
    id: "ssf-education-loan",
    title: "SSF Education Loan",
    titleNepali: "SSF शैक्षिक सापटी",
    organization: "SSF",
    category: "Loan",
    subcategory: "Education Loan",
    summary: "Borrow from accumulated SSF fund for higher education — self or dependent children — at recognized institutions inside or outside Nepal. 8% interest — lowest among all fund loans.",
    nepaliSummary: "आफ्नो वा आश्रित सन्तानको उच्च शिक्षाको खर्चका लागि जम्मा SSF कोषबाट। ८% ब्याज — सबै कोष ऋणहरूमध्ये सबैभन्दा कम।",
    interestRate: 8,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 50% of SSF fund balance",
      "8% interest — lowest rate",
      "Covers foreign universities",
      "Grace period during study",
      "Covers dependents",
    ],
    eligibility: [
      "Active SSF contributor for minimum 1 year",
      "Admission letter from recognized institution",
      "Sufficient fund balance",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Admission or enrollment letter",
      "Fee structure from institution",
      "SSF account statement",
      "Relationship proof (for child)",
      "Employer recommendation",
    ],
    loanLimit: "Up to 50% of accumulated individual SSF fund balance",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "education", "study", "university", "children", "fund-backed"],
  },

  {
    id: "ssf-special-loan",
    title: "SSF Special Loan",
    titleNepali: "SSF विशेष सापटी",
    organization: "SSF",
    category: "Loan",
    subcategory: "Personal Loan",
    summary: "Borrow from accumulated SSF fund for any personal need. Quick processing, no external collateral. 10% interest — lower than commercial banks.",
    nepaliSummary: "कुनै पनि व्यक्तिगत आवश्यकताका लागि जम्मा SSF कोषबाट। बाह्य धितो नचाहिने, छिटो प्रक्रिया। १०% ब्याज — बैंकभन्दा कम।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 60% of SSF fund balance",
      "Any purpose",
      "10% interest",
      "No external collateral",
      "Quick processing",
    ],
    eligibility: [
      "Active SSF contributor for minimum 1 year",
      "Sufficient fund balance",
      "No existing SSF loan default",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "SSF account statement",
      "Recent payslip",
      "Employer recommendation",
    ],
    loanLimit: "Up to 60% of accumulated individual SSF fund balance",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "personal-loan", "any-purpose", "quick", "fund-backed"],
  },

  // ─────────────────────── INSURANCE ─────────────────────────────────────────

  {
    id: "ssf-dependent-family",
    title: "SSF Dependent Family Security",
    titleNepali: "SSF आश्रित परिवार सुरक्षा",
    organization: "SSF",
    category: "Insurance",
    subcategory: "Death Benefit",
    summary: "Financial support to family of deceased SSF contributor. Natural death: lump sum = 7 months basic salary. Accidental death: higher benefit. Surviving dependents receive ongoing monthly support.",
    nepaliSummary: "मृत्यु भएको SSF योगदानकर्ताको परिवारलाई आर्थिक सहायता। स्वाभाविक मृत्युमा ७ महिनाको आधार तलब बराबर। दुर्घटनाजन्य मृत्युमा थप सुविधा। आश्रितहरूले मासिक सहायता पाउँछन्।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "7 months salary on natural death",
      "Higher benefit on accidental death",
      "Monthly support for surviving dependents",
      "Covers spouse and children",
      "Automatic — no extra premium",
    ],
    eligibility: [
      "Active SSF contributor at time of death",
      "Minimum contribution period met",
      "Claimant must be legal heir, spouse, or dependent child",
    ],
    documents: [
      "Claim application form",
      "Death certificate",
      "Citizenship certificate of claimant",
      "Relationship proof",
      "SSF contributor card",
      "Bank account details",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "death-benefit", "dependent-family", "lump-sum", "social-security"],
  },

  {
    id: "ssf-accident-disability",
    title: "SSF Accident & Disability Protection",
    titleNepali: "SSF दुर्घटना तथा अपाङ्गता सुरक्षा",
    organization: "SSF",
    category: "Insurance",
    subcategory: "Accident Insurance",
    summary: "Compensation for SSF contributors who suffer accidents or disabilities at workplace or outside. Full (100%) disability = lifetime monthly pension. Partial disability = percentage compensation. Treatment costs covered during recovery.",
    nepaliSummary: "कार्यस्थल वा बाहिर दुर्घटना वा अपाङ्गतामा परेका SSF योगदानकर्ताहरूलाई क्षतिपूर्ति। पूर्ण अपाङ्गतामा जीवनभर मासिक पेन्सन। आंशिक अपाङ्गतामा प्रतिशतका आधारमा। उपचार खर्च समेटिन्छ।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Lifetime pension for full (100%) disability",
      "Partial disability percentage compensation",
      "Workplace & non-workplace accidents covered",
      "Treatment costs covered",
      "Automatic — no extra premium",
    ],
    eligibility: [
      "Active SSF contributor at time of accident",
      "Accident reported to SSF within 7 days",
      "Minimum 3 months of SSF contributions",
    ],
    documents: [
      "Claim application form",
      "Citizenship certificate",
      "Medical report and disability certificate",
      "Hospital bills",
      "Accident report",
      "SSF contributor ID",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: true,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "accident", "disability", "workplace", "monthly-pension"],
  },

  {
    id: "ssf-healthcare",
    title: "SSF Medical Treatment & Health",
    titleNepali: "SSF स्वास्थ्य उपचार",
    organization: "SSF",
    category: "Insurance",
    subcategory: "Health Insurance",
    summary: "Reimburses OPD (up to NPR 10,000/year) and IPD hospitalization (up to NPR 1,00,000/year) for contributors and immediate family. Treatment at SSF-empanelled hospitals.",
    nepaliSummary: "OPD (प्रतिवर्ष १०,०००) र IPD अस्पताल भर्ना (प्रतिवर्ष १,००,०००) खर्च प्रतिपूर्ति। योगदानकर्ता र नजिकको परिवारको लागि। SSF सूचीकृत अस्पतालहरूमा उपचार।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "Medium",
    benefits: [
      "OPD: NPR 10,000/year per family",
      "IPD: NPR 1,00,000/year",
      "Covers spouse + 2 children under 18",
      "Annual limit resets each fiscal year",
      "Automatic — no extra premium",
    ],
    eligibility: [
      "Active SSF contributor",
      "Treatment at SSF-empanelled hospitals only",
      "Claim within 35 days of treatment",
    ],
    documents: [
      "Healthcare claim form",
      "Citizenship certificate",
      "Original hospital bills and receipts",
      "Discharge summary and prescription",
      "SSF contributor card",
      "Relationship proof for family claims",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: true,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["healthcare", "medical", "OPD", "IPD", "hospitalization", "family-coverage"],
  },

  {
    id: "cit-term-life-insurance",
    title: "CIT Government Employees Term Life Insurance",
    titleNepali: "CIT सरकारी कर्मचारी सावधिक जीवन बीमा",
    organization: "CIT",
    category: "Insurance",
    subcategory: "Term Life Insurance",
    summary: "Mandatory term life insurance for all government civil servants, teachers, Nepal Army, Nepal Police, and Armed Police Force since 2062/63 BS. NPR 400/month employee + NPR 400 government. NPR 2,00,000 sum insured for 20 years.",
    nepaliSummary: "२०६२/६३ देखि सबै सरकारी कर्मचारी, शिक्षक, नेपाली सेना, नेपाल प्रहरी र सशस्त्र प्रहरीका लागि अनिवार्य। कर्मचारी ४०० + सरकार ४०० रुपैयाँ। २ लाखको बीमांक।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "NPR 2,00,000 sum insured",
      "20-year life coverage",
      "Government matches NPR 400/month",
      "Mandatory — automatic enrollment",
      "Covers civil servants, teachers, army, police",
    ],
    eligibility: [
      "All permanent government civil servants",
      "Community school teachers",
      "Nepal Army, Nepal Police, Armed Police Force",
      "Automatic enrollment on joining service",
    ],
    documents: [
      "Appointment letter (for new entrants)",
      "Citizenship certificate",
      "Employee ID",
      "Nominee declaration form",
      "Bank account details",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "term-life", "government-employees", "mandatory", "teachers", "army"],
  },

  {
    id: "epf-accident-insurance",
    title: "EPF Accident Compensation",
    titleNepali: "EPF दुर्घटना क्षतिपूर्ति",
    organization: "EPF",
    category: "Insurance",
    subcategory: "Accident Insurance",
    summary: "Financial support to EPF members who suffer workplace or non-workplace accidents resulting in disability or injury. Covers medical costs and lost income during recovery.",
    nepaliSummary: "कार्यस्थल वा कार्यस्थल बाहिरको दुर्घटनाबाट अपाङ्गता वा चोटपटक भएका EPF सदस्यहरूलाई आर्थिक सहायता। उपचार खर्च र आम्दानी नोक्सानी समेट्छ।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Accident coverage",
      "Medical cost reimbursement",
      "Disability compensation",
      "Covers workplace and non-workplace",
      "Government backed",
    ],
    eligibility: [
      "Active EPF member at time of accident",
      "Accident reported within 30 days",
      "Medical documentation of injury required",
    ],
    documents: [
      "Claim application form",
      "Citizenship certificate",
      "Medical report and hospital bills",
      "Accident report / police report",
      "Employer certification",
      "EPF membership card",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: true,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "accident", "disability", "compensation", "workplace"],
  },

  {
    id: "beema-jeevan",
    title: "Jeevan Beema (Life Insurance)",
    titleNepali: "जीवन बीमा",
    organization: "Beema",
    category: "Insurance",
    subcategory: "Life Insurance",
    summary: "Private life insurance from Nepal Life, Rastriya Beema, or other IRDAI-registered insurers. Term life: pure protection at low premium. Endowment: savings + insurance. Available to any Nepali citizen via insurance agents or digital portals.",
    nepaliSummary: "नेपाल लाइफ, राष्ट्रिय बीमा वा अन्य IRDAI दर्ता बीमकबाट निजी जीवन बीमा। सावधिक बीमा: कम प्रिमियममा शुद्ध सुरक्षा। बन्दोबस्त बीमा: बचत + बीमा। बीमा एजेन्ट वा डिजिटल पोर्टलबाट।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Sum assured: NPR 10L to 1Cr+",
      "Term life: low premium, high cover",
      "Endowment: savings + maturity benefit",
      "Tax exemption on premium",
      "Family protection on death",
    ],
    eligibility: [
      "Any Nepali citizen aged 18–65 years",
      "Medical checkup may be required (high sum assured)",
      "Valid citizenship or passport",
    ],
    documents: [
      "Proposal form",
      "Citizenship certificate",
      "Passport-size photograph",
      "Medical checkup report (if required)",
      "Bank account details",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["insurance", "life-insurance", "term-life", "endowment", "family-protection"],
  },

  {
    id: "beema-swasthya",
    title: "Swasthya Beema (Health Insurance)",
    titleNepali: "स्वास्थ्य बीमा",
    organization: "Beema",
    category: "Insurance",
    subcategory: "Health Insurance",
    summary: "Government Swasthya Bima Programme: NPR 500/year premium covers NPR 1 lakh hospitalization for family of 5. Private health insurance: higher limits, more hospitals. Renewable annually. Subsidized premium for poor households.",
    nepaliSummary: "सरकारी स्वास्थ्य बीमा कार्यक्रम: ५०० रुपैयाँ/वर्ष प्रिमियममा ५ जनाको परिवारलाई १ लाखको अस्पताल भर्ना। निजी स्वास्थ्य बीमा: बढी सीमा, बढी अस्पताल। वार्षिक नवीकरण। गरिब परिवारलाई अनुदानित प्रिमियम।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "Medium",
    benefits: [
      "Govt scheme: NPR 500/year for NPR 1 lakh cover",
      "Family of 5 covered under one policy",
      "400+ empanelled hospitals nationwide",
      "Private scheme: up to NPR 5 lakh+",
      "Subsidized for poor households",
    ],
    eligibility: [
      "Any Nepali citizen",
      "Govt scheme: family-based enrollment",
      "Private scheme: age 18–65 years",
    ],
    documents: [
      "Application form",
      "Citizenship certificate",
      "Family census (pariwar darta praman patra)",
      "Passport-size photograph",
      "Premium payment receipt",
    ],
    loanLimit: null,
    retirementSupport: false,
    medicalCoverage: true,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "health", "hospitalization", "swasthya-beema", "government", "family"],
  },

  // ─────────────────────── PENSION ────────────────────────────────────────────

  // ─── CIT LOANS (unit pledge / collateral) ──────────────────────────────────

  {
    id: "cit-unit-home-loan",
    title: "CIT Unit Pledge Home Loan",
    titleNepali: "CIT एकाइ धितो गृह ऋण",
    organization: "CIT",
    category: "Loan",
    subcategory: "Home Loan",
    summary: "CIT unit holders can pledge their accumulated Citizens Unit Scheme units as collateral to obtain a home loan from partner commercial banks. Interest rate is lower than standard commercial bank rates.",
    nepaliSummary: "CIT एकाइ धारकहरूले आफ्ना नागरिक एकांक योजनाका एकाइहरू धितो राखेर साझेदार वाणिज्य बैंकबाट गृह ऋण लिन सक्छन्। ब्याजदर सामान्य बैंक दरभन्दा कम हुन्छ।",
    interestRate: 10,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "CIT units serve as collateral — no property pledge needed initially",
      "Competitive home loan rate",
      "Units continue earning returns during loan period",
      "Accessible via CIT partner banks",
      "Higher loan amount than special loan",
    ],
    eligibility: [
      "Active CIT unit holder with sufficient unit balance",
      "Minimum CIT unit value as per bank requirement",
      "Property for home purchase/construction within Nepal",
      "Valid KYC with CIT",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "CIT unit certificate / account statement",
      "Land ownership certificate (lalpurja)",
      "Construction plan or sale agreement",
      "Bank KYC documents",
    ],
    loanLimit: "Up to 70% of pledged CIT unit value",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "CIT", "unit-pledge", "home-loan", "collateral"],
  },

  {
    id: "cit-unit-personal-loan",
    title: "CIT Unit Pledge Personal Loan",
    titleNepali: "CIT एकाइ धितो व्यक्तिगत ऋण",
    organization: "CIT",
    category: "Loan",
    subcategory: "Personal Loan",
    summary: "Pledge CIT Citizens Unit Scheme units as collateral for a personal loan through CIT's partner banks. Any personal purpose. Quick processing compared to unsecured personal loans.",
    nepaliSummary: "CIT नागरिक एकांक योजनाका एकाइहरू धितो राखेर साझेदार बैंकमार्फत व्यक्तिगत ऋण लिनुस्। कुनै पनि व्यक्तिगत कामको लागि। असुरक्षित व्यक्तिगत ऋणभन्दा छिटो प्रक्रिया।",
    interestRate: 11,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Any personal purpose",
      "CIT units as collateral — no external property needed",
      "Units earn returns during loan period",
      "Quick approval via partner banks",
      "Lower rate than unsecured personal loans",
    ],
    eligibility: [
      "Active CIT unit holder",
      "Sufficient CIT unit balance",
      "Valid KYC with CIT and partner bank",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "CIT unit certificate / account statement",
      "Bank KYC documents",
      "Purpose justification (if required)",
    ],
    loanLimit: "Up to 60% of pledged CIT unit value",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "CIT", "unit-pledge", "personal-loan", "collateral"],
  },

  {
    id: "cit-unit-education-loan",
    title: "CIT Unit Pledge Education Loan",
    titleNepali: "CIT एकाइ धितो शैक्षिक ऋण",
    organization: "CIT",
    category: "Loan",
    subcategory: "Education Loan",
    summary: "Pledge CIT Citizens Unit Scheme units as collateral for higher education financing. Covers tuition, living, and study materials at recognized institutions inside and outside Nepal.",
    nepaliSummary: "उच्च शिक्षाको वित्तपोषणको लागि CIT नागरिक एकांक योजनाका एकाइहरू धितो राख्नुस्। नेपाल वा विदेशका मान्यताप्राप्त संस्थाहरूमा ट्युशन, बसोबास र अध्ययन सामग्री समेट्छ।",
    interestRate: 9,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Education financing via unit pledge",
      "9% interest — competitive rate",
      "Covers foreign universities",
      "Grace period during study",
      "Units continue earning during loan",
    ],
    eligibility: [
      "Active CIT unit holder with sufficient units",
      "Admission letter from recognized institution",
      "For dependents: proof of relationship",
      "Valid KYC with CIT and partner bank",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "CIT unit certificate / account statement",
      "Admission / enrollment letter",
      "Fee structure from institution",
      "Relationship proof (for dependent)",
    ],
    loanLimit: "Up to 70% of pledged CIT unit value",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "CIT", "unit-pledge", "education-loan", "collateral"],
  },

  // ─── CIT KBBAK (Karmachari Bachat Bikas Arthik Kosh) ───────────────────────

  {
    id: "cit-kbbak",
    title: "CIT Karmachari Bachat Bikas Arthik Kosh (KBBAK)",
    titleNepali: "CIT कर्मचारी बचत विकास अर्थिक कोष",
    organization: "CIT",
    category: "Investment",
    subcategory: "Employee Savings Fund",
    summary: "CIT's employee savings development fund — a defined-benefit savings vehicle for institutions and their employees. Combines savings, investment growth, and welfare provisions. Organizations deposit a fixed percentage of salary; CIT manages and grows the fund at competitive rates.",
    nepaliSummary: "CIT को कर्मचारी बचत विकास अर्थिक कोष — संस्था र कर्मचारीहरूको लागि परिभाषित-लाभ बचत साधन। बचत, लगानी वृद्धि र कल्याण प्रावधान एकसाथ समेट्छ। संस्थाहरूले तलबको निश्चित प्रतिशत जम्मा गर्छन्; CIT ले प्रतिस्पर्धी दरमा कोष व्यवस्थापन र वृद्धि गर्छ।",
    interestRate: 9,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "9% annual interest on accumulated fund",
      "Tax deduction on contributions",
      "Welfare and emergency withdrawal provisions",
      "CIT professional fund management",
      "Can complement EPF/SSF contributions",
      "Institutional and individual account tracking",
    ],
    eligibility: [
      "Organizations registered with CIT for KBBAK",
      "Employees of enrolled organizations",
      "Voluntary participation where allowed",
      "Formal agreement with CIT required",
    ],
    documents: [
      "KBBAK enrollment form",
      "Citizenship certificate",
      "Employee appointment letter",
      "Organization enrollment agreement with CIT",
      "Bank account details",
      "PAN card",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["savings", "KBBAK", "CIT", "employee-fund", "tax-benefit", "institutional"],
  },

  {
    id: "ssf-old-age-pension",
    title: "SSF Old Age Security Pension",
    titleNepali: "SSF बृद्धाश्रम सुरक्षा पेन्सन",
    organization: "SSF",
    category: "Pension",
    subcategory: "Retirement",
    summary: "SSF's core retirement scheme. Employee 11% + Employer 20% of basic salary accumulated in individual account. Monthly pension from age 60. Formula: salary × years_of_service × 1.33% per month. Lump sum if contribution < 15 years.",
    nepaliSummary: "SSF को मुख्य अवकाश पेन्सन योजना। कर्मचारी ११% + नियोक्ता २०% आधार तलबको व्यक्तिगत खातामा। ६० वर्षमा मासिक पेन्सन। सूत्र: तलब × सेवा वर्ष × १.३३%। १५ वर्षभन्दा कम योगदानमा एकमुष्ट।",
    interestRate: null,
    annualReturn: 8.5,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "31% total contribution (11% + 20%)",
      "Monthly pension for life from age 60",
      "Individual account — your money stays yours",
      "Pension formula: salary × years × 1.33%",
      "Lump sum if < 15 years contribution",
    ],
    eligibility: [
      "All formal sector employees (SSF-registered employer)",
      "Informal / self-employed (voluntary)",
      "Foreign employment workers (special provision)",
      "Minimum 15 years to qualify for monthly pension",
      "Pension age: 60 years",
    ],
    documents: [
      "SSF registration form",
      "Citizenship certificate",
      "Employer registration proof",
      "Recent payslip",
      "Bank account details",
      "PAN card",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    contributionEmployee: 11,
    contributionEmployer: 20,
    pensionAge: 60,
    pensionFormula: "salary × years × 1.33% / month",
    compareTags: ["pension", "retirement", "old-age", "individual-account", "mandatory", "employer-contribution"],
  },

  {
    id: "epf-pension-gratuity",
    title: "EPF Pension and Gratuity",
    titleNepali: "EPF पेन्सन र उपदान",
    organization: "EPF",
    category: "Pension",
    subcategory: "Retirement",
    summary: "After completing qualifying service, EPF members receive monthly pension for life plus one-time gratuity. Minimum 20 years of EPF contribution. Retirement age 58. Provides lifelong financial security.",
    nepaliSummary: "निश्चित सेवा अवधि पूरा गरेपछि EPF सदस्यहरूले जीवनभर मासिक पेन्सन र एकपटक ग्रेच्युटी पाउँछन्। न्यूनतम २० वर्ष EPF योगदान। अवकाश उमेर ५८। जीवनभर आर्थिक सुरक्षा।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Monthly pension for life",
      "One-time gratuity lump sum",
      "Requires minimum 20 years contribution",
      "Inflation-adjusted pension",
      "Government backed",
    ],
    eligibility: [
      "Minimum 20 years of EPF contribution",
      "Retirement age 58 years",
      "Or voluntary retirement after 50 with 20 years service",
      "Active EPF member",
    ],
    documents: [
      "Citizenship certificate",
      "Retirement / voluntary retirement letter",
      "Service record certificate",
      "EPF membership card",
      "Bank account details",
      "Recent photograph",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: true,
    calculatorEnabled: true,
    contributionEmployee: 10,
    contributionEmployer: 10,
    pensionAge: 58,
    compareTags: ["pension", "retirement", "gratuity", "government", "lifetime-income"],
  },

  {
    id: "cit-citizens-pension",
    title: "CIT Citizens Pension Scheme",
    titleNepali: "नागरिक पेन्सन योजना",
    organization: "CIT",
    category: "Pension",
    subcategory: "Voluntary Pension",
    summary: "CIT's voluntary pension scheme (launched 2019). Open to anyone — employed or self-employed. Minimum NPR 500/month. Pension starts at age 60 after 15 years. On death, transferred to spouse; remaining fund to nominees.",
    nepaliSummary: "CIT को स्वैच्छिक पेन्सन योजना (२०१९)। रोजगारी वा स्वरोजगारी जो कोहीका लागि खुला। न्यूनतम ५०० रुपैयाँ/महिना। ६० वर्ष र १५ वर्ष योगदानपछि जीवनभर पेन्सन। मृत्युपछि पति/पत्नीलाई हस्तान्तरण।",
    interestRate: null,
    annualReturn: 9,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Open to all — not just employees",
      "Minimum NPR 500/month",
      "Lifetime pension after age 60",
      "Spouse continues pension after death",
      "Nominees receive remaining fund",
    ],
    eligibility: [
      "Any Nepali citizen (employed or self-employed)",
      "Age 18–50 years at enrollment",
      "Minimum NPR 500/month contribution",
      "Minimum 15 years to qualify for pension",
    ],
    documents: [
      "Pension scheme enrollment form",
      "Citizenship certificate",
      "Passport-size photograph",
      "Bank account details",
      "PAN card",
      "Nominee declaration form",
    ],
    loanLimit: null,
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    minContribution: 500,
    pensionAge: 60,
    compareTags: ["pension", "retirement", "voluntary", "lifetime", "spouse-benefit", "self-employed"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getByCategory(category: SchemeCategory): Scheme[] {
  return SCHEMES.filter((s) => s.category === category);
}

export function getByOrg(org: Org): Scheme[] {
  return SCHEMES.filter((s) => s.organization === org);
}

export function getById(id: string): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

export const INVESTMENT_SCHEMES = getByCategory("Investment");
export const LOAN_SCHEMES = getByCategory("Loan");
export const INSURANCE_SCHEMES = getByCategory("Insurance");
export const PENSION_SCHEMES = getByCategory("Pension");

export const ORG_COLORS: Record<Org, string> = {
  EPF:   "bg-blue-600",
  CIT:   "bg-purple-600",
  SSF:   "bg-orange-600",
  NEPSE: "bg-green-700",
  Beema: "bg-rose-700",
};

export const CATEGORY_META: Record<SchemeCategory, { icon: string; color: string; nepali: string }> = {
  Investment: { icon: "📈", color: "green",  nepali: "लगानी" },
  Loan:       { icon: "🏠", color: "blue",   nepali: "ऋण" },
  Insurance:  { icon: "🛡️", color: "rose",   nepali: "बीमा" },
  Pension:    { icon: "🎯", color: "purple", nepali: "पेन्सन" },
};

// ─── Calculator Helper Functions ─────────────────────────────────────────────

/** Format a number as NPR in Nepali short form (करोड / लाख / ₹) */
export function formatNPR(n: number): string {
  if (n >= 10_000_000) return `NPR ${(n / 10_000_000).toFixed(2)} करोड`;
  if (n >= 100_000)    return `NPR ${(n / 100_000).toFixed(2)} लाख`;
  return `NPR ${Math.round(n).toLocaleString()}`;
}

/** SIP future value — monthly investment at annual rate for given years */
export function calcSIP(monthlyAmount: number, annualRate: number, years: number): number {
  if (years <= 0 || monthlyAmount <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthlyAmount * n;
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/** Build year-by-year SIP growth rows (age, fund, contributed) */
export function buildSIPRows(
  monthly: number,
  annualRate: number,
  fromAge: number,
  toAge: number,
): { age: number; fund: number; contributed: number }[] {
  const years = toAge - fromAge;
  if (years <= 0 || monthly <= 0) return [];
  const r = annualRate / 100 / 12;
  const rows = [];
  let fund = 0, contributed = 0;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      fund = fund * (1 + r) + monthly;
      contributed += monthly;
    }
    rows.push({ age: fromAge + y, fund: Math.round(fund), contributed: Math.round(contributed) });
  }
  return rows;
}

/** EMI calculation + amortization rows */
export interface EMIResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  rows: { year: number; cumPrincipal: number; cumInterest: number }[];
}
export function calcEMI(principal: number, annualRate: number, years: number): EMIResult {
  if (principal <= 0 || annualRate <= 0 || years <= 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0, rows: [] };
  }
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const emi = Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const rows = [];
  let balance = principal;
  let cumInterest = 0, cumPrincipal = 0;
  for (let y = 1; y <= years; y++) {
    let yInt = 0, yPrin = 0;
    for (let m = 0; m < 12; m++) {
      const intPmt = balance * r;
      const prinPmt = Math.min(emi - intPmt, balance);
      balance = Math.max(0, balance - prinPmt);
      yInt += intPmt; yPrin += prinPmt;
    }
    cumInterest += yInt; cumPrincipal += yPrin;
    rows.push({ year: y, cumPrincipal: Math.round(cumPrincipal), cumInterest: Math.round(cumInterest) });
  }
  return { emi, totalPayment: emi * n, totalInterest: emi * n - principal, rows };
}

/** SSF Old Age Pension calculation
 *  Formula: monthlyPension = salary × serviceYears × 1.33%
 *  Corpus: SSF 31% total contribution (11% employee + 20% employer) compounded at 8.5%
 */
export interface SSFPensionResult {
  corpus: number;
  monthlyPension: number;
  monthlyContrib: number;
  rows: { age: number; corpus: number }[];
}
export function calcSSFPension(salary: number, currentAge: number, retirementAge: number): SSFPensionResult {
  const years = Math.max(0, retirementAge - currentAge);
  const monthlyContrib = Math.round(salary * 0.31);
  const r = 0.085 / 12;
  const n = years * 12;
  const corpus = n > 0 ? monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) : 0;
  const monthlyPension = Math.round(salary * years * 0.0133);
  const rows = [];
  let fund = 0;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) fund = fund * (1 + r) + monthlyContrib;
    rows.push({ age: currentAge + y, corpus: Math.round(fund) });
  }
  return { corpus: Math.round(corpus), monthlyPension, monthlyContrib, rows };
}

/** Term life insurance premium rate by age bracket (annual rate per NPR 1 of sum assured) */
export function termPremiumRate(age: number): number {
  if (age < 25) return 0.0030;
  if (age < 30) return 0.0035;
  if (age < 35) return 0.0045;
  if (age < 40) return 0.0060;
  if (age < 45) return 0.0080;
  if (age < 50) return 0.0110;
  return 0.0155;
}

/** Lump sum future value: P × (1 + r)^n */
export function futureValue(principal: number, annualRate: number, years: number): number {
  return principal * Math.pow(1 + annualRate / 100, years);
}
