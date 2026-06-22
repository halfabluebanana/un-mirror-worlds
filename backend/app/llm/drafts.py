from typing import Optional

from pydantic import BaseModel, Field

from app.models import SdgRef


class LlmIndicatorDraft(BaseModel):
    name: str
    dcid: Optional[str] = None
    sdg_indicator: Optional[str] = None
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
    summary: str = Field(
        description="Two to three sentences summarizing the empirical claim and methods",
    )
    methodological_notes: Optional[str] = Field(
        default=None,
        description="Key limitations or assumptions stated or implied in the source",
    )
