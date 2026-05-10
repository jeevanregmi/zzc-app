export type SchemeCategory = "Investment" | "Loan" | "Insurance" | "Pension";
export type Org = "EPF" | "CIT" | "SSF" | "NEPSE" | "Beema";
export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";
export type Liquidity = "Low" | "Medium" | "High";

export interface SSFSectors {
  formal: {
    nepali: string;
    employeeRate: number;   // 11%
    employerRate: number;   // 20%
    totalRate: number;      // 31%
    mandatory: boolean;
  };
  informal: {
    nepali: string;
    selfRate: number;       // 10.37% — worker pays full amount
    totalRate: number;      // 10.37%
    mandatory: boolean;
  };
  foreignEmployment: {
    nepali: string;
    socialInsuranceRate: number;  // 7.48%
    personalFundRate: number;     // 13.85%
    totalRate: number;            // 21.33%
    advanceDiscount: number;      // 10% discount on advance withdrawal
    mandatory: boolean;
    description: string;
  };
  selfEmployment: {
    nepali: string;
    voluntary: true;
    totalRate: number | null;     // no fixed rate
    description: string;
  };
}

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
  ssfSectors?: SSFSectors;
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
    summary: "CIT's flagship open-ended unit trust scheme regulated by SEBON. Individual investors earn 5% p.a.; corporate investors earn 3.5% p.a. Buy and redeem units at NAV price anytime. CIT provides buyback facility at its own premises. Open to resident and non-resident Nepali citizens including diaspora. Pilot remittance channel from South Korea via Sunrise Bank.",
    nepaliSummary: "CIT को SEBON नियमित खुला म्युचुअल फण्ड। व्यक्तिगत लगानीकर्ताले ५% र संस्थागत लगानीकर्ताले ३.५% प्रतिफल पाउँछन्। NAV मूल्यमा जुनसुकै बेला एकाइ किन्न र बेच्न सकिन्छ। CIT आफ्नै परिसरमा बायब्याक सुविधा दिन्छ। विदेशमा रहेका नेपाली (दक्षिण कोरियाबाट Sunrise Bank मार्फत) पनि लगानी गर्न सक्छन्।",
    interestRate: null,
    annualReturn: 5,
    riskLevel: "Moderate Risk",
    liquidity: "High",
    benefits: [
      "Individual investor rate: 5.0% p.a.",
      "Corporate investor rate: 3.5% p.a.",
      "Open-ended — buy/sell units at NAV anytime",
      "Buyback facility at CIT premises",
      "Open to diaspora Nepalis (incl. South Korea remittance channel)",
      "SEBON regulated — transparent unit trust structure",
      "Can pledge units for Home (7%), Personal (7.25%), Education (7%) loans",
    ],
    eligibility: [
      "Any Nepali citizen — resident or non-resident",
      "Minimum investment at current NAV price",
      "Valid citizenship certificate or passport",
      "KYC completed with CIT",
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
    compareTags: ["mutual-fund", "investment", "open-ended", "NAV", "liquidity", "diaspora", "SEBON"],
  },

  {
    id: "cit-esgrs",
    title: "CIT Employee Savings Growth Retirement Scheme (ESGRS / KBB)",
    titleNepali: "कर्मचारी बचतबृद्धि अवकाश कोष (KBB)",
    organization: "CIT",
    category: "Investment",
    subcategory: "Retirement Savings",
    summary: "Voluntary defined-contributory individual account retirement scheme managed by CIT (NLK). Monthly salary deductions deposited via commercial banks. Current interest rate: 3.75% p.a. 90% loan facility available at 5.25% against accumulated balance. Tax deduction: up to contribution amount or 33% of total remuneration.",
    nepaliSummary: "CIT (NLK) द्वारा सञ्चालित स्वैच्छिक, परिभाषित अंशदान, व्यक्तिगत खाता आधारित अवकाश योजना। वाणिज्य बैंक मार्फत मासिक तलब कट्टी। हालको ब्याज दर: ३.७५%। जम्मा मौज्दातको ९०% सम्म ५.२५% मा सापटी सुविधा। योगदान वा कुल पारिश्रमिकको ३३% सम्म कर छुट।",
    interestRate: 3.75,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "3.75% p.a. interest on accumulated balance",
      "90% loan against balance at 5.25% interest",
      "Tax deduction: contribution or 33% of remuneration (whichever lower)",
      "Individual account — fully funded, no deficit risk",
      "Collected via commercial banks nationwide",
      "Voluntary participation",
    ],
    eligibility: [
      "Employees of organizations enrolled with CIT for ESGRS",
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
    loanLimit: "Up to 90% of accumulated ESGRS balance at 5.25% interest",
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["savings", "retirement", "tax-benefit", "voluntary", "individual-account", "KBB", "ESGRS"],
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
    summary: "SSF contributors can borrow up to Rs 1.5 crore (or 15 years' salary, whichever is lower) for house construction/purchase (5.85%) or land purchase (6%). Minimum 18 months contribution. Collateral: own/family property (min 2.5 aana in municipality, 4 aana rural). Management fee 0.15%; valuation fee Rs 5,000 (ex-VAT). Monthly instalment ≤ 60% of salary. First instalment within 6 months, full utilisation within 2 years.",
    nepaliSummary: "SSF योगदानकर्ताले घर निर्माण/खरिदमा ५.८५% र जग्गा खरिदमा ६% ब्याजमा रू. १,५०,००,००० (वा १५ वर्षको तलब, जुन कम) सम्म सापटी लिन सक्छन्। न्यूनतम १८ महिना नियमित योगदान। धितो: आफ्नो वा परिवारको सम्पत्ति (नपामा न्यूनतम २.५ आना, गाउँपालिकामा ४ आना)। व्यवस्थापन शुल्क ०.१५%; मूल्यांकन शुल्क रू. ५,०००। मासिक किस्ता तलबको ६०% भन्दा बढी हुन नहुने। पहिलो किस्ता ६ महिनाभित्र, पूर्ण उपयोग २ वर्षभित्र।",
    interestRate: 5.85,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "5.85% interest for house construction/purchase",
      "6% interest for land purchase",
      "Max Rs 1,50,00,000 or 15 years salary (lower applies)",
      "Covers: land, construction, apartment purchase, floor addition, maintenance",
      "Monthly instalment capped at 60% of salary",
      "Management fee: 0.15% of loan amount",
      "Valuation fee: Rs 5,000 (excluding VAT)",
      "Not blacklisted with SSF or any bank/FI",
    ],
    eligibility: [
      "Minimum 18 months regular SSF contribution",
      "Minimum 2 years of service remaining before retirement",
      "Not blacklisted with SSF or any bank/financial institution",
      "Collateral: own or immediate family property",
      "Municipality: minimum 2.5 aana; Rural municipality: minimum 4 aana",
      "Property must have minimum 4-metre road access",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Land ownership certificate (lalpurja)",
      "Land survey map (napi naksha)",
      "Construction plan or sale agreement",
      "SSF account statement",
      "Employer recommendation letter",
      "Property valuation report",
      "No-objection letter if family property used as collateral",
    ],
    loanLimit: "Rs 1,50,00,000 or 15 years' salary (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "home-loan", "housing", "land", "construction", "apartment", "low-interest", "ssf"],
  },

  {
    id: "ssf-education-loan",
    title: "SSF Education Loan",
    titleNepali: "SSF शैक्षिक सापटी",
    organization: "SSF",
    category: "Loan",
    subcategory: "Education Loan",
    summary: "Borrow up to Rs 35 lakhs (or 15 years' salary or actual cost, whichever is lower) for higher education of self, spouse, or children at institutions inside or outside Nepal. Minimum 36 months contribution. Collateral: own property with minimum 4-metre road access. For foreign study: NOC, visa, and offer letter required.",
    nepaliSummary: "आफ्नो, पति/पत्नी वा सन्तानको स्वदेश वा विदेशमा उच्च शिक्षाको लागि रू. ३५ लाख (वा १५ वर्षको तलब वा वास्तविक खर्च, जुन कम) सम्म सापटी। न्यूनतम ३६ महिना नियमित योगदान। धितो: आफ्नो सम्पत्ति, न्यूनतम ४ मिटर सडक पहुँच। विदेशका लागि: NOC, भिसा र अफर लेटर चाहिन्छ।",
    interestRate: 8,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Max Rs 35 lakhs or 15 years' salary or actual cost (lowest applies)",
      "Covers self, spouse, and dependent children",
      "Valid for institutions inside and outside Nepal",
      "Minimum 36 months contribution required",
      "Minimum 2 years service remaining before retirement",
      "Not blacklisted with SSF or any bank/FI",
    ],
    eligibility: [
      "Minimum 36 months regular SSF contribution",
      "Minimum 2 years of service remaining before retirement",
      "Not blacklisted with SSF or any bank/financial institution",
      "Collateral: own property with minimum 4-metre road access",
      "Borrower must be self, spouse, or dependent child",
    ],
    documents: [
      "Loan application form",
      "Citizenship certificate",
      "Admission or enrollment letter",
      "Fee structure from institution",
      "SEE / +2 marksheet (for student)",
      "SSF account statement",
      "Relationship proof (for spouse or child)",
      "Employer recommendation letter",
      "NOC from government (foreign study)",
      "Visa and offer letter (foreign study)",
    ],
    loanLimit: "Rs 35,00,000 or 15 years' salary or actual cost (whichever is lower)",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "education", "study", "university", "foreign-study", "children", "ssf"],
  },

  {
    id: "ssf-special-loan",
    title: "SSF Special Loan",
    titleNepali: "SSF विशेष सापटी",
    organization: "SSF",
    category: "Loan",
    subcategory: "Personal Loan",
    summary: "Borrow up to 80% of accumulated retirement amount with minimum 36 months contribution. Applied through SSF App (Loan Request). Interest paid by end of Ashadh (fiscal year end); principal repayment flexible. Repay via SSF App using eSewa, Khalti, or Connect IPS. Can re-borrow from next day after full repayment. KYC must be updated.",
    nepaliSummary: "न्यूनतम ३६ महिना योगदान भएका SSF सदस्यले संचित अवकाश रकमको ८०% सम्म सापटी लिन सक्छन्। SSF App को Loan Request बाट आवेदन। ब्याज प्रत्येक असार अन्त्यसम्म तिर्नुपर्ने, साँवा लचिलो। eSewa, Khalti वा Connect IPS मार्फत SSF App बाट भुक्तानी। पूर्ण भुक्तान गरेको भोलिपल्टैबाट पुनः सापटी लिन सकिन्छ। KYC अद्यावधिक हुनुपर्छ।",
    interestRate: null,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Up to 80% of accumulated retirement amount",
      "Apply via SSF App — Loan Request option",
      "Interest due by end of Ashadh (fiscal year end)",
      "Flexible principal repayment schedule",
      "Repay via eSewa, Khalti, or Connect IPS through SSF App",
      "Re-borrow from next day after full repayment",
      "No external collateral required",
    ],
    eligibility: [
      "Minimum 36 months regular SSF contribution",
      "Minimum 2 years of service remaining before retirement",
      "KYC updated in SSF system",
      "Not blacklisted with SSF or any bank/financial institution",
    ],
    documents: [
      "Application via SSF App (digital — no physical form needed)",
      "Citizenship certificate (for KYC)",
      "Updated KYC at SSF",
    ],
    loanLimit: "Up to 80% of accumulated SSF retirement amount",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: false,
    calculatorEnabled: true,
    compareTags: ["loan", "personal-loan", "ssf-app", "digital", "esewa", "khalti", "flexible", "ssf"],
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
      "Active SSF contributor at time of death (any sector)",
      "Formal sector: covered from first contribution",
      "Informal / foreign employment / self-employment contributors also eligible",
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
      "Active SSF contributor at time of accident (any sector)",
      "Formal sector (31% contribution): full workplace + non-workplace coverage",
      "Informal sector (10.37%): covered after enrollment",
      "Foreign employment workers: covered under social insurance portion (7.48%)",
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
      "Active SSF contributor (any sector)",
      "Formal sector (31% contribution): full OPD + IPD benefit",
      "Informal sector (10.37%): covered after enrollment",
      "Foreign employment: covered under social insurance portion (7.48%)",
      "Self-employment contributors: eligible once voluntarily enrolled",
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
    titleNepali: "राष्ट्रसेवक कर्मचारी सावधिक जीवन बीमा कोष",
    organization: "CIT",
    category: "Insurance",
    subcategory: "Term Life Insurance",
    summary: "Mandatory term life insurance managed by CIT for Nepal's government employees, teachers, army, and police. Employee Rs 400/month + Government Rs 400/month = Rs 800 total. Rs 2,00,000 sum insured for 20 years. Established under Civil Service Act 2049 (Section 40.a). Accumulated fund earns 2.75% p.a. Covers: civil servants, community school teachers, Nepal Army, Nepal Police, Armed Police Force.",
    nepaliSummary: "नेपालका सरकारी कर्मचारी, शिक्षक, सेना र प्रहरीका लागि CIT द्वारा सञ्चालित अनिवार्य सावधिक जीवन बीमा। कर्मचारी रू. ४०० + सरकार रू. ४०० = रू. ८०० मासिक। रू. २,००,०००को बीमांक, २० वर्ष। जम्मा कोषमा २.७५% ब्याज। सिभिल सर्भिस ऐन २०४९, दफा ४०.क अन्तर्गत।",
    interestRate: 2.75,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Rs 2,00,000 sum insured for 20 years",
      "Employee Rs 400 + Government Rs 400 = Rs 800/month total",
      "Accumulated fund earns 2.75% p.a.",
      "Mandatory — automatic enrollment on joining service",
      "Covers: civil servants, teachers, Nepal Army, Police, Armed Police",
    ],
    eligibility: [
      "All permanent government civil servants",
      "Community school teachers",
      "Nepal Army, Nepal Police, Armed Police Force",
      "Automatic mandatory enrollment on joining service",
      "Does NOT cover NARC employees (separate NARC Insurance scheme)",
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
    compareTags: ["insurance", "term-life", "government-employees", "mandatory", "teachers", "army", "civil-service"],
  },

  {
    id: "cit-narc-insurance",
    title: "CIT NARC Term Life Insurance",
    titleNepali: "CIT नार्क सावधिक जीवन बीमा कोष",
    organization: "CIT",
    category: "Insurance",
    subcategory: "Term Life Insurance",
    summary: "Term life insurance fund managed by CIT exclusively for permanent employees of Nepal Agricultural Research Council (NARC). Employee Rs 400/month + NARC Rs 400/month = Rs 800 total. Accumulated fund earns 3.75% p.a. — higher than the civil service insurance fund rate. 80% loan available at 5.25% against accumulated balance. Governed by NARC Insurance Fund Operational Procedure 2067.",
    nepaliSummary: "नेपाल कृषि अनुसन्धान परिषद् (NARC) का स्थायी कर्मचारीहरूका लागि CIT द्वारा सञ्चालित सावधिक जीवन बीमा कोष। कर्मचारी रू. ४०० + NARC रू. ४०० = रू. ८०० मासिक। जम्मा कोषमा ३.७५% ब्याज। जम्मा रकमको ८०% सम्म ५.२५% मा सापटी सुविधा। NARC बीमा कोष सञ्चालन विधि २०६७ अन्तर्गत।",
    interestRate: 3.75,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "3.75% p.a. on accumulated fund (higher than civil service rate)",
      "Employee Rs 400 + NARC Rs 400 = Rs 800/month total",
      "80% loan against accumulated fund at 5.25% interest",
      "Mandatory — automatic for all permanent NARC employees",
      "Governed by NARC Insurance Fund Operational Procedure 2067",
    ],
    eligibility: [
      "Permanent employees of Nepal Agricultural Research Council (NARC) only",
      "Automatic mandatory enrollment",
    ],
    documents: [
      "NARC appointment letter",
      "Citizenship certificate",
      "Employee ID",
      "Nominee declaration form",
      "Bank account details",
    ],
    loanLimit: "Up to 80% of accumulated NARC insurance fund at 5.25% interest",
    retirementSupport: false,
    medicalCoverage: false,
    hasInsurance: true,
    gratuity: false,
    calculatorEnabled: false,
    compareTags: ["insurance", "term-life", "NARC", "agriculture", "mandatory", "CIT"],
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
    summary: "CIT unit holders pledge their Citizens Unit Scheme units as collateral for a home loan at 7.0% — well below standard commercial bank rates. No external property pledge needed initially. Units continue earning 5% returns during the loan period.",
    nepaliSummary: "CIT नागरिक एकांक योजनाका एकाइहरू धितो राखेर ७% ब्याजमा गृह ऋण लिन सकिन्छ — सामान्य बैंक दरभन्दा कम। बाह्य सम्पत्ति धितो नचाहिने। ऋण अवधिमा एकाइले ५% प्रतिफल दिइरहन्छ।",
    interestRate: 7,
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
    summary: "Pledge CIT Citizens Unit Scheme units as collateral for a personal loan at 7.25% through CIT's partner banks. Any personal purpose. Faster processing than unsecured personal loans. Units continue earning 5% during loan period.",
    nepaliSummary: "CIT नागरिक एकांक योजनाका एकाइहरू धितो राखेर ७.२५% मा व्यक्तिगत ऋण लिन सकिन्छ। कुनै पनि व्यक्तिगत उद्देश्यका लागि। असुरक्षित ऋणभन्दा छिटो प्रक्रिया। ऋण अवधिमा एकाइले ५% प्रतिफल दिइरहन्छ।",
    interestRate: 7.25,
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
    summary: "Pledge CIT Citizens Unit Scheme units as collateral for higher education financing at 7.0%. Covers tuition, living, and study materials at recognized institutions inside and outside Nepal. Units continue earning 5% returns during loan.",
    nepaliSummary: "उच्च शिक्षाको वित्तपोषणको लागि CIT नागरिक एकांक योजनाका एकाइहरू धितो राखेर ७% ब्याजमा ऋण लिन सकिन्छ। नेपाल वा विदेशका मान्यताप्राप्त संस्थाहरूमा ट्युशन, बसोबास र अध्ययन सामग्री। ऋण अवधिमा एकाइले ५% प्रतिफल दिइरहन्छ।",
    interestRate: 7,
    riskLevel: "Low Risk",
    liquidity: "High",
    benefits: [
      "Education financing via unit pledge at 7% interest",
      "Covers foreign universities",
      "Grace period during study",
      "Units earn 5% returns during loan period",
      "No external property collateral needed",
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
    title: "CIT Investors Retirement Fund (Institutional)",
    titleNepali: "CIT लगानीकर्ता अवकाश कोष योजना",
    organization: "CIT",
    category: "Investment",
    subcategory: "Institutional Retirement Fund",
    summary: "CIT's institutional retirement fund scheme (लगानीकर्ता अवकाश कोष योजना) for organizations to fully fund long-term employee liabilities — gratuity, pension, and welfare obligations — outside the organization's own accounts. Two models: defined-benefit retirement scheme, or investment trust with CIT portfolio management. Fund earns 2.75% p.a. 80% loan facility available at 4.25%.",
    nepaliSummary: "संस्थाहरूले कर्मचारीको दीर्घकालीन दायित्व (उपदान, पेन्सन, कल्याण) पूर्ण रूपमा CIT मा जम्मा गर्न सक्ने संस्थागत अवकाश कोष योजना। दुई मोडेल: परिभाषित-लाभ अवकाश योजना वा लगानी ट्रस्ट। कोषले २.७५% प्रतिफल दिन्छ। ८०% धितोमा ४.२५% मा सापटी सुविधा।",
    interestRate: 2.75,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "2.75% p.a. on accumulated institutional fund",
      "80% loan against fund at 4.25% interest",
      "Fully funds gratuity and pension liabilities off-balance-sheet",
      "CIT professional fund management",
      "Two models: retirement scheme or investment trust",
      "Relieves organizations from heavy future liabilities",
    ],
    eligibility: [
      "Organizations (companies, NGOs, cooperatives) registered with CIT",
      "Formal agreement with CIT required",
      "Employees of enrolled organizations",
    ],
    documents: [
      "Institutional enrollment form",
      "Organization registration certificate",
      "Board resolution authorizing enrollment",
      "Organization enrollment agreement with CIT",
      "Employee list and salary details",
      "PAN/VAT registration",
    ],
    loanLimit: "Up to 80% of accumulated fund at 4.25% interest",
    retirementSupport: true,
    medicalCoverage: false,
    hasInsurance: false,
    gratuity: true,
    calculatorEnabled: false,
    compareTags: ["institutional", "gratuity", "pension", "CIT", "organizational", "liability-funding"],
  },

  {
    id: "ssf-old-age-pension",
    title: "SSF Old Age Security Pension",
    titleNepali: "SSF बृद्धाश्रम सुरक्षा पेन्सन",
    organization: "SSF",
    category: "Pension",
    subcategory: "Retirement",
    summary: "SSF's core retirement scheme covering 4 sectors. Formal sector: Employee 11% + Employer 20% = 31% total. Informal sector: 10.37% self-contribution. Foreign employment: 7.48% social insurance + 13.85% personal fund = 21.33% (10% advance discount). Self-employment: voluntary. Monthly pension from age 60. Formula: salary × years × 1.33% / month. Lump sum if < 15 years.",
    nepaliSummary: "SSF को मुख्य अवकाश पेन्सन योजना — ४ क्षेत्रका लागि। औपचारिक क्षेत्र: ११%+२०%=३१%। अनौपचारिक: १०.३७% स्वयम्। वैदेशिक रोजगार: ७.४८% सामाजिक बीमा + १३.८५% व्यक्तिगत कोष = २१.३३% (१०% अग्रिम छुट)। स्वरोजगार: ऐच्छिक। ६० वर्षमा मासिक पेन्सन। सूत्र: तलब × सेवा वर्ष × १.३३%। १५ वर्षभन्दा कम भए एकमुष्ट।",
    interestRate: null,
    annualReturn: 8.5,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "Formal sector: 11% employee + 20% employer = 31% total",
      "Informal sector: 10.37% self-contribution",
      "Foreign employment: 7.48% social insurance + 13.85% personal fund",
      "Foreign employment: 10% advance discount on personal fund withdrawal",
      "Self-employment: voluntary participation",
      "Monthly pension for life from age 60",
      "Individual account — your money stays yours",
      "Pension formula: salary × years × 1.33% / month",
      "Lump sum payout if < 15 years contribution",
    ],
    eligibility: [
      "Formal sector: all employees of SSF-registered employers (mandatory)",
      "Informal sector: workers in agriculture, construction, small trade (10.37% self)",
      "Foreign employment: Nepali migrant workers via FEPB/embassy (21.33% total)",
      "Self-employment: any Nepali citizen (voluntary, no fixed rate)",
      "Minimum 15 years of contribution for monthly pension",
      "Pension age: 60 years",
      "Lump sum available if less than 15 years contributed",
    ],
    documents: [
      "SSF registration form",
      "Citizenship certificate",
      "Employer registration proof (formal sector)",
      "Foreign employment permit / labour agreement (foreign workers)",
      "Recent payslip or income proof",
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
    ssfSectors: {
      formal: {
        nepali: "औपचारिक क्षेत्र",
        employeeRate: 11,
        employerRate: 20,
        totalRate: 31,
        mandatory: true,
      },
      informal: {
        nepali: "अनौपचारिक क्षेत्र",
        selfRate: 10.37,
        totalRate: 10.37,
        mandatory: true,
      },
      foreignEmployment: {
        nepali: "वैदेशिक रोजगार",
        socialInsuranceRate: 7.48,
        personalFundRate: 13.85,
        totalRate: 21.33,
        advanceDiscount: 10,
        mandatory: true,
        description: "Social insurance 7.48% + personal savings fund 13.85%. Workers may withdraw personal fund in advance with a 10% discount deducted.",
      },
      selfEmployment: {
        nepali: "स्वरोजगार",
        voluntary: true,
        totalRate: null,
        description: "Voluntary enrollment. Contributor sets own contribution amount. No employer match. Full social security benefits still apply once enrolled.",
      },
    },
    compareTags: ["pension", "retirement", "old-age", "individual-account", "mandatory", "employer-contribution", "informal-sector", "foreign-employment", "self-employment"],
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
    summary: "CIT's voluntary pension scheme open to any Nepali citizen — employed or self-employed. Current rate: 4.50% p.a. Minimum NPR 500/month; also accepts quarterly, half-yearly, or yearly payments, and lump sum. Pension starts at age 60 after minimum 15 years of contribution. On contributor's death, pension transfers to spouse; remaining fund goes to legal nominees.",
    nepaliSummary: "CIT को स्वैच्छिक पेन्सन योजना — रोजगार वा स्वरोजगार जो कोहीका लागि खुला। हालको दर: ४.५०%। न्यूनतम ५०० रुपैयाँ/महिना; त्रैमासिक, अर्धवार्षिक, वार्षिक वा एकमुष्ट जम्मा गर्न पनि सकिन्छ। ६० वर्षको उमेर र न्यूनतम १५ वर्ष योगदानपछि पेन्सन। मृत्युपछि पति/पत्नीलाई; बाँकी रकम कानूनी उत्तराधिकारीलाई।",
    interestRate: null,
    annualReturn: 4.5,
    riskLevel: "Low Risk",
    liquidity: "Low",
    benefits: [
      "4.50% p.a. interest on accumulated fund",
      "Open to all Nepali citizens — employed or self-employed",
      "Minimum NPR 500/month (or quarterly/half-yearly/yearly/lump sum)",
      "Lifetime pension from age 60 after 15 years contribution",
      "Pension transfers to spouse on contributor's death",
      "Remaining fund goes to legal nominees",
    ],
    eligibility: [
      "Any Nepali citizen — employed or self-employed",
      "Age: minimum enrollment before sufficient contribution years",
      "Minimum NPR 500/month (or equivalent lump sum)",
      "Minimum 15 years of contribution to qualify for pension",
      "Pension commencement age: 60 years",
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

export const SSF_SECTOR_RATES: SSFSectors = {
  formal: {
    nepali: "औपचारिक क्षेत्र",
    employeeRate: 11,
    employerRate: 20,
    totalRate: 31,
    mandatory: true,
  },
  informal: {
    nepali: "अनौपचारिक क्षेत्र",
    selfRate: 10.37,
    totalRate: 10.37,
    mandatory: true,
  },
  foreignEmployment: {
    nepali: "वैदेशिक रोजगार",
    socialInsuranceRate: 7.48,
    personalFundRate: 13.85,
    totalRate: 21.33,
    advanceDiscount: 10,
    mandatory: true,
    description: "Social insurance 7.48% + personal savings fund 13.85%. Workers may withdraw personal fund in advance with a 10% discount deducted.",
  },
  selfEmployment: {
    nepali: "स्वरोजगार",
    voluntary: true,
    totalRate: null,
    description: "Voluntary enrollment. Contributor sets own contribution amount. No employer match. Full social security benefits still apply once enrolled.",
  },
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
