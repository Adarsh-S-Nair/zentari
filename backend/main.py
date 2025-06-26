from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
import os
import requests

def download_sp500_csv_if_missing():
    csv_path = "data/sp500_snapshot_history.csv"
    csv_url = "https://github.com/Adarsh-S-Nair/zentari/releases/download/v1.0.0/sp500_snapshot_history.csv"
    
    if not os.path.exists(csv_path):
        print("[INFO] S&P 500 CSV file not found. Downloading...")
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        try:
            response = requests.get(csv_url)
            response.raise_for_status()
            with open(csv_path, "wb") as f:
                f.write(response.content)
            print("[INFO] S&P 500 CSV file downloaded successfully.")
        except Exception as e:
            print(f"[ERROR] Failed to download S&P 500 CSV: {e}")
            raise
    else:
        print("[INFO] S&P 500 CSV file already exists. Skipping download.")

# Download required data files
download_sp500_csv_if_missing()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # dev
        "https://zentari-seven.vercel.app",  # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
