from typing import Optional

from pydantic import BaseModel, Field

from app.models import ClaimType, IndicatorProvenance, SdgRef, SpatialResolution


class LlmIndicatorDraft(BaseModel):
    name: str
    dcid: Optional[str] = None
    sdg_indicator: Optional[str] = None
    spatial_resolution: SpatialResolution = "unknown"
    reference_year_start: Optional[int] = None
    reference_year_end: Optional[int] = None
    evidence_quote: Optional[str] = Field(
        default=None,
        description="Short quote from the source supporting this indicator",
    )


class LlmClaimDraft(BaseModel):
    title: str
    geographic_scope: str
    m49_code: Optional[str] = None
    target_outcome_indicator: str
    sdgs: list[SdgRef]
    declared_indicators: list[LlmIndicatorDraft]
    declared_sources: list[str]
    analysis_level: str = Field(
        description="One of: national, subnational, municipal",
    )
    claim_reference_year: Optional[int] = Field(
        default=None,
        description="Year the report's conclusions or intervention target",
    )
    intervention_start_year: Optional[int] = None
    intervention_end_year: Optional[int] = None
    claim_type: ClaimType = Field(
        default="unknown",
        description=(
            "descriptive: report describes what is (correlations, mapping, status). "
            "predictive: report forecasts or models future outcomes. "
            "causal: report attributes change to an intervention or policy (uses language "
            "like 'reduced', 'caused', 'impact of', 'effect of', 'due to')."
        ),
    )
    summary: str = Field(
        description="Two to three sentences summarizing the empirical claim and methods",
    )
    methodological_notes: Optional[str] = Field(
        default=None,
        description="Key limitations or assumptions stated or implied in the source",
    )
