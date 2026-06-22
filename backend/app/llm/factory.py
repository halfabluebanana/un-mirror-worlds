from typing import Optional

from app.config import LLM_EXTRACTION_ENABLED, LLM_PROVIDER
from app.llm.anthropic_provider import AnthropicProvider
from app.llm.base import LLMProvider


def _build_provider(provider_name: str) -> Optional[LLMProvider]:
    name = provider_name.strip().lower()
    if name in ("anthropic", "claude"):
        return AnthropicProvider()
    if name in ("none", "heuristic", "off"):
        return None
    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider_name}'. Supported: anthropic, none"
    )


def get_llm_provider() -> Optional[LLMProvider]:
    if not LLM_EXTRACTION_ENABLED:
        return None
    provider = _build_provider(LLM_PROVIDER)
    if provider and not provider.is_configured():
        return None
    return provider
