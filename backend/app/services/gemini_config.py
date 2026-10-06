"""Shared Gemini configuration helpers (API key lookup + lazy SDK import)."""

import os
from typing import Any, Optional

from dotenv import load_dotenv

load_dotenv()


def get_gemini_api_key() -> Optional[str]:
    """Return the Gemini API key from GEMINI_API_KEY, falling back to GOOGLE_API_KEY."""
    return os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or None


def import_genai() -> Any:
    """Import google.generativeai lazily so the API starts without the AI extras installed."""
    try:
        import google.generativeai as genai
    except ImportError as e:
        raise ValueError(
            'google-generativeai is not installed (pip install google-generativeai)'
        ) from e
    return genai
