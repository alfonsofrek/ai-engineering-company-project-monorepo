"""
Safe snippet for basic pandas cleaning. Copy and adapt for your dataset.
Run: python pandas_clean.py  (ensure pandas is installed)
"""
import sys
from pathlib import Path

import pandas as pd

INPUT_PATH = Path("data.csv")  # adjust as needed

# Load (adjust path and kwargs as needed). Fail fast with a clear message and exit code 1.
if not INPUT_PATH.is_file():
    print(f"Error: input file not found: {INPUT_PATH}", file=sys.stderr)
    sys.exit(1)
try:
    df = pd.read_csv(INPUT_PATH)  # or read_json, read_excel
except (OSError, UnicodeDecodeError) as error:
    print(f"Error: could not read {INPUT_PATH}: {type(error).__name__}", file=sys.stderr)
    sys.exit(1)
except pd.errors.ParserError:
    print(f"Error: {INPUT_PATH} is not a valid CSV file", file=sys.stderr)
    sys.exit(1)
if df.empty:
    print(f"Error: {INPUT_PATH} has no rows to clean", file=sys.stderr)
    sys.exit(1)
print("df_shape", df.shape)
print("df_dtypes", df.dtypes)

# Drop fully null columns
df = df.dropna(axis=1, how="all")
print("df_shape_after_drop_all_null_cols", df.shape)

# Fill or drop nulls in key columns (customise columns)
# df = df.dropna(subset=["required_col"])
# df["optional_col"] = df["optional_col"].fillna(0)

# Normalise column names (optional)
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
print("df_columns", list(df.columns))

# Deduplicate (optional)
before = len(df)
df = df.drop_duplicates()
print("rows_dropped_duplicates", before - len(df))

# Sample output
print("df_head", df.head())
