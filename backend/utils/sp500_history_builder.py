import requests
import time
from bs4 import BeautifulSoup

class SP500HistoryBuilder:
    def __init__(self):
        self.page_title = "List of S&P 500 companies"
        self.api_url = "https://en.wikipedia.org/w/api.php"
        self.revisions = []

    def get_revisions(self, limit=100, direction="newer", continue_token=None):
        params = {
            "action": "query",
            "format": "json",
            "redirects": 1,
            "prop": "revisions",
            "titles": self.page_title,
            "rvlimit": limit,
            "rvprop": "ids|timestamp",
            "rvdir": direction
        }
        if continue_token:
            params["rvcontinue"] = continue_token

        response = requests.get(self.api_url, params=params)
        response.raise_for_status()
        data = response.json()

        pages = data["query"]["pages"]
        page = next(iter(pages.values()))
        self.cont_token = data.get("continue", {}).get("rvcontinue")

        if "revisions" not in page:
            return []

        return page["revisions"]
    
    def fetch_revision_html(self, revid):
        url = f"https://en.wikipedia.org/w/index.php?oldid={revid}"
        response = requests.get(url)
        response.raise_for_status()
        return response.text
    
    from bs4 import BeautifulSoup

    def extract_tickers_from_html(self, html):
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")

        print(f"\n🔍 Found {len(tables)} tables")

        for idx, table in enumerate(tables):
            headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
            print(f"\n🧾 Table {idx + 1} headers: {headers}")

            if any("symbol" in h for h in headers):
                print(f"✅ Table {idx + 1} contains a 'symbol' header — parsing tickers...")

                rows = table.find_all("tr")[1:]  # skip header
                tickers = []

                for row in rows:
                    cols = row.find_all("td")
                    if len(cols) < 2:
                        continue

                    ticker = cols[1].get_text(strip=True)  # symbol in second column
                    if ticker:
                        tickers.append(ticker)

                print(f"✅ Extracted {len(tickers)} tickers")
                print("🧪 Sample:", tickers[:10])
                return tickers

        print("❌ No matching table found.")
        return []
    
    def print_table_headers(self, html):
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")

        print(f"🔍 Found {len(tables)} tables")

        for i, table in enumerate(tables):
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            print(f"\n🧾 Table {i + 1} headers: {headers}")