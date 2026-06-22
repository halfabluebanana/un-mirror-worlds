import json
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_API_URL, ANTHROPIC_MODEL
from app.llm.base import LLMMessage, LLMProvider

T = TypeVar("T", bound=BaseModel)


class AnthropicProvider(LLMProvider):
    def __init__(
        self,
        api_key: str = ANTHROPIC_API_KEY,
        model: str = ANTHROPIC_MODEL,
        api_url: str = ANTHROPIC_API_URL,
    ) -> None:
        self._api_key = api_key or ""
        self._model = model
        self._api_url = api_url.rstrip("/")

    @property
    def name(self) -> str:
        return "anthropic"

    def is_configured(self) -> bool:
        return bool(self._api_key.strip())

    def structured_completion(
        self,
        messages: list[LLMMessage],
        response_model: Type[T],
        *,
        tool_name: str = "submit_structured_response",
        max_tokens: int = 4096,
    ) -> T:
        if not self.is_configured():
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        system_parts = [message.content for message in messages if message.role == "system"]
        user_parts = [message.content for message in messages if message.role == "user"]

        payload = {
            "model": self._model,
            "max_tokens": max_tokens,
            "system": "\n\n".join(system_parts),
            "messages": [
                {"role": "user", "content": "\n\n".join(user_parts)},
            ],
            "tools": [
                {
                    "name": tool_name,
                    "description": f"Submit a structured {response_model.__name__} result.",
                    "input_schema": response_model.model_json_schema(),
                }
            ],
            "tool_choice": {"type": "tool", "name": tool_name},
        }

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{self._api_url}/v1/messages",
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        tool_input = self._extract_tool_input(data, tool_name)
        try:
            return response_model.model_validate(tool_input)
        except ValidationError as exc:
            raise ValueError(f"LLM returned invalid structured output: {exc}") from exc

    @staticmethod
    def _extract_tool_input(data: dict, tool_name: str) -> dict:
        for block in data.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == tool_name:
                return block.get("input", {})
        raise ValueError(f"LLM response did not include tool output for {tool_name}")
