"""
Tabular query engine: uses Ollama to generate and execute pandas code
against a loaded DataFrame. Fully offline, no external API calls.
"""
import re
import traceback
import pandas as pd
import ollama


_CODE_SYSTEM = """You are a Python/pandas expert. Given a DataFrame named `df` and a user question,
write a single Python expression (no imports, no assignments, no print) that evaluates to the answer.
Return ONLY the expression, nothing else. Examples:
- "highest salary" → df['salary'].max()
- "average marks" → df['marks'].mean()
- "top 5 rows" → df.head(5)
- "count rows" → len(df)
- "statistics" → df.describe()
"""

_SUMMARY_SYSTEM = """You are a data analyst assistant. Given a question and its computed result,
write a clear, concise natural language answer in markdown format.
- Use **bold** for key values
- Use bullet points for multiple items
- Use a markdown table if the result is tabular
- Keep it brief and informative
- Do NOT repeat the raw numbers verbatim if a table is shown below
"""


def _ask_ollama_for_code(columns: list, question: str, model: str = "llama3.2:3b") -> str:
    col_info = ", ".join(columns)
    user_msg = f"DataFrame columns: {col_info}\n\nQuestion: {question}"
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": _CODE_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    raw = response["message"]["content"].strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()


def _ask_ollama_for_summary(question: str, result_text: str, model: str = "llama3.2:3b") -> str:
    """Ask the LLM to produce a nicely formatted markdown answer."""
    user_msg = f"Question: {question}\n\nComputed result:\n{result_text}"
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": _SUMMARY_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    return response["message"]["content"].strip()


def _df_to_result(df: pd.DataFrame, code: str) -> dict:
    """Convert a DataFrame result, preserving index as a column when meaningful."""
    # If the index has a name or is not the default RangeIndex, include it
    if df.index.name or not isinstance(df.index, pd.RangeIndex):
        df = df.reset_index()
    return {
        "type": "table",
        "data": df.to_dict(orient="records"),
        "columns": list(df.columns),
        "code": code,
    }


def run_tabular_query(df: pd.DataFrame, question: str, model: str = "llama3.2:3b") -> dict:
    """
    Execute a natural-language query against a DataFrame.
    Returns {"type": "table"|"scalar"|"error", "data": ..., "summary": str, "code": str}
    """
    try:
        code = _ask_ollama_for_code(list(df.columns), question, model)
    except Exception as e:
        return {"type": "error", "data": f"LLM error: {e}", "code": ""}

    try:
        result = eval(code, {"df": df, "pd": pd})  # noqa: S307
    except Exception:
        return {"type": "error", "data": f"Code execution failed:\n{traceback.format_exc()}", "code": code}

    # Normalise result
    if isinstance(result, pd.DataFrame):
        out = _df_to_result(result, code)
        # Build a text preview for the LLM summary
        preview = result.to_string(max_rows=20)
        out["summary"] = _ask_ollama_for_summary(question, preview, model)
        return out

    if isinstance(result, pd.Series):
        reset = result.reset_index()
        out = {
            "type": "table",
            "data": reset.to_dict(orient="records"),
            "columns": list(reset.columns),
            "code": code,
        }
        out["summary"] = _ask_ollama_for_summary(question, result.to_string(), model)
        return out

    # Scalar
    summary = _ask_ollama_for_summary(question, str(result), model)
    return {"type": "scalar", "data": str(result), "summary": summary, "code": code}
