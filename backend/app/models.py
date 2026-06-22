from typing import Optional

from pydantic import BaseModel, Field


class SdgRef(BaseModel):
    goal: int
    name: str


class IndicatorRef(BaseModel):
    dcid: str
    name: str
    sdg_indicator: Optional[str] = None


class ReportClaim(BaseModel):
    claim_id: str = Field(..., examples=["CLM-001"])
    title: str
    geographic_scope: str
    country_dcid: Optional[str] = None
    m49_code: Optional[str] = None
    target_outcome_indicator: str
    sdgs: list[SdgRef]
    declared_indicators: list[IndicatorRef]
    declared_sources: list[str]
    analysis_level: str = "national"
    summary: str = ""


class TwinMatch(BaseModel):
    id: str
    title: str
    url: str
    country_name: str
    similarity_score: float
    matched_sdgs: list[int]
    matched_indicators: list[str]
    omitted_indicators: list[IndicatorRef]


class ScoreDetail(BaseModel):
    score: float
    explanation: str


class SuitabilityBadge(BaseModel):
    label: str
    severity: str
    detail: str


class ObservationPoint(BaseModel):
    dcid: str
    name: str
    value: Optional[float]
    date: Optional[str]
    source: str


class EvaluationLabel(BaseModel):
    report_title: str
    headline: str
    overall_score: float
    indicator_source_variance: ScoreDetail
    indicator_correlation: ScoreDetail
    indicator_comprehensiveness: ScoreDetail
    missing_source_recommendations: list[str]
    related_initiatives: list[TwinMatch]
    badges: list[SuitabilityBadge]
    observations: list[ObservationPoint]
    claim: ReportClaim


class EvaluateResponse(BaseModel):
    label: EvaluationLabel


class IngestRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    title: Optional[str] = None
    use_llm: Optional[bool] = None


class ExtractResponse(BaseModel):
    claim: ReportClaim
    extraction_method: str
    text_preview: str


class AnalyzeResponse(BaseModel):
    claim: ReportClaim
    extraction_method: str
    text_preview: str
    label: EvaluationLabel
