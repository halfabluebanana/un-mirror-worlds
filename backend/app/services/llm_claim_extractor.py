import hashlib
from typing import Optional

from app.llm.drafts import LlmClaimDraft, LlmIndicatorDraft
from app.llm.factory import get_llm_provider
from app.llm.prompts import CLAIM_EXTRACTION_SYSTEM, CLAIM_EXTRACTION_USER
from app.llm.base import LLMMessage
from app.models import IndicatorRef, ReportClaim, SdgRef
from app.services.datacommons import DataCommonsClient


MAX_DOCUMENT_CHARS = 24_000
TOOL_NAME = "submit_claim_extraction"


def _claim_id(seed: str) -> str:
    digest = hashlib.sha1(seed.encode("utf-8")).hexdigest()[:8].upper()
    return f"CLM-LLM-{digest}"


def _truncate(text: str, limit: int = MAX_DOCUMENT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 80] + "\n\n[... document truncated for LLM context ...]"


def _resolve_indicator_dcid(
    draft: LlmIndicatorDraft,
    client: DataCommonsClient,
    seen: set,
) -> Optional[IndicatorRef]:
    dcid = draft.dcid
    name = draft.name.strip()

    if dcid and dcid not in seen:
        seen.add(dcid)
        return IndicatorRef(dcid=dcid, name=name, sdg_indicator=draft.sdg_indicator)

    for query in [name, draft.sdg_indicator or ""]:
        if not query:
            continue
        for candidate in client.search_indicators(query, limit=3):
            candidate_dcid = candidate.get("dcid")
            if not candidate_dcid or candidate_dcid in seen:
                continue
            if candidate_dcid.startswith("undata/") or candidate_dcid.startswith("sdg/"):
                seen.add(candidate_dcid)
                return IndicatorRef(
                    dcid=candidate_dcid,
                    name=candidate.get("name") or name,
                    sdg_indicator=draft.sdg_indicator,
                )
    return None


def _enrich_draft(
    draft: LlmClaimDraft,
    seed: str,
    source_url: Optional[str],
) -> ReportClaim:
    client = DataCommonsClient()
    country_dcid = None
    if draft.geographic_scope and draft.geographic_scope.lower() != "unknown":
        country_dcid = client.resolve_country(draft.geographic_scope)

    indicators = []
    seen = set()
    for item in draft.declared_indicators:
        resolved = _resolve_indicator_dcid(item, client, seen)
        if resolved:
            indicators.append(resolved)

    analysis_level = draft.analysis_level.lower().strip()
    if analysis_level not in ("national", "subnational", "municipal"):
        analysis_level = "national"

    return ReportClaim(
        claim_id=_claim_id(seed),
        title=draft.title.strip(),
        geographic_scope=draft.geographic_scope.strip(),
        country_dcid=country_dcid,
        m49_code=draft.m49_code,
        target_outcome_indicator=draft.target_outcome_indicator.strip(),
        sdgs=draft.sdgs or [SdgRef(goal=17, name="Partnerships for the Goals")],
        declared_indicators=indicators,
        declared_sources=draft.declared_sources or ["Unspecified public datasets"],
        analysis_level=analysis_level,
        summary=draft.summary.strip()[:800],
    )


def extract_claim_with_llm(
    document_text: str,
    *,
    source_url: Optional[str] = None,
    title_hint: Optional[str] = None,
) -> tuple[ReportClaim, str]:
    provider = get_llm_provider()
    if provider is None:
        raise RuntimeError("LLM extraction is not configured")

    user_prompt = CLAIM_EXTRACTION_USER.format(
        source_url=source_url or "n/a",
        title_hint=title_hint or "n/a",
        document=_truncate(document_text),
    )

    draft = provider.structured_completion(
        [
            LLMMessage(role="system", content=CLAIM_EXTRACTION_SYSTEM),
            LLMMessage(role="user", content=user_prompt),
        ],
        LlmClaimDraft,
        tool_name=TOOL_NAME,
    )

    seed = source_url or document_text[:200]
    claim = _enrich_draft(draft, seed, source_url)
    method = f"llm_{provider.name}"
    return claim, method


def llm_extraction_status() -> dict:
    from app.config import ANTHROPIC_MODEL, LLM_EXTRACTION_ENABLED, LLM_PROVIDER

    provider = get_llm_provider()
    return {
        "enabled": provider is not None,
        "provider": provider.name if provider else LLM_PROVIDER,
        "model": getattr(provider, "_model", ANTHROPIC_MODEL) if provider else ANTHROPIC_MODEL,
        "llm_extraction_enabled": LLM_EXTRACTION_ENABLED,
        "api_key_configured": bool(getattr(provider, "_api_key", "")) if provider else False,
    }
