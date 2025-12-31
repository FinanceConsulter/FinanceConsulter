import os
import json
import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence

from sentence_transformers import SentenceTransformer


DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
# Default chosen to work well with short, manual descriptions (e.g., "Coop", "Migros").
# Can be overridden via CATEGORY_AUTO_THRESHOLD env var.
DEFAULT_AUTO_THRESHOLD = 0.5


@dataclass(frozen=True)
class CategoryCandidate:
    id: int
    name: str
    type: str
    parent_id: Optional[int]
    description: Optional[str]


@dataclass(frozen=True)
class CategorySuggestion:
    category_id: Optional[int]
    score: float
    # The best matching category regardless of threshold.
    # This enables a caller-side fallback threshold.
    best_category_id: Optional[int] = None
    # Confidence proxy: difference between best and 2nd best score.
    margin: float = 0.0


def _desc_lower(description: Optional[str]) -> str:
    return _normalize_for_match(description)


def _normalize_for_match(text: Optional[str]) -> str:
    """Normalize text for keyword matching.

    - casefold
    - strip diacritics (e.g. Döner -> Doner)
    - replace punctuation with spaces
    - collapse whitespace
    """
    s = (text or "").strip()
    if not s:
        return ""
    s = s.casefold()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _squash(text: str) -> str:
    return (text or "").replace(" ", "")


def _has_ancestor_named(candidate: CategoryCandidate, by_id: dict[int, CategoryCandidate], names: set[str]) -> bool:
    cur = candidate
    while cur.parent_id and cur.parent_id in by_id:
        parent = by_id[cur.parent_id]
        if parent.name.lower() in names:
            return True
        cur = parent
    return False


def _is_food_category(candidate: CategoryCandidate, by_id: dict[int, CategoryCandidate]) -> bool:
    name = (candidate.name or '').lower()
    if name in {"food & drinks", "groceries", "restaurants & cafés", "restaurants & cafes", "takeaway & delivery"}:
        return True
    return _has_ancestor_named(candidate, by_id, {"food & drinks"})


def _is_finance_category(candidate: CategoryCandidate, by_id: dict[int, CategoryCandidate]) -> bool:
    name = (candidate.name or '').lower()
    if name in {"finance", "bank fees", "interest & charges", "taxes"}:
        return True
    return _has_ancestor_named(candidate, by_id, {"finance"})


def _apply_keyword_hints(
    candidates: Sequence[CategoryCandidate],
    description: Optional[str],
) -> List[CategoryCandidate]:
    # Lightweight heuristics to avoid obviously wrong matches for short descriptions.
    d = _desc_lower(description)
    if not d:
        return list(candidates)

    d_squashed = _squash(d)

    by_id = {c.id: c for c in candidates}

    food_keywords = {
        "doner", "kebab", "pizza", "burger", "restaurant", "cafe", "bar",
        "takeaway", "take away", "delivery", "liefer", "lieferung", "imbiss", "bistro",
    }
    # Match variants that often come with spaces/hyphens.
    food_squashed_keywords = {
        "takeaway",
        "mcdonalds",
        "mcd",
    }
    groceries_keywords = {"migros", "coop", "aldi", "lidl", "denner"}

    finance_keywords = {
        "bank", "gebühr", "gebuehr", "fee", "fees", "zins", "interest", "tax", "taxes", "steuer", "charges",
    }

    # If it clearly looks like food, restrict to Food & Drinks tree.
    if (
        any(k in d for k in food_keywords)
        or any(k in d for k in groceries_keywords)
        or any(k in d_squashed for k in food_squashed_keywords)
    ):
        food = [c for c in candidates if _is_food_category(c, by_id)]
        return food if food else list(candidates)

    # If it clearly looks like finance/banking, restrict to Finance tree.
    if any(k in d for k in finance_keywords):
        fin = [c for c in candidates if _is_finance_category(c, by_id)]
        return fin if fin else list(candidates)

    return list(candidates)


def _find_leaf_by_name(
    categories: Sequence[CategoryCandidate],
    target_names: Sequence[str],
) -> Optional[int]:
    if not categories:
        return None
    by_id = {c.id: c for c in categories}
    leaves = _leaf_categories(list(categories))

    wanted = {_normalize_for_match(n) for n in target_names if (n or '').strip()}
    for c in leaves:
        if _normalize_for_match(c.name) in wanted:
            return c.id

    # Fallback: try parent-qualified names (helps if only parent is present as leaf)
    for c in leaves:
        path = _build_category_path(c, by_id)
        if _normalize_for_match(path) in wanted:
            return c.id
    return None


def _rule_based_override(
    categories: Sequence[CategoryCandidate],
    description: Optional[str],
) -> Optional[CategorySuggestion]:
    """High-precision overrides for very common, obvious description patterns.

    Transactions do not have a separate merchant field; for manual entries the merchant-like
    info usually appears inside `description`.

    This keeps maintenance minimal while preventing empty categories for short manual entries.
    """
    d = _normalize_for_match(description)
    if not d:
        return None
    d_squashed = _squash(d)

    groceries_kw = {"migros", "coop", "aldi", "lidl", "denner"}
    takeaway_kw = {
        "take away",
        "takeaway",
        "delivery",
        "liefer",
        "lieferung",
        "imbiss",
        "doner",
        "kebab",
        "duner",
        "doener",
    }
    restaurant_kw = {"restaurant", "cafe", "bar", "bistro"}
    fastfood_squashed = {"mcdonalds", "mcd"}

    if any(k in d for k in groceries_kw):
        cid = _find_leaf_by_name(categories, ["Groceries"])
        if cid is not None:
            return CategorySuggestion(category_id=cid, score=1.0, best_category_id=cid, margin=1.0)

    if any(k in d for k in takeaway_kw) or any(k in d_squashed for k in fastfood_squashed):
        cid = _find_leaf_by_name(categories, ["Takeaway & Delivery", "Restaurants & Cafés", "Restaurants & Cafes"])
        if cid is not None:
            return CategorySuggestion(category_id=cid, score=1.0, best_category_id=cid, margin=1.0)

    if any(k in d for k in restaurant_kw):
        cid = _find_leaf_by_name(categories, ["Restaurants & Cafés", "Restaurants & Cafes", "Takeaway & Delivery"])
        if cid is not None:
            return CategorySuggestion(category_id=cid, score=1.0, best_category_id=cid, margin=1.0)

    return None


_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        model_name = os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
        _model = SentenceTransformer(model_name)
    return _model


def _normalize(text: Optional[str]) -> str:
    return (text or "").strip()


def _build_category_path(candidate: CategoryCandidate, by_id: dict[int, CategoryCandidate]) -> str:
    if candidate.parent_id and candidate.parent_id in by_id:
        parent = by_id[candidate.parent_id]
        return f"{parent.name} > {candidate.name}"
    return candidate.name


def _leaf_categories(categories: Sequence[CategoryCandidate]) -> List[CategoryCandidate]:
    parent_ids = {c.parent_id for c in categories if c.parent_id is not None}
    leaves = [c for c in categories if c.id not in parent_ids]
    return leaves if leaves else list(categories)


def _candidates_for_amount(
    categories: Sequence[CategoryCandidate],
    amount_cents: int,
) -> List[CategoryCandidate]:
    if amount_cents < 0:
        allowed = {"expense", "neutral"}
    elif amount_cents > 0:
        allowed = {"income", "neutral"}
    else:
        allowed = {"expense", "income", "neutral"}

    return [c for c in categories if (c.type or "").lower() in allowed]


def build_transaction_text(description: Optional[str], amount_cents: int, currency_code: Optional[str]) -> str:
    # IMPORTANT: Embedding is based on description ONLY.
    # Amount/type filtering is handled separately via _candidates_for_amount.
    return _normalize(description)


def build_category_label_text(candidate: CategoryCandidate, by_id: dict[int, CategoryCandidate]) -> str:
    description = _normalize(candidate.description)

    # IMPORTANT: Category embeddings should be based on description only.
    # Fallback to name to avoid embedding empty strings when no description is present.
    return description if description else candidate.name


def suggest_category_for_transaction(
    *,
    categories: Sequence[CategoryCandidate],
    description: Optional[str],
    amount_cents: int,
    currency_code: Optional[str] = None,
    threshold: float = DEFAULT_AUTO_THRESHOLD,
) -> CategorySuggestion:
    text = build_transaction_text(description, amount_cents, currency_code)
    if not text:
        return CategorySuggestion(category_id=None, score=0.0, best_category_id=None, margin=0.0)

    if not categories:
        return CategorySuggestion(category_id=None, score=0.0, best_category_id=None, margin=0.0)

    filtered = _candidates_for_amount(categories, amount_cents)
    if not filtered:
        return CategorySuggestion(category_id=None, score=0.0, best_category_id=None, margin=0.0)

    filtered = _apply_keyword_hints(filtered, description)

    override = _rule_based_override(filtered, description)
    if override is not None:
        return override

    by_id = {c.id: c for c in filtered}
    leaves = _leaf_categories(filtered)

    label_texts = [build_category_label_text(c, by_id) for c in leaves]

    model = _get_model()
    # encode with normalization -> cosine similarity equals dot product
    label_embeddings = model.encode(label_texts, normalize_embeddings=True)
    tx_embedding = model.encode([text], normalize_embeddings=True)[0]

    # dot product for normalized vectors
    best_idx = -1
    best_score = -1.0
    second_best_score = -1.0
    for i, emb in enumerate(label_embeddings):
        score = float(emb @ tx_embedding)
        if score > best_score:
            second_best_score = best_score
            best_score = score
            best_idx = i
        elif score > second_best_score:
            second_best_score = score

    if best_idx < 0:
        return CategorySuggestion(category_id=None, score=0.0, best_category_id=None, margin=0.0)

    best_category_id = leaves[best_idx].id
    category_id = best_category_id if best_score >= threshold else None
    margin = (best_score - second_best_score) if second_best_score >= 0 else best_score
    return CategorySuggestion(category_id=category_id, score=best_score, best_category_id=best_category_id, margin=margin)


def suggest_categories_batch(
    *,
    categories: Sequence[CategoryCandidate],
    descriptions: Sequence[Optional[str]],
    amount_cents_list: Sequence[int],
    currency_codes: Optional[Sequence[Optional[str]]] = None,
    threshold: float = DEFAULT_AUTO_THRESHOLD,
) -> List[CategorySuggestion]:
    if currency_codes is None:
        currency_codes = [None] * len(descriptions)

    if len(descriptions) != len(amount_cents_list) or len(descriptions) != len(currency_codes):
        raise ValueError("Batch inputs must have the same length")

    # Per-transaction filtering by amount type; for simplicity with small category sets,
    # we run the single-item implementation per tx.
    suggestions: List[CategorySuggestion] = []
    for desc, amt, cur in zip(descriptions, amount_cents_list, currency_codes):
        suggestions.append(
            suggest_category_for_transaction(
                categories=categories,
                description=desc,
                amount_cents=amt,
                currency_code=cur,
                threshold=threshold,
            )
        )

    return suggestions


def _strip_code_fences(text: str) -> str:
    text = (text or "").strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _extract_json_array(text: str) -> Optional[list]:
    cleaned = _strip_code_fences(text)
    # Try direct parse first
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass

    # Fallback: extract first [...] block
    match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, list) else None
    except Exception:
        return None


def gemini_suggest_categories_batch(
    *,
    categories: Sequence[CategoryCandidate],
    items: Sequence[dict],
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Optional[dict[str, CategorySuggestion]]:
    """
    Best-effort Gemini fallback: one request for many transactions.

    Returns a mapping {client_id: CategorySuggestion} or None if disabled/unavailable.

    Expected `items` shape:
      {"client_id": str, "description": str|None, "amount_cents": int, "currency_code": str|None}
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    if not items:
        return {}

    # Lazy import so non-AI flow doesn't require Gemini config.
    try:
        import google.generativeai as genai
    except Exception:
        return None

    genai.configure(api_key=api_key)
    model_name = model_name or os.getenv("CATEGORY_GEMINI_MODEL", "models/gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    # Build leaf-only candidates to keep selection stable.
    leaves = _leaf_categories(categories)
    by_id = {c.id: c for c in categories}

    category_payload = [
        {
            "id": c.id,
            "path": _build_category_path(c, by_id),
            "type": c.type,
            "description": _normalize(c.description),
        }
        for c in leaves
    ]

    tx_payload = [
        {
            "client_id": str(i.get("client_id") or ""),
            "description": _normalize(i.get("description")),
            "amount_cents": int(i.get("amount_cents")),
            "currency_code": _normalize(i.get("currency_code")),
        }
        for i in items
    ]

    prompt = (
        "You are a transaction categorization assistant. "
        "Choose the best matching category_id for each transaction.\n\n"
        "Rules:\n"
        "- Use ONLY the provided categories list (leaf categories).\n"
        "- Respect amount sign: negative amounts must map to type expense or neutral; "
        "positive amounts must map to type income or neutral.\n"
        "- If you are unsure, return category_id null.\n"
        "- Output MUST be valid JSON array, no markdown.\n\n"
        "Categories (leaf):\n"
        f"{json.dumps(category_payload, ensure_ascii=False)}\n\n"
        "Transactions:\n"
        f"{json.dumps(tx_payload, ensure_ascii=False)}\n\n"
        "Return JSON array with objects: "
        "[{\"client_id\": string, \"category_id\": int|null, \"confidence\": number 0..1}]"
    )

    try:
        response = model.generate_content(prompt)
    except Exception:
        return None

    raw = getattr(response, "text", "") or ""
    arr = _extract_json_array(raw)
    if arr is None:
        return None

    leaf_ids = {c.id for c in leaves}
    out: dict[str, CategorySuggestion] = {}
    for entry in arr:
        if not isinstance(entry, dict):
            continue
        client_id = str(entry.get("client_id") or "").strip()
        if not client_id:
            continue
        cid = entry.get("category_id")
        try:
            confidence = float(entry.get("confidence", 0.0))
        except Exception:
            confidence = 0.0

        category_id: Optional[int]
        if cid is None:
            category_id = None
        else:
            try:
                category_id = int(cid)
            except Exception:
                category_id = None

        if category_id is not None and category_id not in leaf_ids:
            category_id = None

        out[client_id] = CategorySuggestion(category_id=category_id, score=confidence)

    return out
