import requests
from bs4 import BeautifulSoup
import time

class SP500Scraper:
    def __init__(self):
        self.page_title = "List of S&P 500 companies"
        self.api_url = "https://en.wikipedia.org/w/api.php"
        self.cont_token = None

    def get_revisions(self, limit=100, direction="newer", continue_token=None, start_timestamp=None, retries=3):
        params = {
            "action": "query",
            "format": "json",
            "redirects": 1,
            "prop": "revisions",
            "titles": self.page_title,
            "rvlimit": limit,
            "rvprop": "ids|timestamp",
            "rvdir": direction,
        }
        if continue_token:
            params["rvcontinue"] = continue_token
        if start_timestamp:
            params["rvstart"] = start_timestamp

        for attempt in range(retries):
            try:
                response = requests.get(self.api_url, params=params)
                response.raise_for_status()
                data = response.json()

                if "error" in data:
                    code = data["error"].get("code")
                    info = data["error"].get("info", "Unknown error")
                    print(f"⚠️ Wikipedia API error: {info}")
                    if code == "ratelimited":
                        wait = 10 * (attempt + 1)
                        print(f"⏳ Rate limited. Retrying in {wait} seconds...")
                        time.sleep(wait)
                        continue
                    return []

                if "query" not in data or "pages" not in data["query"]:
                    print("⚠️ Unexpected Wikipedia response format — skipping batch.")
                    return []

                pages = data["query"]["pages"]
                page = next(iter(pages.values()))
                self.cont_token = data.get("continue", {}).get("rvcontinue")

                return page.get("revisions", [])

            except Exception as e:
                print(f"❌ Error fetching revisions (attempt {attempt + 1}): {e}")
                time.sleep(5 * (attempt + 1))

        print("❌ Failed to fetch revisions after retries.")
        return []

    def fetch_revision_html(self, revid):
        url = f"https://en.wikipedia.org/w/index.php?oldid={revid}"
        response = requests.get(url)
        response.raise_for_status()
        return response.text

    def extract_tickers_from_html(self, html):
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")

        print(f"\n🔍 Found {len(tables)} tables")

        for idx, table in enumerate(tables):
            headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
            print(f"\n🧾 Table {idx + 1} headers: {headers}")

            symbol_idx = None
            for i, h in enumerate(headers):
                if "symbol" in h or "ticker" in h:
                    symbol_idx = i
                    break

            if symbol_idx is not None:
                print(f"✅ Found symbol column at index {symbol_idx} — parsing tickers...")
                rows = table.find_all("tr")[1:]
                tickers = []

                for row in rows:
                    cols = row.find_all("td")
                    if len(cols) <= symbol_idx:
                        continue

                    cell = cols[symbol_idx]
                    links = cell.find_all("a")
                    if links:
                        ticker = links[-1].get_text(strip=True)
                    else:
                        ticker = cell.get_text(strip=True)

                    if ":" in ticker:
                        ticker = ticker.split(":")[-1].strip()

                    if ticker.isupper() and 1 <= len(ticker) <= 6:
                        tickers.append(ticker)

                print(f"✅ Extracted {len(tickers)} tickers")
                print("🧪 Sample:", tickers[:10])
                return tickers

        print("❌ No valid symbol table found.")
        return []

    def tickers_changed(self, old_list, new_list):
        return sorted(old_list) != sorted(new_list)
