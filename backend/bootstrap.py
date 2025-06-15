import os
import requests

DB_PATH = "data/sp500_prices.duckdb"
DOWNLOAD_URL = "https://github.com/Adarsh-S-Nair/zentari/releases/download/v1.0.0/sp500_prices.duckdb"

def download_duckdb_if_missing():
    if not os.path.exists(DB_PATH):
        print("[INFO] DuckDB file not found. Downloading...")
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with requests.get(DOWNLOAD_URL, stream=True) as r:
            with open(DB_PATH, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print("[INFO] DuckDB file downloaded successfully.")
    else:
        print("[INFO] DuckDB file already exists. Skipping download.")
