export interface SdgRef {
  goal: number;
  name: string;
}

export interface IndicatorRef {
  dcid: string;
  name: string;
  sdg_indicator?: string | null;
}

export interface ReportClaim {
  claim_id: string;
  title: string;
  geographic_scope: string;
  country_dcid?: string | null;
  m49_code?: string | null;
  target_outcome_indicator: string;
  sdgs: SdgRef[];
  declared_indicators: IndicatorRef[];
  declared_sources: string[];
  analysis_level: string;
  summary: string;
}

export interface TwinSummary {
  id: string;
  title: string;
  url: string;
  country_name: string;
  sdgs: SdgRef[];
  indicator_count: number;
}

export interface TwinMatch {
  id: string;
  title: string;
  url: string;
  country_name: string;
  similarity_score: number;
  matched_sdgs: number[];
  matched_indicators: string[];
  omitted_indicators: IndicatorRef[];
}

export interface ScoreDetail {
  score: number;
  explanation: string;
}

export interface SuitabilityBadge {
  label: string;
  severity: string;
  detail: string;
}

export interface ObservationPoint {
  dcid: string;
  name: string;
  value: number | null;
  date: string | null;
  source: string;
}

export interface EvaluationLabel {
  report_title: string;
  headline: string;
  overall_score: number;
  indicator_source_variance: ScoreDetail;
  indicator_correlation: ScoreDetail;
  indicator_comprehensiveness: ScoreDetail;
  missing_source_recommendations: string[];
  related_initiatives: TwinMatch[];
  badges: SuitabilityBadge[];
  observations: ObservationPoint[];
  claim: ReportClaim;
}

export interface EvaluateResponse {
  label: EvaluationLabel;
}

export interface AnalyzeResponse {
  claim: ReportClaim;
  extraction_method: string;
  text_preview: string;
  label: EvaluationLabel;
}

export interface ExtractResponse {
  claim: ReportClaim;
  extraction_method: string;
  text_preview: string;
}
