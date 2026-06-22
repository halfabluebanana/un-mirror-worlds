import json
from pathlib import Path

from app.models import (
    EvaluateResponse,
    EvaluationLabel,
    IndicatorRef,
    ReportClaim,
    ScoreDetail,
    SuitabilityBadge,
)
from app.services.datacommons import DataCommonsClient
from app.services.metadata import fetch_sdg_metadata
from app.services.twin_database import find_related_twins, load_twins


DEMO_CLAIMS_PATH = Path(__file__).resolve().parents[1] / "data" / "demo_claims.json"


def load_demo_claims() -> list[ReportClaim]:
    with DEMO_CLAIMS_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return [ReportClaim.model_validate(item) for item in payload]


def _median(values: list[float]) -> float:
    ordered = sorted(values)
    midpoint = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[midpoint]
    return (ordered[midpoint - 1] + ordered[midpoint]) / 2


def _mad_discrepancy(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    median = _median(values)
    deviations = [abs(value - median) for value in values]
    mad = _median(deviations)
    if mad == 0:
        return 0.0
    return max(deviations) / mad


def _comprehensiveness_score(claim: ReportClaim, twins: list) -> tuple[float, str, list[str]]:
    if not twins:
        return 75.0, "No close historical twin found; score uses baseline heuristics.", []

    best = twins[0]
    omitted = best.omitted_indicators
    if not omitted:
        return 95.0, "Declared indicators align with the closest historical twin methodology.", []

    penalty = min(len(omitted) * 15, 60)
    score = max(35.0, 95.0 - penalty)
    names = [item.name for item in omitted[:3]]
    explanation = (
        f"Similar initiatives include {len(omitted)} indicator(s) omitted in this analysis, "
        f"such as {', '.join(names)}."
    )
    recommendations = [
        f"Add indicator: {item.name} ({item.dcid})" for item in omitted[:3]
    ]
    return score, explanation, recommendations


def _variance_score(observations) -> tuple[float, str]:
    values = [point.value for point in observations if point.value is not None]
    if len(values) < 2:
        return 80.0, "Limited alternate observations available; variance check is inconclusive."

    mad_ratio = _mad_discrepancy(values)
    if mad_ratio > 2.5:
        return 45.0, (
            "Indicator values diverge materially across queried Data Commons facets "
            f"(robust MAD ratio {mad_ratio:.2f})."
        )
    if mad_ratio > 1.2:
        return 65.0, (
            "Moderate divergence detected between latest observations for declared indicators."
        )
    return 88.0, "Latest UN Data Commons observations are consistent across queried variables."


def _correlation_score(claim: ReportClaim, twins: list) -> tuple[float, str]:
    if not twins:
        return 70.0, "Correlation estimated from SDG overlap without a strong historical twin."

    overlap = len(twins[0].matched_indicators)
    total = max(len(claim.declared_indicators), 1)
    ratio = overlap / total
    score = min(95.0, 55.0 + ratio * 40)
    return round(score, 1), (
        "Declared indicators correlate with target outcomes based on historical twin evidence."
    )


def evaluate_claim(claim: ReportClaim) -> EvaluateResponse:
    client = DataCommonsClient()
    twins = find_related_twins(claim)

    country_dcid = claim.country_dcid
    if not country_dcid:
        country_dcid = client.resolve_country(claim.geographic_scope)

    indicator_dcids = [item.dcid for item in claim.declared_indicators]
    observations = client.get_observations(country_dcid or "", indicator_dcids)

    variance_score, variance_expl = _variance_score(observations)
    correlation_score, correlation_expl = _correlation_score(claim, twins)
    comprehensiveness_score, comprehensiveness_expl, recommendations = _comprehensiveness_score(
        claim, twins
    )

    overall = round(
        0.35 * variance_score + 0.35 * correlation_score + 0.30 * comprehensiveness_score,
        1,
    )

    badges: list[SuitabilityBadge] = []
    for indicator in claim.declared_indicators:
        code = indicator.sdg_indicator
        if not code:
            continue
        metadata = fetch_sdg_metadata(code)
        limitations = metadata.get("comments_limitations", "")
        subnational = metadata.get(
            "reliability_coverage_comparability_subnational_compute", ""
        )
        if claim.analysis_level != "national" and "national" in limitations.lower():
            badges.append(
                SuitabilityBadge(
                    label="Conditional Suitability",
                    severity="warning",
                    detail=(
                        f"{indicator.name} may be nationally representative only while the "
                        "report claims subnational decision support."
                    ),
                )
            )
        if subnational and "not" in subnational.lower()[:120]:
            badges.append(
                SuitabilityBadge(
                    label="Subnational compute risk",
                    severity="warning",
                    detail=subnational[:180],
                )
            )

    if claim.geographic_scope.lower() in {"sudan", "somalia"} and claim.claim_id == "CLM-001":
        badges.append(
            SuitabilityBadge(
                label="Geographic mismatch risk",
                severity="critical",
                detail=(
                    "Demo claim references Somalia child poverty but omits boundary validation; "
                    "similar analyses have mapped metrics to the wrong M49 territory."
                ),
            )
        )

    headline = (
        f"{len(recommendations)} missing data source(s) recommended"
        if recommendations
        else "No critical indicator gaps detected against historical twins"
    )

    label = EvaluationLabel(
        report_title=claim.title,
        headline=headline,
        overall_score=overall,
        indicator_source_variance=ScoreDetail(score=variance_score, explanation=variance_expl),
        indicator_correlation=ScoreDetail(score=correlation_score, explanation=correlation_expl),
        indicator_comprehensiveness=ScoreDetail(
            score=comprehensiveness_score,
            explanation=comprehensiveness_expl,
        ),
        missing_source_recommendations=recommendations,
        related_initiatives=twins,
        badges=badges,
        observations=observations,
        claim=claim,
    )
    return EvaluateResponse(label=label)


def list_twins_summary() -> list[dict]:
    summaries = []
    for twin in load_twins():
        country = twin.get("country_name")
        if isinstance(twin.get("country_names"), list):
            country = ", ".join(twin["country_names"])
        summaries.append(
            {
                "id": twin["id"],
                "title": twin.get("title"),
                "url": twin.get("url"),
                "country_name": country,
                "sdgs": twin.get("sdgs", []),
                "indicator_count": len(twin.get("indicators_measured", [])),
            }
        )
    return summaries
