from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()


class AICategoryOnboardingGenerator:
    """Generate a category + subcategory tree for a user via Gemini."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError('GEMINI_API_KEY must be set in .env file or provided as argument')

        genai.configure(api_key=self.api_key)
        model_name = os.getenv('GEMINI_MODEL') or 'models/gemini-2.5-flash'
        self.model = genai.GenerativeModel(model_name)

    def build_prompt(self, behavior_text: str) -> str:
        behavior_text = (behavior_text or '').strip()
        return f"""You are a finance app categorization assistant for a Swiss user.

Task:
Generate ADDITIONAL categories and subcategories that complement an existing standard set.
The app will merge your output with standard categories and will discard duplicates.

User description (may be empty):
{behavior_text}

Output requirements (MUST follow exactly):
- Return ONLY valid JSON (no markdown, no explanations).
- Return a JSON array of objects with exactly these keys: name, type, subcategories.

Schema:
[
  {{
    "name": "<category name>",
    "type": "expense" | "income",
    "subcategories": ["<subcategory name>", ...]
  }}
]

Safety & constraints:
- 0-10 categories. Each category: 0-8 subcategories.
- All names must be globally unique across ALL categories and subcategories.
- Names must be plain UI strings (no JSON, no code, no URLs, no emails).
- Avoid generic placeholders like "Other".
- Prefer Swiss context where appropriate (Coop, Migros, SBB, Krankenkasse).
"""

    @staticmethod
    def _extract_json_list(text: str) -> list[Any]:
        text = (text or '').strip()
        if not text:
            raise ValueError('AI returned no text')

        # First, try plain JSON.
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

        # Salvage the first JSON array in the text.
        start = text.find('[')
        end = text.rfind(']')
        if start == -1 or end == -1 or end <= start:
            raise ValueError('AI response did not contain a JSON array')
        parsed = json.loads(text[start : end + 1])
        if not isinstance(parsed, list):
            raise ValueError('AI response is not a JSON list')
        return parsed

    @staticmethod
    def _sanitize_name(value: str, *, fallback: str, max_len: int = 64) -> str:
        s = (value or '').strip()
        s = re.sub(r"[\r\n\t]+", " ", s)
        s = re.sub(r"\s{2,}", " ", s)
        # Keep a conservative set of characters to avoid weird DB/UI issues.
        s = re.sub(r"[^\w\s&+\-'/().,]", "", s, flags=re.UNICODE)
        s = s.strip(" .,")
        if not s:
            s = fallback
        return s[:max_len]

    def generate_tree(self, behavior_text: str) -> list[dict[str, Any]]:
        prompt = self.build_prompt(behavior_text)
        result = self.model.generate_content(prompt)
        text = getattr(result, 'text', None)
        data = self._extract_json_list(text or '')

        cleaned: list[dict[str, Any]] = []
        used_names: set[str] = set()

        def _unique(name: str, suffix: str) -> str:
            candidate = self._sanitize_name(name, fallback=suffix)
            if candidate not in used_names:
                used_names.add(candidate)
                return candidate
            # disambiguate
            i = 2
            while True:
                alt = f"{candidate} ({suffix})" if i == 2 else f"{candidate} ({suffix} {i})"
                if alt not in used_names:
                    used_names.add(alt)
                    return alt
                i += 1

        # Limit payload size even if AI ignores constraints.
        for entry in data[:10]:
            if not isinstance(entry, dict):
                continue
            raw_name = str(entry.get('name', ''))
            raw_type = str(entry.get('type', '')).strip().lower()
            if raw_type not in {'expense', 'income'}:
                continue

            category_name = _unique(raw_name, 'Category')
            subcats_in = entry.get('subcategories', [])
            subcats_out: list[str] = []
            if isinstance(subcats_in, list):
                for s in subcats_in[:8]:
                    sname = str(s)
                    sname = self._sanitize_name(sname, fallback=category_name)
                    if not sname:
                        continue
                    subcats_out.append(_unique(sname, category_name))

            cleaned.append({
                'name': category_name,
                'type': raw_type,
                'subcategories': subcats_out,
            })

        if not cleaned:
            raise ValueError('AI produced no usable categories')
        return cleaned
