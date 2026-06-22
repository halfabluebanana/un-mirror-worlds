import json
from pathlib import Path

from app.config import CASE_STUDIES_DIR
from app.models import IndicatorRef, ReportClaim, TwinMatch


def _indicator_dcids(case: dict) -> set[str]:
    measured = {i["dcid"] for i in case.get("indicators_measured", [])}
    targeted = {i["dcid"] for i in case.get("indicators_targeted", [])}
    return measured | targeted


def _sdg_goals(case: dict) -> set[int]:
    return {s["goal"] for s in case.get("sdgs", [])}


def load_twins() -> list[dict]:
    twins: list[dict] = []
    if not CASE_STUDIES_DIR.exists():
        return twins
    for path in sorted(CASE_STUDIES_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        data["id"] = path.stem
        twins.append(data)
    return twins


def find_related_twins(claim: ReportClaim, limit: int = 3) -> list[TwinMatch]:
    claim_sdgs = {s.goal for s in claim.sdgs}
    claim_indicators = {i.dcid for i in claim.declared_indicators}
    matches: list[TwinMatch] = []

    for twin in load_twins():
        twin_sdgs = _sdg_goals(twin)
        twin_indicators = _indicator_dcids(twin)

        sdg_overlap = claim_sdgs & twin_sdgs
        indicator_overlap = claim_indicators & twin_indicators

        if not sdg_overlap and not indicator_overlap:
            continue

        sdg_score = len(sdg_overlap) / max(len(claim_sdgs | twin_sdgs), 1)
        indicator_score = len(indicator_overlap) / max(
            len(claim_indicators | twin_indicators), 1
        )
        similarity = round(0.45 * sdg_score + 0.55 * indicator_score, 3)

        omitted = [
            IndicatorRef(
                dcid=item["dcid"],
                name=item["name"],
                sdg_indicator=item.get("sdg_indicator"),
            )
            for item in twin.get("indicators_measured", [])
            if item["dcid"] not in claim_indicators
        ]

        country = twin.get("country_name")
        if isinstance(twin.get("country_names"), list):
            country = ", ".join(twin["country_names"])

        matches.append(
            TwinMatch(
                id=twin["id"],
                title=twin.get("title", twin["id"]),
                url=twin.get("url", ""),
                country_name=country or "Unknown",
                similarity_score=similarity,
                matched_sdgs=sorted(sdg_overlap),
                matched_indicators=sorted(indicator_overlap),
                omitted_indicators=omitted[:6],
            )
        )

    matches.sort(key=lambda item: item.similarity_score, reverse=True)
    return matches[:limit]
