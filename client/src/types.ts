export type Category = 'pro' | 'pas' | 'det';

export interface SurveyResponse {
  id: number;
  score: number;
  comment: string;
  when: string;
  you: boolean;
}

export interface NpsSummary {
  responses: SurveyResponse[];
  nps: number;
  total: number;
  counts: { pro: number; pas: number; det: number };
}

export interface ReportQuote {
  score: number;
  comment: string;
  when: string;
  category: Category;
}

// Mirrors the server's computeDigest() output (server/src/digest.ts).
export interface ReportData {
  dateLabel: string;
  dateLong: string;
  total: number;
  nps: number;
  counts: { pro: number; pas: number; det: number };
  pct: { pro: number; pas: number; det: number };
  avg7: number | null;
  trend: number | null;
  detractors: ReportQuote[];
  topPromoter: ReportQuote | null;
}
