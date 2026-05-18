export interface RecommendationClick {
  id:          string;
  schemeName:  string;          // e.g. "EPF", "SSF", "CIT"
  schemeOrg:   string;          // e.g. "EPF", "SSF"
  category:    string;          // "investment" | "loan" | "insurance" | "pension"
  targetUrl:   string;          // the portal URL clicked
  sessionId:   string;          // anonymous session (no auth required)
  timestamp:   string;          // ISO
}

export interface AudienceLead {
  id:        string;
  email:     string;
  source:    string;            // page slug or form identifier
  createdAt: string;            // ISO
}
