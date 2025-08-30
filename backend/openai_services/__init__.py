from .client import OpenAIService

_openai_service = None


def get_openai() -> OpenAIService:
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service


__all__ = [
    'OpenAIService',
    'get_openai',
]



