import hashlib
import logging
import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.llm import is_llm_configured
from app.models import IndicatorProvenance, IndicatorRef, ReportClaim, SdgRef
from app.services.datacommons import DataCommonsClient
from app.services.llm_claim_extractor import extract_claim_with_llm
from app.services.twin_database import load_twins

logger = logging.getLogger(__name__)

SDG_KEYWORDS = [
    (1, "No Poverty", ["poverty", "poor", "impoverished", "livelihood"]),
    (2, "Zero Hunger", ["hunger", "food insecurity", "undernourish", "malnutrition", "food security"]),
    (3, "Good Health and Well-being", ["health", "vaccin", "immuniz", "mortality", "disease", "cholera"]),
    (4, "Quality Education", ["education", "school", "literacy", "learning", "enrollment", "ecde", "early childhood"]),
    (5, "Gender Equality", ["gender", "women", "girls", "female-headed"]),
    (6, "Clean Water and Sanitation", ["water", "sanitation", "wash", "hygiene", "toilet"]),
    (8, "Decent Work and Economic Growth", ["employment", "economic", "gdp", "income"]),
    (9, "Industry, Innovation and Infrastructure", ["infrastructure", "internet", "broadband", "digital", "connectivity"]),
    (10, "Reduced Inequalities", ["inequal", "refugee", "displaced", "migration", "asylum"]),
    (11, "Sustainable Cities and Communities", ["urban", "shelter", "housing", "camp", "city"]),
    (13, "Climate Action", ["climate", "drought", "flood", "disaster", "volcan"]),
    (16, "Peace, Justice and Strong Institutions", ["conflict", "security", "peace", "justice"]),
    (17, "Partnerships for the Goals", ["data commons", "open data", "partnership", "sdmx"]),
]

INDICATOR_SEARCH_TERMS = [
    "food insecurity",
    "undernourishment",
    "vaccination coverage",
    "immunization",
    "poverty rate",
    "population density",
    "school attendance",
    "early childhood education",
    "drinking water",
    "sanitation",
    "refugee population",
    "displaced persons",
    "internet users",
    "child mortality",
    "stunting",
]

SOURCE_PATTERNS = [
    ("UN Data Commons", ["un data commons", "data commons", "datacommons"]),
    ("UNICEF", ["unicef"]),
    ("World Food Programme", ["world food programme", "wfp"]),
    ("World Bank", ["world bank"]),
    ("GRID3", ["grid3"]),
    ("OpenStreetMap", ["openstreetmap", "open street map"]),
    ("Google Open Buildings", ["open buildings", "google open buildings"]),
    ("Demographic and Health Survey", ["demographic and health survey", "dhs"]),
    ("GIS / geospatial layers", ["gis", "geospatial", "mapping"]),
]

COUNTRY_CANDIDATES = [
    "Afghanistan",
    "Cameroon",
    "Chad",
    "Côte d'Ivoire",
    "Guinea",
    "Mali",
    "Zambia",
    "Jordan",
    "Philippines",
    "Somalia",
    "Sudan",
    "Democratic Republic of the Congo",
    "State of Palestine",
    "Gaza",
]

OUTCOME_KEYWORDS = [
    ("Child poverty", ["child poverty", "children in poverty"]),
    ("Food insecurity reduction", ["food insecurity", "zero hunger", "food security"]),
    ("Immunization coverage", ["vaccin", "immuniz", "zero-dose"]),
    ("Early childhood development access", ["early childhood", "ecde", "pre-primary"]),
    ("Refugee shelter access", ["refugee", "shelter", "camp"]),
    ("Population displacement", ["displacement", "displaced", "mobility"]),
    ("Poverty mapping", ["poverty", "wealth index", "vulnerable areas"]),
    ("Digital inclusion", ["digital divide", "internet access", "connectivity"]),
]

ANALYSIS_LEVEL_KEYWORDS = [
    ("municipal", ["municipal", "city-level", "district-level", "local funding"]),
    ("subnational", ["subnational", "provincial", "regional", "district"]),
    ("national", ["national", "country-wide", "nationwide"]),
]


def _normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}".lower()


def _find_twin_by_url(url: str) -> Optional[dict]:
    normalized = _normalize_url(url)
    for twin in load_twins():
        twin_url = twin.get("url", "")
        if twin_url and _normalize_url(twin_url) == normalized:
            return twin
    return None


def fetch_url_text(url: str) -> tuple[str, str]:
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(
            url,
            headers={"User-Agent": "MirrorWorlds-ClaimExtractor/1.0"},
        )
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    article = soup.find("article")
    root = article if article else soup.body or soup
    text = root.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text, title


def _claim_id(prefix: str, seed: str) -> str:
    digest = hashlib.sha1(seed.encode("utf-8")).hexdigest()[:8].upper()
    return f"{prefix}-{digest}"


def _twin_to_claim(twin: dict, source_url: str) -> ReportClaim:
    country = twin.get("country_name", "Unknown")
    country_dcid = twin.get("country_dcid")
    if isinstance(twin.get("country_names"), list):
        country = ", ".join(twin["country_names"])
    if isinstance(country_dcid, list):
        country_dcid = country_dcid[0] if country_dcid else None

    indicators = []
    seen = set()
    for key in ("indicators_measured", "indicators_targeted"):
        for item in twin.get(key, []):
            dcid = item["dcid"]
            if dcid in seen:
                continue
            seen.add(dcid)
            indicators.append(
                IndicatorRef(
                    dcid=dcid,
                    name=item["name"],
                    sdg_indicator=item.get("sdg_indicator"),
                )
            )

    targeted = twin.get("indicators_targeted", [])
    target_outcome = targeted[0]["name"] if targeted else "SDG development outcome"

    return ReportClaim(
        claim_id=_claim_id("CLM-URL", source_url),
        title=twin.get("title", "Imported case study"),
        geographic_scope=country,
        country_dcid=country_dcid,
        target_outcome_indicator=target_outcome,
        sdgs=[SdgRef(**sdg) for sdg in twin.get("sdgs", [])],
        declared_indicators=indicators,
        declared_sources=_detect_sources(twin.get("summary", "")),
        analysis_level="subnational" if "geospatial" in twin.get("summary", "").lower() else "national",
        summary=(twin.get("summary") or "")[:600],
    )


def _detect_sources(text: str) -> list[str]:
    lowered = text.lower()
    sources = []
    for label, patterns in SOURCE_PATTERNS:
        if any(pattern in lowered for pattern in patterns):
            sources.append(label)
    return sources or ["Unspecified public datasets"]


def _detect_sdgs(text: str) -> list[SdgRef]:
    lowered = text.lower()
    sdgs = []
    for goal, name, patterns in SDG_KEYWORDS:
        if any(pattern in lowered for pattern in patterns):
            sdgs.append(SdgRef(goal=goal, name=name))
    if not sdgs:
        sdgs.append(SdgRef(goal=17, name="Partnerships for the Goals"))
    return sdgs


def _detect_outcome(text: str) -> str:
    lowered = text.lower()
    for label, patterns in OUTCOME_KEYWORDS:
        if any(pattern in lowered for pattern in patterns):
            return label
    return "SDG development outcome"


def _detect_analysis_level(text: str) -> str:
    lowered = text.lower()
    for level, patterns in ANALYSIS_LEVEL_KEYWORDS:
        if any(pattern in lowered for pattern in patterns):
            return level
    return "national"


def _detect_country(text: str, client: DataCommonsClient) -> tuple[str, Optional[str]]:
    lowered = text.lower()
    for country in sorted(COUNTRY_CANDIDATES, key=len, reverse=True):
        if re.search(rf"\b{re.escape(country.lower())}\b", lowered):
            dcid = client.resolve_country(country)
            return country, dcid
    return "Unknown", None


def _indicators_from_text(text: str, client: DataCommonsClient) -> list[IndicatorRef]:
    lowered = text.lower()
    indicators = []
    seen = set()

    for twin in load_twins():
        for key in ("indicators_measured", "indicators_targeted"):
            for item in twin.get(key, []):
                name = item["name"].lower()
                tokens = [token for token in re.split(r"[^a-z0-9]+", name) if len(token) > 5]
                if any(token in lowered for token in tokens[:4]):
                    dcid = item["dcid"]
                    if dcid not in seen:
                        seen.add(dcid)
                        indicators.append(
                            IndicatorRef(
                                dcid=dcid,
                                name=item["name"],
                                sdg_indicator=item.get("sdg_indicator"),
                            )
                        )

    for term in INDICATOR_SEARCH_TERMS:
        if term not in lowered:
            continue
        for candidate in client.search_indicators(term, limit=2):
            dcid = candidate.get("dcid")
            if not dcid or not dcid.startswith("undata/"):
                continue
            if dcid in seen:
                continue
            seen.add(dcid)
            indicators.append(
                IndicatorRef(
                    dcid=dcid,
                    name=candidate.get("name") or dcid.split("/")[-1],
                    sdg_indicator=None,
                )
            )

    return indicators[:8]


def _title_from_text(text: str, fallback: str) -> str:
    for line in text.splitlines():
        cleaned = line.strip()
        if 20 <= len(cleaned) <= 180:
            return cleaned
    return fallback or "Custom report claim"


def _extract_years(text: str) -> list[int]:
    current_year = 2026
    years = []
    for match in re.finditer(r"\b(19|20)\d{2}\b", text):
        year = int(match.group())
        if 1990 <= year <= current_year + 5:
            years.append(year)
    return years


def _infer_claim_reference_year(text: str) -> Optional[int]:
    lowered = text.lower()
    years = _extract_years(text)
    if not years:
        return None

    for year in sorted(years, reverse=True):
        context_start = max(0, lowered.find(str(year)) - 40)
        context = lowered[context_start : context_start + 80]
        if any(
            token in context
            for token in ("plan", "target", "by ", "202", "rollout", "strategy", "forecast")
        ):
            return year
    return max(years)


def _infer_indicator_provenance(
    text: str,
    indicators: list[IndicatorRef],
) -> dict[str, IndicatorProvenance]:
    lowered = text.lower()
    years = _extract_years(text)
    reference_year = years[0] if len(years) == 1 else (min(years) if years else None)

    gis_resolution = "point" if any(
        token in lowered for token in ("grid", "geospatial", "100m", "open buildings", "gis layer")
    ) else None
    subnational_resolution = "subnational" if any(
        token in lowered
        for token in ("district", "provincial", "regional", "subnational", "admin")
    ) else None

    provenance: dict[str, IndicatorProvenance] = {}
    for indicator in indicators:
        spatial = gis_resolution or subnational_resolution or "unknown"
        if indicator.dcid.startswith("undata/sdg/") and spatial == "unknown":
            spatial = "national"
        provenance[indicator.dcid] = IndicatorProvenance(
            spatial_resolution=spatial,
            reference_year_start=reference_year,
            reference_year_end=reference_year,
        )
    return provenance


def _extract_claim_heuristic(
    text: str,
    *,
    url: Optional[str] = None,
    title: Optional[str] = None,
) -> ReportClaim:
    client = DataCommonsClient()
    country, country_dcid = _detect_country(text, client)
    indicators = _indicators_from_text(text, client)
    sdgs = _detect_sdgs(text)
    seed = url or text[:120]

    return ReportClaim(
        claim_id=_claim_id("CLM-CUSTOM", seed),
        title=title or _title_from_text(text, "Custom report claim"),
        geographic_scope=country,
        country_dcid=country_dcid,
        target_outcome_indicator=_detect_outcome(text),
        sdgs=sdgs,
        declared_indicators=indicators,
        declared_sources=_detect_sources(text),
        analysis_level=_detect_analysis_level(text),
        summary=text[:600],
        claim_reference_year=_infer_claim_reference_year(text),
        indicator_provenance=_infer_indicator_provenance(text, indicators),
    )


def extract_claim(
    url: Optional[str] = None,
    text: Optional[str] = None,
    title: Optional[str] = None,
    use_llm: Optional[bool] = None,
) -> tuple[ReportClaim, str, str]:
    """
    Returns (claim, extraction_method, text_preview).
    """
    if url:
        twin = _find_twin_by_url(url)
        if twin:
            claim = _twin_to_claim(twin, url)
            return claim, "matched_case_study", (twin.get("summary") or "")[:400]

        body, page_title = fetch_url_text(url)
        text = body
        title = title or page_title

    if not text or not text.strip():
        raise ValueError("Provide a URL or paste report text to analyze.")

    configured = is_llm_configured()
    should_use_llm = use_llm if use_llm is not None else configured

    if should_use_llm and configured:
        try:
            claim, method = extract_claim_with_llm(
                text,
                source_url=url,
                title_hint=title,
            )
            return claim, method, text[:400]
        except Exception as exc:
            logger.warning("LLM extraction failed, falling back to heuristics: %s", exc)
            if use_llm is True:
                raise ValueError(f"LLM extraction failed: {exc}") from exc

    claim = _extract_claim_heuristic(text, url=url, title=title)
    method = "heuristic_url_extraction" if url else "heuristic_text_extraction"
    return claim, method, text[:400]
