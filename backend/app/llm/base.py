from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


@dataclass
class LLMMessage:
    role: str
    content: str


class LLMProvider(ABC):
    """Provider-agnostic interface for structured LLM completions."""

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def structured_completion(
        self,
        messages: list[LLMMessage],
        response_model: Type[T],
        *,
        tool_name: str = "submit_structured_response",
        max_tokens: int = 4096,
    ) -> T:
        raise NotImplementedError
