"""
Hybrid query router: classifies a user question as
  - "analytical"  → route to tabular engine (PandasAI-style)
  - "semantic"    → route to vector RAG pipeline
"""
import re

# Keywords that strongly suggest an analytical / aggregation query
_ANALYTICAL_PATTERNS = re.compile(
    r"\b("
    r"average|avg|mean|median|sum|total|count|max|maximum|min|minimum|highest|lowest|"
    r"top\s+\d+|bottom\s+\d+|first\s+\d+|last\s+\d+|"
    r"how many|how much|percentage|percent|ratio|distribution|"
    r"sort|rank|group by|pivot|filter|where|greater than|less than|"
    r"rows?|columns?|records?|entries|dataset|table|spreadsheet|csv|excel"
    r")\b",
    re.IGNORECASE,
)


def classify_query(question: str) -> str:
    """Return 'analytical' or 'semantic'."""
    if _ANALYTICAL_PATTERNS.search(question):
        return "analytical"
    return "semantic"
