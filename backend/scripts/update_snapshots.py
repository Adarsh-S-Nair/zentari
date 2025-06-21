import sys
import os
import csv
import time
import requests
from datetime import datetime, timedelta
from collections import defaultdict

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.sp500_scraper import SP500Scraper

CSV_PATH = "backend/data/sp500_snapshot_history.csv"
RELEASE_CSV_URL = "https://github.com/Adarsh-S-Nair/zentari/releases/download/v1.0.0/sp500_snapshot_history.csv"
STARTING_REVID = 112958830
STARTING_DATE = "2007-03-06"

def download_csv_from_release():
    print("⬇️ Downloading CSV from GitHub release...")
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    response = requests.get(RELEASE_CSV_URL)
    if response.status_code != 200:
        print(f"❌ Failed to download CSV: {response.status_code}")
        return False
    with open(CSV_PATH, "wb") as f:
        f.write(response.content)
    print("✅ CSV downloaded successfully.")
    return True

def load_last_snapshot():
    if not os.path.exists(CSV_PATH):
        return None, None, []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.reader(f))
        if not rows or rows[-1][0] == "date":
            return None, None, []
        last_row = rows[-1]
        return last_row[0], int(last_row[2]), eval(last_row[1])

def save_snapshot(timestamp, tickers, revid):
    with open(CSV_PATH, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if os.stat(CSV_PATH).st_size == 0:
            writer.writerow(["date", "tickers", "revid"])
        writer.writerow([timestamp, tickers, revid])
    print(f"✅ Snapshot saved for {timestamp} with {len(tickers)} tickers (rev {revid})")

def update_snapshots():
    scraper = SP500Scraper()
    print("🚀 Starting S&P 500 snapshot update...")

    last_date, last_revid, last_tickers = load_last_snapshot()

    if not last_tickers:
        print(f"📥 Seeding from revision {STARTING_REVID}...")
        html = scraper.fetch_revision_html(STARTING_REVID)
        tickers = scraper.extract_tickers_from_html(html)
        if tickers:
            save_snapshot(STARTING_DATE, tickers, STARTING_REVID)
            last_tickers = tickers
            last_date = STARTING_DATE
            last_revid = STARTING_REVID
        else:
            print("❌ Failed to extract tickers from initial revision.")
            return

    continue_token = None
    seen_revids = set()

    while True:
        dt = datetime.strptime(last_date, "%Y-%m-%d") + timedelta(seconds=1)
        start_timestamp = dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        revisions = scraper.get_revisions(
            limit=20,
            direction="newer",
            continue_token=continue_token,
            start_timestamp=start_timestamp
        )

        if not revisions:
            print("✅ No more revisions — done!")
            break

        filtered = []
        for rev in revisions:
            rev_date = rev["timestamp"][:10]
            revid = rev["revid"]
            if revid in seen_revids or rev_date <= last_date:
                continue
            filtered.append(rev)
            seen_revids.add(revid)

        if not filtered:
            print("✅ No new valid revisions — done!")
            break

        revisions_by_date = defaultdict(list)
        for rev in filtered:
            date = rev["timestamp"][:10]
            revisions_by_date[date].append(rev)

        for date, revs in sorted(revisions_by_date.items()):
            latest_rev = max(revs, key=lambda r: r["revid"])
            revid = latest_rev["revid"]
            timestamp = latest_rev["timestamp"][:10]

            html = scraper.fetch_revision_html(revid)
            tickers = scraper.extract_tickers_from_html(html)

            if not tickers or len(tickers) < 490:
                print(f"⚠️ Skipping revision {revid} on {timestamp} — only {len(tickers)} tickers")
                continue

            if scraper.tickers_changed(last_tickers, tickers):
                save_snapshot(timestamp, tickers, revid)
                last_tickers = tickers
                last_date = timestamp
                last_revid = revid
            else:
                print(f"⏩ No change on {timestamp} (rev {revid})")

            time.sleep(0.5)

        continue_token = scraper.cont_token

if __name__ == "__main__":
    if download_csv_from_release():
      update_snapshots()
