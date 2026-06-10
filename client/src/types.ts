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
