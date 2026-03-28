import os
import json
import pandas as pd


SUPPORTED = {".csv", ".xlsx", ".xls"}


def load(file_path: str) -> pd.DataFrame:
    """Load a CSV or Excel file and return a DataFrame."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        try:
            return pd.read_csv(file_path)
        except UnicodeDecodeError:
            # Try with a common alternative encoding if UTF-8 fails
            return pd.read_csv(file_path, encoding='latin1')
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(file_path)
    raise ValueError(f"Unsupported tabular format: {ext}")


def save_dataframe(df: pd.DataFrame, project_id: int, document_id: int) -> str:
    """Persist the dataframe as JSON for later querying. Returns the saved path."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tabular_dir = os.path.join(base_dir, "data", "projects", str(project_id), "tabular")
    os.makedirs(tabular_dir, exist_ok=True)
    path = os.path.join(tabular_dir, f"document_{document_id}.json")
    meta = {
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "shape": list(df.shape),
        "records": df.to_dict(orient="records"),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, default=str)
    return path


def load_dataframe(project_id: int, document_id: int) -> pd.DataFrame:
    """Load a previously saved dataframe."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "data", "projects", str(project_id), "tabular", f"document_{document_id}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"No tabular data for document {document_id}")
    with open(path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return pd.DataFrame(meta["records"])


def get_tabular_meta(project_id: int, document_id: int) -> dict:
    """Return schema metadata without loading full records."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "data", "projects", str(project_id), "tabular", f"document_{document_id}.json")
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return {"columns": meta.get("columns", []), "dtypes": meta.get("dtypes", {}), "shape": meta.get("shape", [])}
