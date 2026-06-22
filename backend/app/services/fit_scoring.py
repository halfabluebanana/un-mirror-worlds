"""Geographic resolution fit and reference period fit scoring."""

from datetime import date
from typing import Optional

from app.models import IndicatorRef, ObservationPoint, ReportClaim, ScoreDetail
from app.services.metadata import fetch_sdg_metadata

LEVEL_RANK = {
    "national": 0,
    "subnational": 1,
    "municipal": 2,
    "point": 3,
    "unknown": 0,
}

LEVEL_LABELS = {
    0: "national",
    1: "subnational",
    2: "municipal",
    3: "point/GIS",
}


def _normalize_analysis_level(level: str) -> str:
    normalized = level.lower().strip()
    if normalized in LEVEL_RANK:
        return normalized
    return "national"


def _entity_dcid_level(dcid: Optional[str]) -> Optional[str]:
    if not dcid:
        return None
    lowered = dcid.lower()
    if lowered.startswith("country/"):
        return "national"
    if "adminarea" in lowered or lowered.startswith("geoId/"):
        return "subnational"
    return None


def _metadata_spatial_level(metadata: dict) -> Optional[str]:
    limitations = metadata.get("comments_limitations", "").lower()
    subnational = metadata.get(
        "reliability_coverage_comparability_subnational_compute", ""
    ).lower()

    if subnational:
        if any(
            phrase in subnational[:200]
            for phrase in ("not available", "not disaggregated", "national level only", "no subnational")
        ):
            return "national"
        if any(phrase in subnational for phrase in ("subnational", "administrative", "regional")):
            return "subnational"

    if limitations and any(
        phrase in limitations
        for phrase in (
            "national level only",
            "nationally representative",
            "not available at subnational",
            "not disaggregated below national",
        )
    ):
        return "national"

    return None


def _infer_indicator_data_level(
    indicator: IndicatorRef,
    claim: ReportClaim,
    observation_entity_dcid: Optional[str],
) -> tuple[str, str]:
    provenance = claim.indicator_provenance.get(indicator.dcid)
    if provenance and provenance.spatial_resolution != "unknown":
        return provenance.spatial_resolution, "declared provenance"

    entity_level = _entity_dcid_level(observation_entity_dcid or claim.country_dcid)
    if entity_level:
        return entity_level, "observation entity"

    if indicator.sdg_indicator:
        metadata = fetch_sdg_metadata(indicator.sdg_indicator)
        meta_level = _metadata_spatial_level(metadata)
        if meta_level:
            return meta_level, "SDG custodian metadata"

    if indicator.dcid.startswith("undata/sdg/"):
        return "national", "default SDG country aggregate"

    return "unknown", "insufficient metadata"


def _score_from_gap(gap: int, *, kind: str) -> float:
    if gap <= 0:
        return 95.0
    if gap == 1:
        return 62.0
    if gap == 2:
        return 38.0
    return 20.0


def geographic_resolution_fit_score(
    claim: ReportClaim,
    observation_entity_dcid: Optional[str],
) -> ScoreDetail:
    claim_level_name = _normalize_analysis_level(claim.analysis_level)
    claim_rank = LEVEL_RANK[claim_level_name]

    if claim_rank == 0:
        return ScoreDetail(
            score=95.0,
            explanation="Claim scope is national; country-level indicators are appropriate.",
        )

    gaps: list[tuple[str, int, str]] = []
    for indicator in claim.declared_indicators:
        data_level, source = _infer_indicator_data_level(
            indicator, claim, observation_entity_dcid
        )
        data_rank = LEVEL_RANK.get(data_level, 0)
        gap = claim_rank - data_rank
        if gap > 0:
            gaps.append((indicator.name, gap, source))

    if not gaps:
        return ScoreDetail(
            score=92.0,
            explanation=(
                f"Declared indicators appear to support {LEVEL_LABELS[claim_rank]} "
                f"analysis for this claim."
            ),
        )

    worst_gap = max(item[1] for item in gaps)
    score = _score_from_gap(worst_gap, kind="geographic")
    worst_name, _, worst_source = max(gaps, key=lambda item: item[1])
    explanation = (
        f"Claim requires {LEVEL_LABELS[claim_rank]} conclusions but "
        f"{worst_name} is resolved at {LEVEL_LABELS[claim_rank - worst_gap]} "
        f"resolution ({worst_source}). "
        f"{len(gaps)} indicator(s) may not support the stated geographic scope."
    )
    return ScoreDetail(score=score, explanation=explanation)


def _parse_observation_year(date_value: Optional[str]) -> Optional[int]:
    if not date_value:
        return None
    digits = "".join(char for char in date_value if char.isdigit())
    if len(digits) >= 4:
        return int(digits[:4])
    return None


def _indicator_data_year(
    indicator_dcid: str,
    claim: ReportClaim,
    observations_by_dcid: dict[str, ObservationPoint],
) -> Optional[int]:
    provenance = claim.indicator_provenance.get(indicator_dcid)
    if provenance:
        if provenance.reference_year_end:
            return provenance.reference_year_end
        if provenance.reference_year_start:
            return provenance.reference_year_start

    observation = observations_by_dcid.get(indicator_dcid)
    if observation:
        return _parse_observation_year(observation.date)

    return None


def _temporal_gap_score(years_behind: int) -> float:
    if years_behind <= 2:
        return 95.0
    if years_behind <= 5:
        return 72.0
    if years_behind <= 10:
        return 48.0
    return 25.0


def reference_period_fit_score(
    claim: ReportClaim,
    observations: list[ObservationPoint],
) -> ScoreDetail:
    target_year = claim.claim_reference_year
    if claim.intervention_end_year:
        target_year = target_year or claim.intervention_end_year
    if not target_year:
        target_year = date.today().year

    observations_by_dcid = {point.dcid: point for point in observations}
    gaps: list[tuple[str, int]] = []

    for indicator in claim.declared_indicators:
        data_year = _indicator_data_year(
            indicator.dcid, claim, observations_by_dcid
        )
        if data_year is None:
            continue
        years_behind = target_year - data_year
        if years_behind > 2:
            gaps.append((indicator.name, years_behind))

    if not gaps:
        years_with_data = [
            year
            for indicator in claim.declared_indicators
            if (year := _indicator_data_year(indicator.dcid, claim, observations_by_dcid))
            is not None
        ]
        if years_with_data:
            newest = max(years_with_data)
            return ScoreDetail(
                score=95.0,
                explanation=(
                    f"Underlying data (most recent: {newest}) is within 2 years of "
                    f"the claim reference period ({target_year})."
                ),
            )
        return ScoreDetail(
            score=75.0,
            explanation=(
                f"Reference period fit is inconclusive: no observation years found "
                f"to compare against claim year {target_year}."
            ),
        )

    worst_name, worst_gap = max(gaps, key=lambda item: item[1])
    score = _temporal_gap_score(worst_gap)
    explanation = (
        f"Claim targets {target_year} but {worst_name} relies on data from "
        f"{target_year - worst_gap} ({worst_gap} years behind). "
        f"{len(gaps)} indicator(s) exceed the 2-year currency threshold."
    )
    return ScoreDetail(score=score, explanation=explanation)
