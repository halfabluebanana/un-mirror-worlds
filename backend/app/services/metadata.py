import re

import httpx

from app.config import SDG_METADATA_API_URL


def fetch_sdg_metadata(indicator_code: str) -> dict:
    """Fetch custodian metadata snippets for an SDG indicator code."""
    url = f"{SDG_METADATA_API_URL}/{indicator_code}"
    with httpx.Client(timeout=20.0) as client:
        response = client.get(url)
        if response.status_code != 200:
            return {}

    text = response.text
    fields = {
        "sources_data_collection": _extract_tag(text, "SOURCES_DATA_COLLECTION"),
        "comments_limitations": _extract_tag(text, "COMMENT_LIMITATIONS"),
        "reliability_coverage_comparability_subnational_compute": _extract_tag(
            text, "RELIABILITY_COVERAGE_COMPARABILITY_SUBNATIONAL_COMPUTE"
        ),
    }
    return {key: value for key, value in fields.items() if value}


def _extract_tag(xml_text: str, tag: str) -> str:
    pattern = rf"<[^>]*{tag}[^>]*>(.*?)</[^>]*>"
    match = re.search(pattern, xml_text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    value = re.sub(r"<[^>]+>", " ", match.group(1))
    return re.sub(r"\s+", " ", value).strip()[:500]
