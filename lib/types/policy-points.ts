export interface PolicyPoint {
  id:           string;
  parentDocId:  string;
  ownerId:      string;
  pointNumber:  number;
  title:        string;        // short Nepali title
  simpleSummary: string;       // 2-3 sentences, simple Nepali
  youthImpact:  string;        // 1-2 sentences for 18-35 yr olds
  keyFact:      string;        // one specific number/stat from this point
  sectors:      string[];
  publishToJanta: boolean;
  parentDocTitle: string;
  createdAt:    string;
}
