import json
from typing import Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.config import OPENROUTER_API_KEY, OPENROUTER_API_URL, OPENROUTER_MODEL, LLM_EXTRACTION_ENABLED

T = TypeVar("T", bound=BaseModel)


def is_llm_configured() -> bool:
    """Returns True if LLM extraction is enabled and OpenRouter API key is configured."""
    return LLM_EXTRACTION_ENABLED and bool(OPENROUTER_API_KEY.strip())


def get_structured_completion(
    system_prompt: str,
    user_prompt: str,
    response_model: Type[T],
    max_tokens: int = 4096,
) -> T:
    """Sends prompt to OpenRouter requesting structured JSON matching the response_model schema."""
    if not is_llm_configured():
        raise RuntimeError("OpenRouter LLM extraction is not configured or disabled.")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": response_model.__name__,
                "strict": False,
                "schema": response_model.model_json_schema(),
            },
        },
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/open-source-united-initiative/un-tech-over-2026",
        "X-Title": "Mirror Worlds Backend",
    }

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            f"{OPENROUTER_API_URL.rstrip('/')}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    choices = data.get("choices", [])
    if not choices:
        raise ValueError("No choices returned from OpenRouter API")

    content = choices[0].get("message", {}).get("content", "").strip()
    if not content:
        raise ValueError("LLM returned empty content")

    # Clean markdown blocks if present
    if content.startswith("```"):
        lines = content.splitlines()
        if len(lines) >= 2:
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()

    try:
        return response_model.model_validate_json(content)
    except ValidationError as exc:
        raise ValueError(f"LLM returned invalid structured output: {exc}") from exc
