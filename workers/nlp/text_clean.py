"""Job description cleaning utilities: boilerplate removal and normalization."""
from __future__ import annotations

import re

# Repetitive boilerplate phrases often found in scraped job descriptions.
_BOILERPLATE_SECTIONS = re.compile(
    r"(about the company|company description|company profile|job description overview|"
    r"about us|who we are|equal opportunity|we are an equal opportunity employer|"
    r"disclaimer|apply now|how to apply|our client|roles and responsibilities overview|"
    r"responsibilities\s*[:\-]?\s*$)",
    re.IGNORECASE,
)

# Common templated lines worth stripping (e.g., "Posted by", "Apply on company site").
_TEMPLATE_LINES = re.compile(
    r"^\s*(posted\s+(on|by|within)|apply\s+(now|on|before|before|to)|"
    r"job\s+(posted|expires)|location|industry|employment\s+type|"
    r"work\s+mode|shift|interview\s+process|about\s+the\s+team)\b.*$",
    re.IGNORECASE | re.MULTILINE,
)

_SPACES_RE = re.compile(r"[ \t]+")
_MULTI_NL_RE = re.compile(r"\n{2,}")
_PADDING_RE = re.compile(r"^\s+|\s+$")


def clean_description(raw: str, max_words: int = 800) -> str:
    """Clean a raw job description: strip boilerplate, normalize whitespace.

    Returns truncated, deduplicated description ready for NLP extraction.
    """
    if not raw:
        return ""
    text = raw

    # Strip boilerplate headings and whatever follows them (or just the heading).
    text = _BOILERPLATE_SECTIONS.sub("", text)
    text = _TEMPLATE_LINES.sub("", text)

    # Remove duplicate lines while preserving order.
    seen: set[str] = set()
    kept: list[str] = []
    for line in text.splitlines():
        line = _SPACES_RE.sub(" ", line).strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        kept.append(line)

    cleaned = "\n".join(kept)
    cleaned = _MULTI_NL_RE.sub("\n", cleaned).strip()

    # Truncate to a word cap to bound NLP cost.
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])

    return cleaned
